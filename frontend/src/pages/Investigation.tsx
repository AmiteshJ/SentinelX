import { useState, type FormEvent } from "react";
import { DashboardShell } from "../components/layout/DashboardShell";
import { BentoCard } from "../components/ui/BentoCard";
import { apiClient } from "../api/client";

interface InvestigationData {
  incident: { id: string; title: string; severity: string; status: string; risk_score: number | null };
  timeline: { timestamp: string; event: string }[];
  alerts: any[];
  affected_assets: { ips: string[] };
  mitre_techniques: string[];
}

export function Investigation() {
  const [incidentId, setIncidentId] = useState("");
  const [data, setData] = useState<InvestigationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLoad(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data: res } = await apiClient.get(`/api/investigation/${incidentId}`);
      setData(res);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Incident not found.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardShell>
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-slate-100">Investigation</h1>
        <p className="text-sm text-slate-500">Full incident workspace: timeline, alerts, affected assets, MITRE mapping.</p>
      </div>

      <form onSubmit={handleLoad} className="glass-panel mb-4 flex gap-2 p-4">
        <input
          required
          placeholder="Incident ID (from Security Operations)"
          value={incidentId}
          onChange={(e) => setIncidentId(e.target.value)}
          className="flex-1 rounded-lg border border-slate-700 bg-black/20 px-3 py-2 text-xs text-slate-100"
        />
        <button type="submit" disabled={loading} className="rounded-lg bg-sx-blue/90 px-4 py-2 text-xs font-medium text-black hover:bg-sx-blue disabled:opacity-50">
          {loading ? "Loading…" : "Open"}
        </button>
      </form>

      {error && <div className="glass-panel mb-4 border-red-500/30 p-4 text-sm text-red-300">{error}</div>}

      {data && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <BentoCard title="Incident">
            <p className="text-sm text-slate-200">{data.incident.title}</p>
            <p className="mt-1 text-xs text-slate-500 capitalize">{data.incident.severity} · {data.incident.status}</p>
            <p className="mt-1 text-xs text-slate-500">Risk score: {data.incident.risk_score ?? "—"}</p>
          </BentoCard>

          <BentoCard title="Affected Assets">
            {data.affected_assets.ips.length === 0 ? (
              <p className="text-xs text-slate-500">None recorded.</p>
            ) : (
              <ul className="space-y-1 text-xs text-slate-300">
                {data.affected_assets.ips.map((ip) => <li key={ip}>{ip}</li>)}
              </ul>
            )}
          </BentoCard>

          <BentoCard title="MITRE Techniques">
            {data.mitre_techniques.length === 0 ? (
              <p className="text-xs text-slate-500">None recorded.</p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {data.mitre_techniques.map((t) => (
                  <span key={t} className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] text-slate-300">{t}</span>
                ))}
              </div>
            )}
          </BentoCard>

          <BentoCard title="Timeline" span={3}>
            {data.timeline.length === 0 ? (
              <p className="text-xs text-slate-500">No timeline events.</p>
            ) : (
              <ul className="space-y-2 text-xs">
                {data.timeline.map((t, idx) => (
                  <li key={idx} className="flex items-center gap-3 border-t border-slate-800/60 pt-2 first:border-t-0 first:pt-0">
                    <span className="text-slate-500">{new Date(t.timestamp).toLocaleString()}</span>
                    <span className="text-slate-200">{t.event}</span>
                  </li>
                ))}
              </ul>
            )}
          </BentoCard>
        </div>
      )}
    </DashboardShell>
  );
}
