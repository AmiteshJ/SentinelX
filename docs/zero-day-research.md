# Zero-Day Research Design (Phase 15, implemented)

**Research question**: Can Graph Neural Networks (GraphSAGE) detect previously unseen cyber
attacks more effectively than traditional ML (Random Forest, XGBoost) and deep learning (CNN,
LSTM) models?

**Method** (`ml/preprocessing/pipeline.py::zero_day_split`): for each experiment, one attack
class is completely excluded from training (normal traffic + remaining known attack classes
only). The excluded class is introduced only at test time. Metrics (accuracy, precision, recall,
F1, ROC-AUC, confusion matrix — `ml/evaluation/metrics.py`) are compared across models for each
held-out class.

**Graph construction** (`ml/graphsage/graph_construction.py`): nodes are IP addresses; edges are
observed source→destination connections; node features are the mean of each flow's numeric
features over that IP's outbound flows; a node's label is "malicious" if it was ever the source
of a non-benign flow. This is a documented, reasonable, configurable construction choice per
spec §12 — not the only valid one.

**Zero-day masking for the graph** (`ml/graphsage/train.py`): nodes whose only malicious activity
is the held-out class are excluded from the training mask entirely and only appear in the test
mask, mirroring the flat-feature `zero_day_split` semantics in a graph setting.

**Datasets**: CIC-IDS2017, CSE-CIC-IDS2018 (primary); BoT-IoT, ToN-IoT (optional) — bring your own
CSV via `POST /api/experiments/run`; none is bundled with this repo.

**Running it**: upload a labeled CSV (must have a `Label` column) via the Zero-Day Detection page
or directly:

```bash
curl -X POST http://localhost:8000/api/experiments/run \
  -H "Authorization: Bearer <access_token>" \
  -F "file=@your_dataset.csv" \
  -F "held_out_class=WebAttack" \
  -F "models=random_forest,xgboost,cnn,lstm,graphsage"
```

Results (real, only ever from an actual run) are stored in MongoDB (`ml_experiments`) and
displayed in the Zero-Day Detection page's comparison table and experiment history.
