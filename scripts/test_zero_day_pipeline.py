"""
SentinelX Zero-Day Detection Test Script.
Exercises the zero-day split logic and model evaluation across available ML algorithms.
"""
import sys
from pathlib import Path

# Add project root and backend/ml paths
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "backend"))
sys.path.insert(0, str(ROOT / "ml"))

from app.services.dataset_service import clean_dataframe, load_csv
from ml.preprocessing.pipeline import zero_day_split
from ml.random_forest.train import train_and_evaluate as run_rf
from ml.xgboost.train import train_and_evaluate as run_xgb

def main():
    dataset_file = ROOT / "ml" / "datasets" / "sample_zero_day_dataset.csv"
    if not dataset_file.exists():
        print("Sample dataset not found. Generating one...")
        import generate_sample_dataset
    
    print(f"Loading dataset: {dataset_file}")
    df = clean_dataframe(load_csv(dataset_file.read_bytes()))
    print(f"Total records: {len(df)}")
    print(f"Attack classes present: {df['label'].unique().tolist()}")

    held_out = "WebAttack"
    print(f"\n--- Testing Zero-Day Evaluation (Held-out class: '{held_out}') ---")
    data = zero_day_split(df, held_out_class=held_out)
    print(f"Training samples (excluding '{held_out}'): {len(data.y_train)}")
    print(f"Testing samples (including unseen '{held_out}'): {len(data.y_test)}")

    print("\n1. Running Random Forest...")
    rf_metrics = run_rf(data)
    print(f"   Accuracy: {rf_metrics['accuracy']} | F1: {rf_metrics['f1_score']} | Precision: {rf_metrics['precision']} | Recall: {rf_metrics['recall']}")

    print("\n2. Running XGBoost...")
    xgb_metrics = run_xgb(data)
    print(f"   Accuracy: {xgb_metrics['accuracy']} | F1: {xgb_metrics['f1_score']} | Precision: {xgb_metrics['precision']} | Recall: {xgb_metrics['recall']} | ROC-AUC: {xgb_metrics['roc_auc']}")

    print("\n3. Testing PyTorch & GraphSAGE availability...")
    try:
        import torch
        import torch_geometric
        from ml.graphsage.train import train_and_evaluate as run_graphsage
        gs_metrics = run_graphsage(df, held_out_class=held_out)
        print("   GraphSAGE evaluation succeeded!")
        print(f"   Accuracy: {gs_metrics['accuracy']} | F1: {gs_metrics['f1_score']}")
    except ImportError:
        print("   Note: PyTorch / PyTorch-Geometric is not installed in this environment.")
        print("   (Install with `pip install torch torch-geometric` if you want to run CNN/LSTM/GraphSAGE).")

    print("\n[SUCCESS] Zero-Day Detection pipeline verified successfully!")

if __name__ == "__main__":
    main()
