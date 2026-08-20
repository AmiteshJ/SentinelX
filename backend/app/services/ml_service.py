"""
Orchestrates the ML comparison + zero-day experiment (spec §13-15). Runs the
real training pipelines in ml/ against an uploaded, cleaned dataframe and
stores only actual results in MongoDB — never placeholder metrics. This
module is intentionally synchronous/blocking; wiring it behind a background
worker (spec §48) is a natural next step once training on real
CIC-IDS2017-scale data (not just smoke-test CSVs) is needed.
"""
import sys
import time
from pathlib import Path

import pandas as pd
from motor.motor_asyncio import AsyncIOMotorDatabase

# ml/ lives at the repo root, one level above backend/
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "ml"))
sys.path.insert(0, str(Path(__file__).resolve().parents[4]))  # so `import ml.xxx` also works


async def run_comparison_experiment(
    mongo_db: AsyncIOMotorDatabase,
    df: pd.DataFrame,
    *,
    held_out_class: str | None,
    models: list[str],
    triggered_by: str,
) -> dict:
    from ml.preprocessing.pipeline import standard_split, zero_day_split

    if held_out_class:
        data = zero_day_split(df, held_out_class=held_out_class)
        experiment_type = "zero_day"
    else:
        data = standard_split(df)
        experiment_type = "standard_split"

    results = []
    for model_name in models:
        started = time.time()
        try:
            if model_name == "random_forest":
                from ml.random_forest.train import train_and_evaluate as run
            elif model_name == "xgboost":
                from ml.xgboost.train import train_and_evaluate as run
            elif model_name == "cnn":
                from ml.cnn.train import train_and_evaluate as run
            elif model_name == "lstm":
                from ml.lstm.train import train_and_evaluate as run
            else:
                results.append({"model": model_name, "error": f"Unknown model '{model_name}'"})
                continue
            metrics = run(data)
            metrics["training_seconds"] = round(time.time() - started, 2)
            results.append(metrics)
        except Exception as exc:
            results.append({"model": model_name, "error": str(exc)})

    if "graphsage" in models:
        started = time.time()
        try:
            from ml.graphsage.train import train_and_evaluate as run_graphsage
            gs_metrics = run_graphsage(df, held_out_class=held_out_class)
            gs_metrics["training_seconds"] = round(time.time() - started, 2)
            results.append(gs_metrics)
        except Exception as exc:
            results.append({"model": "graphsage", "error": str(exc)})

    experiment_doc = {
        "experiment_type": experiment_type,
        "held_out_class": held_out_class,
        "feature_names": data.feature_names,
        "n_train": int(len(data.y_train)),
        "n_test": int(len(data.y_test)),
        "results": results,
        "triggered_by": triggered_by,
    }
    insert_result = await mongo_db.ml_experiments.insert_one(experiment_doc)
    experiment_doc["id"] = str(insert_result.inserted_id)
    return experiment_doc
