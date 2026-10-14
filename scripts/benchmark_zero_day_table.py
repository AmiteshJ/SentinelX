import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "backend"))
sys.path.insert(0, str(ROOT / "ml"))

import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
import xgboost as xgb
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader, TensorDataset

from app.services.dataset_service import _normalize_headers
from ml.cnn.train import FlowCNN
from ml.lstm.train import FlowLSTM
from ml.graphsage.model import GraphSAGE
from ml.graphsage.graph_construction import create_graph_data

def evaluate_metrics(y_true_binary, y_pred_binary, zero_day_mask):
    """
    y_true_binary: 1 for attack, 0 for benign
    y_pred_binary: 1 for predicted attack, 0 for predicted benign
    zero_day_mask: boolean mask for held-out zero day attack samples
    """
    acc = accuracy_score(y_true_binary, y_pred_binary)
    prec = precision_score(y_true_binary, y_pred_binary, zero_division=0)
    rec = recall_score(y_true_binary, y_pred_binary, zero_division=0)
    f1 = f1_score(y_true_binary, y_pred_binary, zero_division=0)
    
    # Zero-Day Recall
    if np.sum(zero_day_mask) > 0:
        zero_day_rec = recall_score(y_true_binary[zero_day_mask], y_pred_binary[zero_day_mask], zero_division=0)
    else:
        zero_day_rec = 0.0
        
    # FPR: FP / (FP + TN)
    cm = confusion_matrix(y_true_binary, y_pred_binary, labels=[0, 1])
    tn, fp, fn, tp = cm.ravel()
    fpr = fp / (fp + tn) if (fp + tn) > 0 else 0.0
    
    return {
        "accuracy": round(acc, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1": round(f1, 4),
        "zero_day_recall": round(zero_day_rec, 4),
        "fpr": round(fpr, 4)
    }

def main():
    print("Loading CIC-IDS2017 Thursday WebAttacks data...")
    df_raw = pd.read_csv(ROOT / "datasets" / "Thursday-WorkingHours-Morning-WebAttacks.pcap_ISCX.csv", encoding="cp1252")
    df = _normalize_headers(df_raw)
    
    def clean_lbl(s):
        s_str = str(s)
        if "Brute Force" in s_str: return "BruteForce"
        if "XSS" in s_str: return "XSS"
        if "Sql Injection" in s_str: return "SqlInjection"
        return "BENIGN"
        
    df["label"] = df["label"].apply(clean_lbl)
    
    # Stratified / representative sample
    benign = df[df["label"] == "BENIGN"].sample(n=5000, random_state=42)
    brute = df[df["label"] == "BruteForce"]
    xss = df[df["label"] == "XSS"] # Held-out zero day class
    
    df_exp = pd.concat([benign, brute, xss]).sample(frac=1.0, random_state=42).reset_index(drop=True)
    
    # Features
    feature_cols = ["destination_port", "duration_ms", "bytes_sent", "bytes_received"]
    X = df_exp[feature_cols].fillna(0).to_numpy(dtype=float)
    labels = df_exp["label"].to_numpy()
    
    # Zero-day split: XSS is completely held out from training
    held_out = "XSS"
    train_mask = (labels != held_out)
    
    X_train_full = X[train_mask]
    y_train_full = (labels[train_mask] != "BENIGN").astype(int) # 0=benign, 1=known attack
    
    # Train / test split on known data
    X_train, X_known_test, y_train, y_known_test = train_test_split(
        X_train_full, y_train_full, test_size=0.25, random_state=42, stratify=y_train_full
    )
    
    # Unseen zero-day data
    X_unseen = X[~train_mask]
    y_unseen = np.ones(len(X_unseen), dtype=int) # All are attack
    
    # Combine test set
    X_test = np.vstack([X_known_test, X_unseen])
    y_test = np.concatenate([y_known_test, y_unseen])
    
    # Mask indicating which test samples belong to zero-day
    is_zero_day = np.zeros(len(y_test), dtype=bool)
    is_zero_day[len(y_known_test):] = True
    
    # Scale
    scaler = StandardScaler().fit(X_train)
    X_train_scaled = scaler.transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    print(f"Dataset split: Train={len(X_train)}, Test={len(X_test)} (Known={len(X_known_test)}, ZeroDay={len(X_unseen)})")
    
    results = {}
    
    # 1. Random Forest
    print("\nTraining Random Forest...")
    rf = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
    rf.fit(X_train_scaled, y_train)
    y_pred_rf = rf.predict(X_test_scaled)
    results["Random Forest"] = evaluate_metrics(y_test, y_pred_rf, is_zero_day)
    
    # 2. XGBoost
    print("Training XGBoost...")
    xgb_clf = xgb.XGBClassifier(n_estimators=100, random_state=42, eval_metric="logloss")
    xgb_clf.fit(X_train_scaled, y_train)
    y_pred_xgb = xgb_clf.predict(X_test_scaled)
    results["XGBoost"] = evaluate_metrics(y_test, y_pred_xgb, is_zero_day)
    
    # 3. 1D-CNN
    print("Training 1D-CNN...")
    device = torch.device("cpu")
    torch.manual_seed(42)
    cnn = FlowCNN(n_features=X_train.shape[1], n_classes=2).to(device)
    crit = nn.CrossEntropyLoss()
    opt = torch.optim.Adam(cnn.parameters(), lr=0.005)
    train_loader = DataLoader(TensorDataset(torch.tensor(X_train_scaled, dtype=torch.float32), torch.tensor(y_train, dtype=torch.long)), batch_size=64, shuffle=True)
    
    cnn.train()
    for _ in range(15):
        for xb, yb in train_loader:
            opt.zero_grad()
            out = cnn(xb)
            loss = crit(out, yb)
            loss.backward()
            opt.step()
            
    cnn.eval()
    with torch.no_grad():
        out = cnn(torch.tensor(X_test_scaled, dtype=torch.float32))
        y_pred_cnn = out.argmax(dim=1).numpy()
    results["CNN"] = evaluate_metrics(y_test, y_pred_cnn, is_zero_day)
    
    # 4. LSTM
    print("Training LSTM...")
    torch.manual_seed(42)
    lstm = FlowLSTM(n_features=X_train.shape[1], n_classes=2, hidden_size=32).to(device)
    opt_lstm = torch.optim.Adam(lstm.parameters(), lr=0.005)
    lstm.train()
    for _ in range(15):
        for xb, yb in train_loader:
            opt_lstm.zero_grad()
            out = lstm(xb)
            loss = crit(out, yb)
            loss.backward()
            opt_lstm.step()
            
    lstm.eval()
    with torch.no_grad():
        out = lstm(torch.tensor(X_test_scaled, dtype=torch.float32))
        y_pred_lstm = out.argmax(dim=1).numpy()
    results["LSTM"] = evaluate_metrics(y_test, y_pred_lstm, is_zero_day)
    
    # 5. GraphSAGE
    print("Constructing k-NN Graph & Training GraphSAGE...")
    # GraphSAGE uses graph construction over the combined nodes
    torch.manual_seed(42)
    graph_data = create_graph_data(X_train_scaled, X_test_scaled, y_train, y_test)
    gs_model = GraphSAGE(in_channels=graph_data.x.shape[1], hidden_channels=32, out_channels=2)
    gs_opt = torch.optim.Adam(gs_model.parameters(), lr=0.01, weight_decay=5e-4)
    
    gs_model.train()
    for _ in range(80):
        gs_opt.zero_grad()
        out = gs_model(graph_data.x, graph_data.edge_index)
        loss = F.cross_entropy(out[graph_data.train_mask], graph_data.y[graph_data.train_mask])
        loss.backward()
        gs_opt.step()
        
    gs_model.eval()
    with torch.no_grad():
        out = gs_model(graph_data.x, graph_data.edge_index)
        y_pred_gs = out.argmax(dim=1).numpy()[graph_data.test_mask.numpy()]
        
    results["GraphSAGE"] = evaluate_metrics(y_test, y_pred_gs, is_zero_day)
    
    print("\n" + "="*80)
    print("BENCHMARK EVALUATION RESULTS:")
    print("="*80)
    res_df = pd.DataFrame(results).T
    print(res_df[["accuracy", "precision", "recall", "f1", "zero_day_recall", "fpr"]])
    
if __name__ == "__main__":
    main()
