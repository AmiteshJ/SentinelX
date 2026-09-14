"""XGBoost baseline (spec §13)."""
import numpy as np
import xgboost as xgb

from ml.evaluation.metrics import evaluate
from ml.preprocessing.pipeline import PreparedDataset


def train_and_evaluate(data: PreparedDataset, *, random_state: int = 42) -> dict:
    n_classes = len(np.unique(np.concatenate([data.y_train, data.y_test])))
    objective = "binary:logistic" if n_classes <= 2 else "multi:softprob"

    params = {"objective": objective, "random_state": random_state, "eval_metric": "logloss"}
    if n_classes > 2:
        params["num_class"] = n_classes

    model = xgb.XGBClassifier(**params, n_estimators=200)
    model.fit(data.X_train, data.y_train)

    y_pred = model.predict(data.X_test)
    if hasattr(y_pred, "ndim") and y_pred.ndim > 1:
        y_pred = y_pred.argmax(axis=1)
    y_proba = model.predict_proba(data.X_test)

    result = evaluate(data.y_test, y_pred, y_proba)
    return {"model": "xgboost", "held_out_class": data.held_out_class, **result.to_dict()}
