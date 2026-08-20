# ML Comparison Pipeline (Phase 13-15, implemented)

Reusable training pipelines under `ml/`:

- `preprocessing/pipeline.py` — shared feature selection + `standard_split` (baseline random
  split) + `zero_day_split` (the core novelty — completely excludes one attack class from
  training, see `docs/zero-day-research.md`)
- `random_forest/train.py`, `xgboost/train.py` — traditional ML baselines (scikit-learn / XGBoost)
- `cnn/train.py`, `lstm/train.py` — deep learning baselines (PyTorch)
- `graphsage/` — primary GNN via PyTorch Geometric (`graph_construction.py`, `model.py`, `train.py`)
- `evaluation/metrics.py` — shared accuracy/precision/recall/F1/ROC-AUC/confusion-matrix
  computation used by every model, so the comparison table is apples-to-apples

Orchestrated end-to-end via `backend/app/services/ml_service.py` and exposed through
`POST /api/experiments/run` (accepts a labeled CSV upload, an optional `held_out_class`, and a
list of models to run) and `GET /api/experiments/history`. Results are stored in MongoDB
(`ml_experiments` collection) — only ever the actual output of a training run, never a
placeholder number.

**Verification status**: Random Forest + XGBoost (including the zero-day split) were run
end-to-end during development with real synthetic-for-testing data and produced real metrics.
CNN/LSTM/GraphSAGE are syntax-verified but require `torch` (~700MB+) and `torch-geometric` to
actually execute — install `backend/requirements.txt` in an environment with enough disk/network
to confirm.
