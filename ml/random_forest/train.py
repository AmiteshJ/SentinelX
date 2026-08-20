"""Random Forest baseline (spec §13)."""
from sklearn.ensemble import RandomForestClassifier

from ml.evaluation.metrics import evaluate
from ml.preprocessing.pipeline import PreparedDataset


def train_and_evaluate(data: PreparedDataset, *, n_estimators: int = 200, random_state: int = 42) -> dict:
    model = RandomForestClassifier(n_estimators=n_estimators, random_state=random_state, n_jobs=-1)
    model.fit(data.X_train, data.y_train)

    y_pred = model.predict(data.X_test)
    y_proba = model.predict_proba(data.X_test)

    result = evaluate(data.y_test, y_pred, y_proba)
    return {"model": "random_forest", "held_out_class": data.held_out_class, **result.to_dict()}
