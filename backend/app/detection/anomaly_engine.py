"""
Isolation Forest anomaly detection (spec §10). Trains on numeric features
derived from real ingested events (MongoDB "events" collection) — never on
synthetic data. Requires a minimum number of real events before training is
attempted, and honestly reports when there isn't enough data yet rather than
returning a model trained on nothing.
"""
from dataclasses import dataclass

import numpy as np
from sklearn.ensemble import IsolationForest

FEATURE_FIELDS = ["destination_port", "duration_ms", "bytes_sent", "bytes_received"]
MIN_EVENTS_TO_TRAIN = 50


@dataclass
class AnomalyResult:
    event_id: str
    anomaly_score: float  # higher = more anomalous, normalized 0-1
    is_anomaly: bool
    features: dict[str, float]


class NotEnoughDataError(Exception):
    pass


def _event_to_vector(event: dict) -> list[float]:
    return [float(event.get(f) or 0.0) for f in FEATURE_FIELDS]


def train_and_score(events: list[dict], *, contamination: float = 0.05) -> list[AnomalyResult]:
    """events: real documents from MongoDB's `events` collection, each with an
    `_id`. Fits a fresh Isolation Forest on this batch and scores every event
    in it. (Persisting a trained model for ongoing streaming inference is a
    natural follow-up — this function is deliberately kept pure/stateless so
    it's easy to unit test and to later wrap in an incremental-retrain job.)
    """
    if len(events) < MIN_EVENTS_TO_TRAIN:
        raise NotEnoughDataError(
            f"Only {len(events)} events available; need at least {MIN_EVENTS_TO_TRAIN} real events to train."
        )

    X = np.array([_event_to_vector(e) for e in events])
    model = IsolationForest(contamination=contamination, random_state=42, n_estimators=200)
    model.fit(X)

    raw_scores = model.decision_function(X)  # higher = more normal
    predictions = model.predict(X)  # -1 = anomaly, 1 = normal

    # Normalize to 0-1 "anomaly score" where 1 = most anomalous, for consistent UI display.
    min_s, max_s = raw_scores.min(), raw_scores.max()
    span = (max_s - min_s) or 1.0

    results = []
    for event, raw_score, pred in zip(events, raw_scores, predictions):
        normalized = 1.0 - ((raw_score - min_s) / span)
        results.append(
            AnomalyResult(
                event_id=str(event["_id"]),
                anomaly_score=round(float(normalized), 4),
                is_anomaly=bool(pred == -1),
                features={f: float(event.get(f) or 0.0) for f in FEATURE_FIELDS},
            )
        )
    return results
