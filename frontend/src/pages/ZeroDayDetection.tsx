import { useEffect, useState, type FormEvent } from "react";
import { DashboardShell } from "../components/layout/DashboardShell";
import { BentoCard } from "../components/ui/BentoCard";
import { apiClient } from "../api/client";
import type { Experiment } from "../types/api";

const MODELS = ["random_forest", "xgboost", "cnn", "lstm", "graphsage"];

export function ZeroDayDetection() {
  const [file, setFile] = useState<File | null>(null);
  const [heldOutClass, setHeldOutClass] = useState("");
  const [selectedModels, setSelectedModels] = useState<string[]>(MODELS);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latest, setLatest] = useState<Experiment | null>(null);
  const [history, setHistory] = useState<Experiment[]>([]);

  async function loadHistory() {
    try {
      const { data } = await apiClient.get("/api/experiments/history");
      setHistory(data.items);
    } catch {
      /* not authorized or backend unreachable — leave history empty */
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  function toggleModel(m: string) {
    setSelectedModels((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  }

  async function handleRun(e: FormEvent) {
    e.preventDefault();
    if (!file) return;
    setRunning(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (heldOutClass) formData.append("held_out_class", heldOutClass);
      formData.append("models", selectedModels.join(","));

      const { data } = await apiClient.post("/api/experiments/run", formData, {
        timeout: 300000,
      });
      setLatest(data);
      await loadHistory();
    } catch (err: any) {
      let detail = err?.response?.data?.detail;
      if (Array.isArray(detail)) {
        detail = detail.map((d: any) => d.msg || JSON.stringify(d)).join("; ");
      } else if (typeof detail === "object" && detail !== null) {
        detail = JSON.stringify(detail);
      }
      setError(detail || err?.message || "Experiment failed.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <DashboardShell>
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-slate-100">Zero-Day Detection</h1>
        <p className="text-sm text-slate-500">
          Held-out-class evaluation: GraphSAGE vs. Random Forest / XGBoost / CNN / LSTM on a
          dataset you upload (needs a "Label" column, e.g. CIC-IDS2017/CSE-CIC-IDS2018-style CSV).
        </p>
      </div>

      <form onSubmit={handleRun} className="glass-panel mb-4 space-y-3 p-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">Dataset CSV</label>
          <input
            type="file"
            accept=".csv"
            required
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full text-xs text-slate-300"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">
            Held-out class (leave blank for a standard random split baseline)
          </label>
          <input
            value={heldOutClass}
            onChange={(e) => setHeldOutClass(e.target.value)}
            placeholder="e.g. WebAttack — must match a value in the Label column"
            className="w-full rounded-lg border border-slate-700 bg-black/20 px-3 py-2 text-xs text-slate-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">Models</label>
          <div className="flex flex-wrap gap-2">
            {MODELS.map((m) => (
              <button
                type="button"
                key={m}
                onClick={() => toggleModel(m)}
                className={`rounded-full border px-3 py-1 text-xs capitalize transition-colors ${
                  selectedModels.includes(m) ? "border-sx-blue/40 bg-sx-blue/10 text-sx-blue" : "border-slate-700 text-slate-400"
                }`}
              >
                {m.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={running || !file}
          className="rounded-lg bg-sx-blue/90 px-4 py-2 text-xs font-medium text-black hover:bg-sx-blue disabled:opacity-50"
        >
          {running ? "Training & evaluating…" : "Run Experiment"}
        </button>
      </form>

      {latest && (
        <BentoCard title={`Latest Result — ${latest.experiment_type}${latest.held_out_class ? ` (held out: ${latest.held_out_class})` : ""}`} span={3}>
          <table className="w-full text-left text-xs">
            <thead className="text-slate-500">
              <tr>
                <th className="pb-2 font-medium">Model</th>
                <th className="pb-2 font-medium">Accuracy</th>
                <th className="pb-2 font-medium">Precision</th>
                <th className="pb-2 font-medium">Recall</th>
                <th className="pb-2 font-medium">F1</th>
                <th className="pb-2 font-medium">ROC-AUC</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              {latest.results.map((r) => (
                <tr key={r.model} className="border-t border-slate-800/60">
                  <td className="py-2 capitalize">{r.model.replace("_", " ")}</td>
                  {r.error ? (
                    <td colSpan={5} className="py-2 text-red-400">{r.error}</td>
                  ) : (
                    <>
                      <td className="py-2">{r.accuracy}</td>
                      <td className="py-2">{r.precision}</td>
                      <td className="py-2">{r.recall}</td>
                      <td className="py-2">{r.f1_score}</td>
                      <td className="py-2">{r.roc_auc ?? "—"}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </BentoCard>
      )}

      <div className="glass-panel mt-4 p-5">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Experiment History ({history.length})
        </h3>
        {history.length === 0 ? (
          <p className="text-xs text-slate-500">No experiments run yet.</p>
        ) : (
          <ul className="space-y-2 text-xs text-slate-300">
            {history.map((exp) => (
              <li key={exp.id} className="flex items-center justify-between border-t border-slate-800/60 pt-2">
                <span>{exp.experiment_type}{exp.held_out_class ? ` — held out: ${exp.held_out_class}` : ""}</span>
                <span className="text-slate-500">{exp.results.length} models · by {exp.triggered_by}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardShell>
  );
}
