"""
GraphSAGE zero-day training/evaluation (spec §12, §14-15).

Because the graph is node-level (one node per host, per graph_construction.py),
the "zero-day" evaluation here is: nodes whose ONLY malicious flows are of the
held-out class are excluded from the training mask and evaluated separately,
mirroring the same held-out-class principle used for the flat-feature models
in ml/preprocessing/pipeline.py::zero_day_split, adapted to a graph setting.
"""
import numpy as np
import pandas as pd
import torch
import torch.nn.functional as F

from ml.evaluation.metrics import evaluate
from ml.graphsage.graph_construction import GraphBuildConfig, build_graph
from ml.graphsage.model import GraphSAGE


def _build_masks(df: pd.DataFrame, nodes: list[str], config: GraphBuildConfig, held_out_class: str | None):
    if held_out_class is None:
        n = len(nodes)
        perm = np.random.RandomState(42).permutation(n)
        split = int(n * 0.8)
        train_mask = torch.zeros(n, dtype=torch.bool)
        test_mask = torch.zeros(n, dtype=torch.bool)
        train_mask[perm[:split]] = True
        test_mask[perm[split:]] = True
        return train_mask, test_mask

    node_index = {ip: i for i, ip in enumerate(nodes)}
    held_out_sources = set(
        df.loc[df[config.label_col].astype(str) == held_out_class, config.source_ip_col]
    )
    held_out_node_ids = {node_index[ip] for ip in held_out_sources if ip in node_index}

    n = len(nodes)
    all_ids = set(range(n))
    remaining = list(all_ids - held_out_node_ids)
    rng = np.random.RandomState(42)
    rng.shuffle(remaining)
    split = int(len(remaining) * 0.85)

    train_mask = torch.zeros(n, dtype=torch.bool)
    test_mask = torch.zeros(n, dtype=torch.bool)
    for idx in remaining[:split]:
        train_mask[idx] = True
    for idx in remaining[split:]:
        test_mask[idx] = True
    for idx in held_out_node_ids:
        test_mask[idx] = True  # held-out-class nodes are ONLY ever seen at test time
    return train_mask, test_mask


def train_and_evaluate(
    df: pd.DataFrame,
    *,
    held_out_class: str | None = None,
    config: GraphBuildConfig = GraphBuildConfig(),
    hidden_channels: int = 32,
    epochs: int = 100,
    lr: float = 0.01,
) -> dict:
    data, nodes, graph_metadata = build_graph(df, config)
    train_mask, test_mask = _build_masks(df, nodes, config, held_out_class)

    n_classes = int(data.y.max().item()) + 1
    model = GraphSAGE(in_channels=data.x.shape[1], hidden_channels=hidden_channels, out_channels=n_classes)
    optimizer = torch.optim.Adam(model.parameters(), lr=lr, weight_decay=5e-4)

    model.train()
    for _epoch in range(epochs):
        optimizer.zero_grad()
        out = model(data.x, data.edge_index)
        loss = F.cross_entropy(out[train_mask], data.y[train_mask])
        loss.backward()
        optimizer.step()

    model.eval()
    with torch.no_grad():
        out = model(data.x, data.edge_index)
        probs = F.softmax(out, dim=1).numpy()
        y_pred = probs.argmax(axis=1)

    y_true_test = data.y[test_mask].numpy()
    y_pred_test = y_pred[test_mask.numpy()]
    probs_test = probs[test_mask.numpy()]

    result = evaluate(y_true_test, y_pred_test, probs_test)
    return {
        "model": "graphsage",
        "held_out_class": held_out_class,
        "graph_metadata": graph_metadata,
        **result.to_dict(),
    }
