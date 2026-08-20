import { useEffect, useState, type FormEvent } from "react";
import { DashboardShell } from "../components/layout/DashboardShell";
import { apiClient } from "../api/client";
import type { Case } from "../types/api";

const STATUSES = ["open", "investigating", "contained", "resolved", "closed"];

export function CaseManagement() {
  const [cases, setCases] = useState<Case[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    try {
      const { data } = await apiClient.get("/api/cases");
      setCases(data);
    } catch {
      setError("Could not reach the SentinelX backend.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.post("/api/cases", { title, description, severity, related_incident_ids: [] });
      setTitle("");
      setDescription("");
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Could not create case.");
    } finally {
      setSubmitting(false);
    }
  }

  async function updateStatus(caseId: string, status: string) {
    await apiClient.patch(`/api/cases/${caseId}`, { status });
    await load();
  }

  return (
    <DashboardShell>
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-slate-100">Case Management</h1>
        <p className="text-sm text-slate-500">Analyst-managed cases, independent of automatic incident correlation.</p>
      </div>

      <form onSubmit={handleCreate} className="glass-panel mb-4 grid grid-cols-1 gap-3 p-4 sm:grid-cols-4">
        <input
          required
          placeholder="Case title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="col-span-2 rounded-lg border border-slate-700 bg-black/20 px-3 py-2 text-xs text-slate-100"
        />
        <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="rounded-lg border border-slate-700 bg-black/20 px-3 py-2 text-xs text-slate-100">
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
        <button type="submit" disabled={submitting} className="rounded-lg bg-sx-blue/90 py-2 text-xs font-medium text-black hover:bg-sx-blue disabled:opacity-50">
          {submitting ? "Creating…" : "New Case"}
        </button>
        <input
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="col-span-full rounded-lg border border-slate-700 bg-black/20 px-3 py-2 text-xs text-slate-100"
        />
      </form>

      {error && <div className="glass-panel mb-4 border-red-500/30 p-4 text-sm text-red-300">{error}</div>}

      <div className="glass-panel p-5">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Cases ({cases.length})</h3>
        {cases.length === 0 ? (
          <p className="text-xs text-slate-500">No cases yet.</p>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="text-slate-500">
              <tr>
                <th className="pb-2 font-medium">Title</th>
                <th className="pb-2 font-medium">Severity</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              {cases.map((c) => (
                <tr key={c.id} className="border-t border-slate-800/60">
                  <td className="py-2">{c.title}</td>
                  <td className="py-2 capitalize">{c.severity}</td>
                  <td className="py-2">
                    <select
                      value={c.status}
                      onChange={(e) => updateStatus(c.id, e.target.value)}
                      className="rounded-md border border-slate-700 bg-black/20 px-2 py-1 text-[11px] text-slate-200"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 text-slate-500">{new Date(c.updated_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </DashboardShell>
  );
}
