"""
Generates a sample cybersecurity CSV dataset for testing SentinelX Zero-Day Detection.
Creates: ml/datasets/sample_zero_day_dataset.csv
"""
from pathlib import Path

csv_lines = [
    "Source IP,Destination IP,Destination Port,Duration Ms,Bytes Sent,Bytes Received,Label"
]

# Generate normal benign traffic
for i in range(1, 51):
    src = f"192.168.1.{10 + (i % 15)}"
    dst = "10.0.0.1"
    port = 80 if i % 2 == 0 else 443
    duration = 50 + (i * 3)
    sent = 300 + (i * 12)
    recv = 1200 + (i * 25)
    csv_lines.append(f"{src},{dst},{port},{duration},{sent},{recv},BENIGN")

# Generate PortScan attack traffic (known attack 1)
for i in range(1, 31):
    src = f"172.16.0.{5 + (i % 3)}"
    dst = "10.0.0.5"
    port = 1000 + i * 10
    duration = 5000 + (i * 50)
    sent = 12000 + (i * 100)
    recv = 150 + (i * 10)
    csv_lines.append(f"{src},{dst},{port},{duration},{sent},{recv},PortScan")

# Generate WebAttack attack traffic (target zero-day held-out class)
for i in range(1, 31):
    src = f"198.51.100.{20 + (i % 4)}"
    dst = "10.0.0.8"
    port = 8080
    duration = 200 + (i * 15)
    sent = 4500 + (i * 80)
    recv = 850 + (i * 20)
    csv_lines.append(f"{src},{dst},{port},{duration},{sent},{recv},WebAttack")

output_path = Path(__file__).resolve().parents[1] / "ml" / "datasets" / "sample_zero_day_dataset.csv"
output_path.parent.mkdir(parents=True, exist_ok=True)
output_path.write_text("\n".join(csv_lines), encoding="utf-8")
print(f"Sample dataset successfully created at: {output_path}")
