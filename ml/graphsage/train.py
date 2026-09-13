"""
GraphSAGE zero-day training/evaluation (spec §12, §14-15).
"""
import numpy as np
import pandas as pd
import torch
import torch.nn.functional as F

from ml.evaluation.metrics import evaluate
from ml.graphsage.graph_construction import create_graph_data
from ml.graphsage.model import GraphSAGE
from ml.preprocessing.pipeline import PreparedDataset, standard_split, zero_day_split

def train_and_evaluate(
    df: pd.DataFrame,
    *,
    held_out_class: str | None = None,
    hidden_channels: int = 32,
    epochs: int = 100,
    lr: float = 0.01,
) -> dict:
    if held_out_class:
        prepared = zero_day_split(df, held_out_class=held_out_class)
    else:
        prepared = standard_split(df)

    data = create_graph_data(
        prepared.X_train, prepared.X_test,
        prepared.y_train, prepared.y_test,
    )

    n_classes = int(data.y.max().item()) + 1
    model = GraphSAGE(
        in_channels=data.x.shape[1],
        hidden_channels=hidden_channels,
        out_channels=n_classes,
    )
    optimizer = torch.optim.Adam(model.parameters(), lr=lr, weight_decay=5e-4)

    model.train()
    for _epoch in range(epochs):
        optimizer.zero_grad()
        out = model(data.x, data.edge_index)
        loss = F.cross_entropy(out[data.train_mask], data.y[data.train_mask])
        loss.backward()
        optimizer.step()

    model.eval()
    with torch.no_grad():
        out = model(data.x, data.edge_index)
        probs = F.softmax(out, dim=1).numpy()
        y_pred = probs.argmax(axis=1)

    y_true_test = data.y[data.test_mask].numpy()
    y_pred_test = y_pred[data.test_mask.numpy()]
    probs_test = probs[data.test_mask.numpy()]

    result = evaluate(y_true_test, y_pred_test, probs_test)
    return {
        "model": "graphsage",
        "held_out_class": held_out_class,
        "graph_metadata": {
            "n_nodes": data.num_nodes,
            "n_edges": data.num_edges,
            "n_features": data.x.shape[1],
        },
        **result.to_dict(),
    }
