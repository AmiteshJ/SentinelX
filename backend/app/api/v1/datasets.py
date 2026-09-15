"""
Dataset upload endpoint (spec §4). Analysts/admins upload a CSV (e.g.
CIC-IDS2017/CSE-CIC-IDS2018); it's validated/cleaned/normalized via
app/services/dataset_service.py and pushed through the same Redis Stream ->
event worker pipeline as live telemetry, tagged mode=DATASET so the UI never
presents it as live.
"""
import json

from pydantic import BaseModel
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.api.deps import require_role
from app.db.redis_client import EVENTS_STREAM, MODE_KEY, get_redis
from app.services.dataset_service import DatasetValidationError, clean_dataframe, load_csv, to_events
from app.services.dataset_streamer import DatasetStreamer

router = APIRouter(prefix="/api/datasets", tags=["datasets"])

MAX_ROWS_PER_UPLOAD = 5000  # ingested via Redis Streams in one request; larger files should be chunked client-side


class StreamStartRequest(BaseModel):
    filename: str
    speed_eps: int = 10
    loop: bool = True


class StreamSpeedRequest(BaseModel):
    speed_eps: int


@router.get("/files")
async def list_available_files(
    _user=Depends(require_role("admin", "soc_analyst", "security_manager", "viewer")),
):
    streamer = DatasetStreamer.get_instance()
    files = streamer.list_dataset_files()
    return {"files": files}


@router.get("/stream/status")
async def get_stream_status(
    _user=Depends(require_role("admin", "soc_analyst", "security_manager", "viewer")),
):
    streamer = DatasetStreamer.get_instance()
    return streamer.get_status()


@router.post("/stream/start")
async def start_stream(
    payload: StreamStartRequest,
    _user=Depends(require_role("admin", "soc_analyst", "security_manager", "viewer")),
):
    streamer = DatasetStreamer.get_instance()
    try:
        status_info = await streamer.start(
            filename=payload.filename,
            speed_eps=payload.speed_eps,
            loop=payload.loop,
        )
        return status_info
    except FileNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc


@router.post("/stream/pause")
async def pause_stream(
    _user=Depends(require_role("admin", "soc_analyst", "security_manager", "viewer")),
):
    streamer = DatasetStreamer.get_instance()
    return await streamer.pause()


@router.post("/stream/resume")
async def resume_stream(
    _user=Depends(require_role("admin", "soc_analyst", "security_manager", "viewer")),
):
    streamer = DatasetStreamer.get_instance()
    return await streamer.resume()


@router.post("/stream/stop")
async def stop_stream(
    _user=Depends(require_role("admin", "soc_analyst", "security_manager", "viewer")),
):
    streamer = DatasetStreamer.get_instance()
    return await streamer.stop()


@router.post("/stream/speed")
async def set_stream_speed(
    payload: StreamSpeedRequest,
    _user=Depends(require_role("admin", "soc_analyst", "security_manager", "viewer")),
):
    streamer = DatasetStreamer.get_instance()
    return await streamer.set_speed(payload.speed_eps)


@router.post("/upload")
async def upload_dataset(
    file: UploadFile = File(...),
    _user=Depends(require_role("admin", "soc_analyst", "security_manager", "viewer")),
):
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only CSV files are supported.")

    contents = await file.read()
    try:
        df = load_csv(contents)
        df = clean_dataframe(df)
    except DatasetValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    if len(df) > MAX_ROWS_PER_UPLOAD:
        df = df.head(MAX_ROWS_PER_UPLOAD)

    redis = get_redis()
    accepted = 0
    for event in to_events(df):
        event_dict = event.model_dump(mode="json")
        event_dict["mode"] = "DATASET"
        await redis.xadd(EVENTS_STREAM, {"payload": json.dumps(event_dict)})
        accepted += 1

    await redis.set(MODE_KEY, "DATASET")

    return {
        "filename": file.filename,
        "rows_read": int(len(df)),
        "events_accepted": accepted,
        "mode": "DATASET",
    }
