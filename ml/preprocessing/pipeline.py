"""
Shared dataset preparation for the ML comparison + zero-day experiments
(spec §3-4, §13). Consumes a cleaned dataframe (see
backend/app/services/dataset_service.py for CSV loading/cleaning) that has a
`label` column with the ground-truth attack class ("BENIGN"/"Normal" for
non-attack traffic).

The key primitive is `zero_day_split`: completely removes one attack class
from the training set and introduces it only at test time, per spec §3.
"""
from dataclasses import dataclass

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler

NUMERIC_FEATURE_CANDIDATES = [
    "destination_port", "duration_ms", "bytes_sent", "bytes_received",
]


@dataclass
class PreparedDataset:
    X_train: np.ndarray
    X_test: np.ndarray
    y_train: np.ndarray
    y_test: np.ndarray
    feature_names: list[str]
    label_encoder: LabelEncoder
    held_out_class: str | None


def _select_features(df: pd.DataFrame) -> tuple[np.ndarray, list[str]]:
    available = [c for c in NUMERIC_FEATURE_CANDIDATES if c in df.columns]
    if not available:
        raise ValueError(
            "No recognized numeric feature columns found. Expected at least one of: "
            + ", ".join(NUMERIC_FEATURE_CANDIDATES)
        )
    X = df[available].fillna(0).to_numpy(dtype=float)
    return X, available


def standard_split(df: pd.DataFrame, *, label_col: str = "label", test_size: float = 0.2, random_state: int = 42) -> PreparedDataset:
    """Ordinary random train/test split (used as a baseline comparison —
    spec §3 explicitly says this must NOT be the only evaluation method)."""
    X, feature_names = _select_features(df)
    encoder = LabelEncoder()
    y = encoder.fit_transform(df[label_col].astype(str))

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=random_state, stratify=y if len(set(y)) > 1 else None
    )
    scaler = StandardScaler().fit(X_train)
    return PreparedDataset(
        X_train=scaler.transform(X_train),
        X_test=scaler.transform(X_test),
        y_train=y_train,
        y_test=y_test,
        feature_names=feature_names,
        label_encoder=encoder,
        held_out_class=None,
    )


def zero_day_split(df: pd.DataFrame, *, held_out_class: str, label_col: str = "label", random_state: int = 42) -> PreparedDataset:
    """
    Core novelty (spec §3): completely excludes `held_out_class` from
    training. Training set = normal + all other known attack classes.
    Test set = normal + known attacks + the held-out (unseen) class.
    """
    if held_out_class not in df[label_col].astype(str).unique():
        raise ValueError(f"held_out_class '{held_out_class}' not present in this dataset's label column.")

    X, feature_names = _select_features(df)
    labels = df[label_col].astype(str).to_numpy()

    encoder = LabelEncoder()
    y_all = encoder.fit_transform(labels)
    held_out_encoded = encoder.transform([held_out_class])[0]

    train_mask = labels != held_out_class
    X_train_full, y_train_full = X[train_mask], y_all[train_mask]

    # Test set: a held-out slice of the known classes + every held-out-class example.
    X_known, X_known_test, y_known, y_known_test = train_test_split(
        X_train_full, y_train_full, test_size=0.2, random_state=random_state,
        stratify=y_train_full if len(set(y_train_full)) > 1 else None,
    )
    X_unseen = X[~train_mask]
    y_unseen = y_all[~train_mask]

    X_test = np.vstack([X_known_test, X_unseen]) if len(X_unseen) else X_known_test
    y_test = np.concatenate([y_known_test, y_unseen]) if len(y_unseen) else y_known_test

    scaler = StandardScaler().fit(X_known)
    return PreparedDataset(
        X_train=scaler.transform(X_known),
        X_test=scaler.transform(X_test),
        y_train=y_known,
        y_test=y_test,
        feature_names=feature_names,
        label_encoder=encoder,
        held_out_class=held_out_class,
    )
