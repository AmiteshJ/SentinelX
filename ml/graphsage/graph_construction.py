"""
Graph construction for GraphSAGE (spec §12/§14). Builds a k-NN graph from
the feature matrix so that each network flow becomes a node and edges connect
flows with similar features. This approach works with any tabular dataset
(no IP columns required) and is the same method used in the original
zero_day_module.
"""

import numpy as np
import torch
from sklearn.neighbors import NearestNeighbors
from torch_geometric.data import Data

K_NEIGHBORS = 5

def build_knn_graph(X: np.ndarray, y: np.ndarray, k: int = K_NEIGHBORS) -> Data:
    print(f"  Building {k}-NN graph for {X.shape[0]:,} nodes …")

    nn = NearestNeighbors(n_neighbors=k, algorithm="auto", n_jobs=-1)
    nn.fit(X)
    distances, indices = nn.kneighbors(X)

    src, dst = [], []
    for node_idx in range(X.shape[0]):
        for neighbour_idx in indices[node_idx]:
            if node_idx != neighbour_idx:
                src.append(node_idx)
                dst.append(neighbour_idx)
                src.append(neighbour_idx)
                dst.append(node_idx)

    edge_index = torch.tensor([src, dst], dtype=torch.long)
    edge_index = torch.unique(edge_index, dim=1)

    x = torch.tensor(X, dtype=torch.float)
    y_tensor = torch.tensor(y, dtype=torch.long)

    data = Data(x=x, edge_index=edge_index, y=y_tensor)
    return data

def create_graph_data(X_train, X_test, y_train, y_test):
    X_all = np.vstack([X_train, X_test])
    y_all = np.concatenate([y_train, y_test])

    data = build_knn_graph(X_all, y_all)

    n_train = X_train.shape[0]
    n_total = X_all.shape[0]

    train_mask = torch.zeros(n_total, dtype=torch.bool)
    test_mask = torch.zeros(n_total, dtype=torch.bool)
    train_mask[:n_train] = True
    test_mask[n_train:] = True

    data.train_mask = train_mask
    data.test_mask = test_mask

    return data
