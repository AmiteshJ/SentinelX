"""
Shared metric computation for every model in the comparison (spec §3, §13).
Every model's evaluate() call goes through this so the comparison table is
apples-to-apples. Never call this with fabricated y_pred — only with real
model output.
"""
from dataclasses import dataclass, asdict

import numpy as np
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)


@dataclass
class EvaluationResult:
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    roc_auc: float | None
    confusion_matrix: list[list[int]]
    n_test_samples: int

    def to_dict(self) -> dict:
        return asdict(self)


def evaluate(y_true: np.ndarray, y_pred: np.ndarray, y_proba: np.ndarray | None = None) -> EvaluationResult:
    average = "binary" if len(set(y_true)) == 2 else "macro"

    roc_auc = None
    if y_proba is not None:
        try:
            if y_proba.ndim > 1 and y_proba.shape[1] > 2:
                roc_auc = roc_auc_score(y_true, y_proba, multi_class="ovr", average="macro")
            elif y_proba.ndim > 1:
                roc_auc = roc_auc_score(y_true, y_proba[:, 1])
            else:
                roc_auc = roc_auc_score(y_true, y_proba)
        except ValueError:
            roc_auc = None  # e.g. only one class present in y_true for this split

    return EvaluationResult(
        accuracy=round(float(accuracy_score(y_true, y_pred)), 4),
        precision=round(float(precision_score(y_true, y_pred, average=average, zero_division=0)), 4),
        recall=round(float(recall_score(y_true, y_pred, average=average, zero_division=0)), 4),
        f1_score=round(float(f1_score(y_true, y_pred, average=average, zero_division=0)), 4),
        roc_auc=round(float(roc_auc), 4) if roc_auc is not None else None,
        confusion_matrix=confusion_matrix(y_true, y_pred).tolist(),
        n_test_samples=int(len(y_true)),
    )
