"""
Dataset upload endpoint (spec §4). Analysts/admins upload a CSV (e.g.
CIC-IDS2017/CSE-CIC-IDS2018); it's validated/cleaned/normalized via
app/services/dataset_service.py and pushed through the same Redis Stream ->
event worker pipeline as live telemetry, tagged mode=DATASET so the UI never
presents it as live.
"""
import json

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.api.deps import require_role
from app.db.redis_client import EVENTS_STREAM, MODE_KEY, get_redis
from app.services.dataset_service import DatasetValidationError, clean_dataframe, load_csv, to_events

router = APIRouter(prefix="/api/datasets", tags=["datasets"])

MAX_ROWS_PER_UPLOAD = 5000  # ingested via Redis Streams in one request; larger files should be chunked client-side


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
