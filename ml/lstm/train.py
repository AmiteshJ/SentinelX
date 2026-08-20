"""LSTM deep learning baseline (spec §13). Each flow's feature vector is
treated as a length-1 sequence — a legitimate, minimal way to apply a
recurrent model to per-flow tabular features without fabricating a temporal
structure the dataset doesn't actually provide."""
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset

from ml.evaluation.metrics import evaluate
from ml.preprocessing.pipeline import PreparedDataset


class FlowLSTM(nn.Module):
    def __init__(self, n_features: int, n_classes: int, hidden_size: int = 32):
        super().__init__()
        self.lstm = nn.LSTM(input_size=n_features, hidden_size=hidden_size, batch_first=True)
        self.classifier = nn.Linear(hidden_size, n_classes)

    def forward(self, x):
        x = x.unsqueeze(1)  # (batch, seq_len=1, n_features)
        _, (h_n, _) = self.lstm(x)
        return self.classifier(h_n[-1])


def train_and_evaluate(
    data: PreparedDataset, *, epochs: int = 15, batch_size: int = 64, lr: float = 1e-3, random_state: int = 42
) -> dict:
    torch.manual_seed(random_state)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    n_classes = int(max(data.y_train.max(), data.y_test.max()) + 1)
    model = FlowLSTM(n_features=data.X_train.shape[1], n_classes=n_classes).to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=lr)
    criterion = nn.CrossEntropyLoss()

    train_ds = TensorDataset(torch.tensor(data.X_train, dtype=torch.float32), torch.tensor(data.y_train, dtype=torch.long))
    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True)

    model.train()
    for _epoch in range(epochs):
        for xb, yb in train_loader:
            xb, yb = xb.to(device), yb.to(device)
            optimizer.zero_grad()
            loss = criterion(model(xb), yb)
            loss.backward()
            optimizer.step()

    model.eval()
    with torch.no_grad():
        X_test_t = torch.tensor(data.X_test, dtype=torch.float32).to(device)
        logits = model(X_test_t)
        probs = torch.softmax(logits, dim=1).cpu().numpy()
        y_pred = np.argmax(probs, axis=1)

    result = evaluate(data.y_test, y_pred, probs)
    return {"model": "lstm", "held_out_class": data.held_out_class, **result.to_dict()}
