import { useEffect, useState, type FormEvent } from "react";
import { DashboardShell } from "../components/layout/DashboardShell";
import { apiClient } from "../api/client";
import type { Report } from "../types/api";

export function Reports() {
  const [incidentId, setIncidentId] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<Report[]>([]);

  async function load() {
    try {
      const { data } = await apiClient.get("/api/reports");
      setReports(data.items);
    } catch {
      /* likely 403 for non-privileged roles, or backend unreachable */
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleGenerate(e: FormEvent) {
    e.preventDefault();
    setGenerating(true);
    setError(null);
    try {
      await apiClient.post(`/api/reports/generate/${incidentId}`);
      setIncidentId("");
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Could not generate report.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <DashboardShell>
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-slate-100">Reports</h1>
        <p className="text-sm text-slate-500">
          Executive summary drafted by the configured AI provider; every other field is pulled
          directly from the incident's real data — the LLM never supplies facts (spec §44).
        </p>
      </div>

      <form onSubmit={handleGenerate} className="glass-panel mb-4 flex gap-2 p-4">
        <input
          required
          placeholder="Incident ID"
          value={incidentId}
          onChange={(e) => setIncidentId(e.target.value)}
          className="flex-1 rounded-lg border border-slate-700 bg-black/20 px-3 py-2 text-xs text-slate-100"
        />
        <button
          type="submit"
          disabled={generating}
          className="rounded-lg bg-sx-blue/90 px-4 py-2 text-xs font-medium text-black hover:bg-sx-blue disabled:opacity-50"
        >
          {generating ? "Generating…" : "Generate Report"}
        </button>
      </form>

      {error && <div className="glass-panel mb-4 border-red-500/30 p-4 text-sm text-red-300">{error}</div>}

      <div className="space-y-4">
        {reports.length === 0 ? (
          <div className="glass-panel p-5 text-xs text-slate-500">No reports generated yet.</div>
        ) : (
          reports.map((r) => (
            <div key={r.id} className="glass-panel p-5">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">Incident {r.incident_id}</span>
                <span className="text-[10px] text-slate-500">{new Date(r.generated_at).toLocaleString()}</span>
              </div>
              <p className="mb-2 text-sm text-slate-200">{r.executive_summary}</p>
              {r.executive_summary_provider && (
                <p className="text-[10px] text-slate-500">Drafted via {r.executive_summary_provider}</p>
              )}
            </div>
          ))
        )}
      </div>
    </DashboardShell>
  );
}
