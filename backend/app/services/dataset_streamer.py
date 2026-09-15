"""
Dataset Streamer Service for SentinelX Offline Ingestion & Realtime Replay.
Discovers CSV datasets from the root `datasets/` directory and streams them
row-by-row / batch-by-batch into the Redis Stream (`sentinelx:events`) so the
entire backend pipeline (rule engine, anomaly detection, risk scoring, WebSocket,
and frontend dashboard) runs live in real time.
"""
import asyncio
import json
import os
from pathlib import Path
from typing import Any, Optional

import pandas as pd
import structlog

from app.db.redis_client import EVENTS_STREAM, MODE_KEY, get_redis
from app.services.dataset_service import _normalize_headers, to_events

logger = structlog.get_logger("dataset_streamer")


def get_datasets_dir() -> Path:
    """Find the root datasets/ directory regardless of where the backend process was started."""
    candidates = [
        Path.cwd() / "datasets",
        Path.cwd() / ".." / "datasets",
        Path.cwd() / ".." / ".." / "datasets",
        Path(__file__).resolve().parent.parent.parent.parent / "datasets",
    ]
    for c in candidates:
        if c.exists() and c.is_dir():
            return c.resolve()
    fallback = Path(__file__).resolve().parent.parent.parent.parent / "datasets"
    fallback.mkdir(parents=True, exist_ok=True)
    return fallback


def format_size(size_bytes: int) -> str:
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    elif size_bytes < 1024 * 1024 * 1024:
        return f"{size_bytes / (1024 * 1024):.1f} MB"
    return f"{size_bytes / (1024 * 1024 * 1024):.1f} GB"


class DatasetStreamer:
    _instance: Optional["DatasetStreamer"] = None

    def __init__(self) -> None:
        self.is_running: bool = False
        self.is_paused: bool = False
        self.current_filename: Optional[str] = None
        self.events_ingested: int = 0
        self.speed_eps: int = 10  # events per second
        self.loop: bool = True
        self.total_rows_estimate: int = 0
        self.current_label: Optional[str] = None
        self.active_mode: str = "OFFLINE"
        self._task: Optional[asyncio.Task] = None
        self._pause_event = asyncio.Event()
        self._pause_event.set()
        self._cached_files: Optional[list[dict[str, Any]]] = None

    @classmethod
    def get_instance(cls) -> "DatasetStreamer":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def list_dataset_files(self, force_refresh: bool = False) -> list[dict[str, Any]]:
        if self._cached_files is not None and not force_refresh:
            return self._cached_files

        ds_dir = get_datasets_dir()
        if not ds_dir.exists():
            self._cached_files = []
            return []

        csv_files = list(ds_dir.glob("*.csv"))
        results = []
        for file_path in sorted(csv_files, key=lambda p: p.name):
            size_bytes = file_path.stat().st_size
            categories = []
            try:
                # Fast sample preview of label column
                sample_df = pd.read_csv(file_path, nrows=200)
                norm_cols = [c.strip().lower() for c in sample_df.columns]
                label_idx = None
                for idx, col in enumerate(norm_cols):
                    if "label" in col or "attack" in col or "class" in col:
                        label_idx = idx
                        break
                if label_idx is not None:
                    raw_cats = sample_df.iloc[:, label_idx].dropna().unique().tolist()
                    categories = [str(c).strip() for c in raw_cats]
            except Exception:
                categories = []

            results.append({
                "filename": file_path.name,
                "size_bytes": size_bytes,
                "size_formatted": format_size(size_bytes),
                "categories": categories,
            })
        self._cached_files = results
        return results

    def get_status(self) -> dict[str, Any]:
        return {
            "is_running": self.is_running,
            "is_paused": self.is_paused,
            "current_filename": self.current_filename,
            "events_ingested": self.events_ingested,
            "speed_eps": self.speed_eps,
            "loop": self.loop,
            "total_rows_estimate": self.total_rows_estimate,
            "current_label": self.current_label,
            "active_mode": self.active_mode,
        }

    async def start(self, filename: str, speed_eps: int = 10, loop: bool = True) -> dict[str, Any]:
        ds_dir = get_datasets_dir()
        file_path = ds_dir / filename
        if not file_path.exists():
            raise FileNotFoundError(f"Dataset file '{filename}' not found in {ds_dir}")

        await self.stop()

        self.current_filename = filename
        self.speed_eps = max(1, min(speed_eps, 100))
        self.loop = loop
        self.events_ingested = 0
        self.is_running = True
        self.is_paused = False
        self.active_mode = "DATASET"
        self._pause_event.set()

        try:
            redis = get_redis()
            await redis.set(MODE_KEY, "DATASET")
        except Exception as exc:
            logger.warning("failed_to_set_redis_mode", error=str(exc))

        self._task = asyncio.create_task(self._stream_loop(file_path))
        logger.info("dataset_streaming_started", file=filename, speed=self.speed_eps)
        return self.get_status()

    async def pause(self) -> dict[str, Any]:
        if self.is_running and not self.is_paused:
            self.is_paused = True
            self._pause_event.clear()
            logger.info("dataset_streaming_paused", file=self.current_filename)
        return self.get_status()

    async def resume(self) -> dict[str, Any]:
        if self.is_running and self.is_paused:
            self.is_paused = False
            self._pause_event.set()
            try:
                redis = get_redis()
                await redis.set(MODE_KEY, "DATASET")
            except Exception:
                pass
            logger.info("dataset_streaming_resumed", file=self.current_filename)
        return self.get_status()

    async def set_speed(self, speed_eps: int) -> dict[str, Any]:
        self.speed_eps = max(1, min(speed_eps, 100))
        return self.get_status()

    async def stop(self) -> dict[str, Any]:
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None

        self.is_running = False
        self.is_paused = False
        self._pause_event.set()
        self.active_mode = "OFFLINE"

        try:
            redis = get_redis()
            await redis.set(MODE_KEY, "OFFLINE")
        except Exception as exc:
            logger.warning("failed_to_set_redis_mode_offline", error=str(exc))

        logger.info("dataset_streaming_stopped", total_ingested=self.events_ingested)
        return self.get_status()

    async def set_mode(self, mode: str) -> dict[str, Any]:
        valid_modes = ["OFFLINE", "DATASET", "LIVE"]
        clean_mode = mode.upper()
        if clean_mode not in valid_modes:
            clean_mode = "OFFLINE"

        if clean_mode != "DATASET" and self.is_running:
            await self.stop()

        self.active_mode = clean_mode
        try:
            redis = get_redis()
            await redis.set(MODE_KEY, clean_mode)
        except Exception as exc:
            logger.warning("failed_to_set_redis_mode", error=str(exc))

        return self.get_status()

    async def _stream_loop(self, file_path: Path) -> None:
        chunk_size = 200
        while self.is_running:
            try:
                for chunk in pd.read_csv(file_path, chunksize=chunk_size, low_memory=False):
                    if not self.is_running:
                        break

                    clean_chunk = _normalize_headers(chunk)
                    events = list(to_events(clean_chunk))
                    if not events:
                        continue

                    redis = get_redis()
                    for event in events:
                        if not self.is_running:
                            break

                        # Wait if paused
                        await self._pause_event.wait()

                        event_dict = event.model_dump(mode="json")
                        event_dict["mode"] = "DATASET"
                        self.current_label = event.label

                        await redis.xadd(EVENTS_STREAM, {"payload": json.dumps(event_dict)})
                        self.events_ingested += 1

                        # Rate limiting according to speed_eps
                        delay = 1.0 / max(1, self.speed_eps)
                        await asyncio.sleep(delay)

                if not self.loop:
                    break

            except asyncio.CancelledError:
                break
            except Exception as exc:
                logger.error("stream_loop_error", error=str(exc))
                await asyncio.sleep(2)

        self.is_running = False
        self.is_paused = False
        logger.info("dataset_stream_loop_finished", total_ingested=self.events_ingested)
