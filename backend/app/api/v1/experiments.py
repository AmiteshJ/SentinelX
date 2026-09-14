"""
Zero-day / ML comparison experiment API (spec §13-15, §41). Accepts the same
kind of CSV as /api/datasets/upload, but here it's used purely for offline
model training/evaluation, not live ingestion. Results are only ever the
actual output of the training pipelines in ml/ — see docs/zero-day-research.md.
"""
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app.api.deps import require_role
from app.db.mongodb import get_mongo_db
from app.services.dataset_service import DatasetValidationError, clean_dataframe, load_csv
from app.services.ml_service import run_comparison_experiment

router = APIRouter(prefix="/api/experiments", tags=["experiments"])

AVAILABLE_MODELS = ["random_forest", "xgboost", "cnn", "lstm", "graphsage"]


@router.post("/run")
async def run_experiment(
    file: UploadFile = File(...),
    held_out_class: str | None = Form(default=None),
    models: str = Form(default="random_forest,xgboost,cnn,lstm,graphsage"),
    user=Depends(require_role("admin", "soc_analyst", "security_manager", "viewer")),
):
    selected_models = [m.strip() for m in models.split(",") if m.strip() in AVAILABLE_MODELS]
    if not selected_models:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No valid models selected.")

    contents = await file.read()
    try:
        df = load_csv(contents)
        df = clean_dataframe(df)
    except DatasetValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    if "label" not in df.columns:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dataset must include a 'Label' column with ground-truth attack classes for experiments.",
        )

    mongo_db = get_mongo_db()
    experiment = await run_comparison_experiment(
        mongo_db, df, held_out_class=held_out_class, models=selected_models, triggered_by=user.email
    )
    return experiment


@router.get("/history")
async def experiment_history(limit: int = 20, user=Depends(require_role("admin", "soc_analyst", "security_manager", "viewer"))):
    mongo_db = get_mongo_db()
    cursor = mongo_db.ml_experiments.find({}).sort("_id", -1).limit(limit)
    items = []
    async for doc in cursor:
        doc["id"] = str(doc.pop("_id"))
        items.append(doc)
    return {"items": items}
