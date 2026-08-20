"""
Graph construction for GraphSAGE (spec §12/§14). Builds a host-communication
graph from real flow records: nodes are IP addresses, edges are observed
connections, edge/node features come from the same flow features used by the
other models (so the comparison is fair), and node labels are derived from
whether that IP was ever the source of a labeled-attack flow.

This is a documented, reasonable construction choice — not the only valid
one — and is called out as configurable per spec §12 ("graph construction
must be documented and configurable").
"""
from dataclasses import dataclass

import numpy as np
import pandas as pd
import torch
from torch_geometric.data import Data


@dataclass
class GraphBuildConfig:
    source_ip_col: str = "source_ip"
    destination_ip_col: str = "destination_ip"
    label_col: str = "label"
    benign_label: str = "BENIGN"
    feature_cols: tuple[str, ...] = ("destination_port", "duration_ms", "bytes_sent", "bytes_received")


def build_graph(df: pd.DataFrame, config: GraphBuildConfig = GraphBuildConfig()) -> tuple[Data, list[str], dict]:
    """
    Returns:
      - a PyG Data object (x, edge_index, y)
      - the ordered list of node IPs (index -> ip)
      - a dict with construction metadata for experiment logging
    """
    df = df.dropna(subset=[config.source_ip_col])
    nodes = pd.unique(pd.concat([df[config.source_ip_col], df.get(config.destination_ip_col, pd.Series(dtype=str))]).dropna())
    node_index = {ip: i for i, ip in enumerate(nodes)}

    # Node features: mean of each flow feature over flows where this IP was the source.
    available_features = [c for c in config.feature_cols if c in df.columns]
    if not available_features:
        raise ValueError("No recognized feature columns available for graph node features.")

    grouped = df.groupby(config.source_ip_col)[available_features].mean().reindex(nodes).fillna(0.0)
    x = torch.tensor(grouped.to_numpy(dtype=float), dtype=torch.float)

    # Node label: 1 if this IP was ever the source of a non-benign flow, else 0.
    if config.label_col in df.columns:
        malicious_sources = set(df.loc[df[config.label_col].astype(str) != config.benign_label, config.source_ip_col])
        y = torch.tensor([1 if ip in malicious_sources else 0 for ip in nodes], dtype=torch.long)
    else:
        y = torch.zeros(len(nodes), dtype=torch.long)

    # Edges: source_ip -> destination_ip for every flow where both are known nodes.
    edge_pairs = []
    if config.destination_ip_col in df.columns:
        for src, dst in zip(df[config.source_ip_col], df[config.destination_ip_col]):
            if pd.isna(dst) or dst not in node_index:
                continue
            edge_pairs.append((node_index[src], node_index[dst]))

    if edge_pairs:
        edge_index = torch.tensor(edge_pairs, dtype=torch.long).t().contiguous()
    else:
        edge_index = torch.empty((2, 0), dtype=torch.long)

    data = Data(x=x, edge_index=edge_index, y=y)
    metadata = {
        "n_nodes": len(nodes),
        "n_edges": edge_index.shape[1],
        "feature_columns": available_features,
        "label_source": "node is malicious if it ever appears as source_ip of a non-benign flow",
    }
    return data, list(nodes), metadata
