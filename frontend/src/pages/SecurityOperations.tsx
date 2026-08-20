import { useEffect, useState } from "react";
import { DashboardShell } from "../components/layout/DashboardShell";
import { apiClient } from "../api/client";
import { useRealtimeUpdates } from "../hooks/useRealtimeUpdates";
import type { Alert, Incident } from "../types/api";

type Tab = "all" | "alerts" | "incidents" | "critical";

const SEVERITY_COLOR: Record<string, string> = {
  critical: "text-red-400 border-red-500/30 bg-red-500/10",
  high: "text-orange-400 border-orange-500/30 bg-orange-500/10",
  medium: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10",
  low: "text-slate-400 border-slate-500/30 bg-slate-500/10",
};

function SeverityBadge({ severity }: { severity: string }) {
  const cls = SEVERITY_COLOR[severity] || SEVERITY_COLOR.low;
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase ${cls}`}>
      {severity}
    </span>
  );
}

export function SecurityOperations() {
  const [tab, setTab] = useState<Tab>("all");
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { updates, connected } = useRealtimeUpdates();

  async function load() {
    setLoading(true);
    setError(null);
    const severityParam = tab === "critical" ? "critical" : undefined;
    const [alertsResult, incidentsResult] = await Promise.allSettled([
      apiClient.get("/api/alerts", { params: { severity: severityParam, limit: 100 } }),
      apiClient.get("/api/incidents", { params: { limit: 100 } }),
    ]);

    let loadedAlerts = false;
    let loadedIncidents = false;

    if (alertsResult.status === "fulfilled") {
      setAlerts(alertsResult.value.data.items || []);
      loadedAlerts = true;
    }
    if (incidentsResult.status === "fulfilled") {
      setIncidents(incidentsResult.value.data.items || []);
      loadedIncidents = true;
    }

    if (!loadedAlerts && !loadedIncidents) {
      setError("Could not reach the SentinelX backend.");
    }
    setLoading(false);
  }


  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // Re-fetch alerts when a realtime update comes in, so the table reflects
  // what the worker just wrote to Mongo/Postgres (rather than re-deriving
  // rows client-side from the pub/sub payload alone).
  useEffect(() => {
    if (updates.length > 0) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updates.length]);

  const showAlerts = tab === "all" || tab === "alerts" || tab === "critical";
  const showIncidents = tab === "all" || tab === "incidents";

  return (
    <DashboardShell>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Security Operations</h1>
          <p className="text-sm text-slate-500">Real alerts (MongoDB) and correlated incidents (PostgreSQL).</p>
        </div>
        <span className="flex items-center gap-1.5 rounded-full border border-slate-700/60 px-2.5 py-1 text-[11px] font-medium text-slate-400">
          <span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-emerald-400" : "bg-slate-500"}`} />
          {connected ? "LIVE UPDATES CONNECTED" : "REALTIME DISCONNECTED"}
        </span>
      </div>

      <div className="glass-panel mb-4 flex w-fit gap-1 p-1">
        {(["all", "alerts", "incidents", "critical"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
              tab === t ? "bg-sx-blue/20 text-sx-blue" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {error && <div className="glass-panel mb-4 border-red-500/30 p-4 text-sm text-red-300">{error}</div>}

      {loading ? (
        <div className="text-sm text-slate-500">Loading…</div>
      ) : (
        <div className="space-y-4">
          {showIncidents && (
            <div className="glass-panel p-5">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Incidents ({incidents.length})
              </h3>
              {incidents.length === 0 ? (
                <p className="text-xs text-slate-500">
                  No incidents yet. They're created automatically once ingested events trigger a
                  detection rule — try a dataset upload or the ingestion API.
                </p>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="text-slate-500">
                    <tr>
                      <th className="pb-2 font-medium">Title</th>
                      <th className="pb-2 font-medium">Severity</th>
                      <th className="pb-2 font-medium">Status</th>
                      <th className="pb-2 font-medium">Risk</th>
                      <th className="pb-2 font-medium">Alerts</th>
                      <th className="pb-2 font-medium">Updated</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-300">
                    {incidents.map((inc) => (
                      <tr key={inc.id} className="border-t border-slate-800/60">
                        <td className="py-2">{inc.title}</td>
                        <td className="py-2"><SeverityBadge severity={inc.severity} /></td>
                        <td className="py-2 capitalize">{inc.status}</td>
                        <td className="py-2">{inc.risk_score ?? "—"}</td>
                        <td className="py-2">{inc.alert_count}</td>
                        <td className="py-2 text-slate-500">{new Date(inc.updated_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {showAlerts && (
            <div className="glass-panel p-5">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Alerts ({alerts.length})
              </h3>
              {alerts.length === 0 ? (
                <p className="text-xs text-slate-500">
                  No alerts yet. The rule engine (SIGMA-001..004, seeded in database/postgres/init.sql)
                  runs inside the event worker against ingested events.
                </p>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="text-slate-500">
                    <tr>
                      <th className="pb-2 font-medium">Rule</th>
                      <th className="pb-2 font-medium">Severity</th>
                      <th className="pb-2 font-medium">MITRE</th>
                      <th className="pb-2 font-medium">Source</th>
                      <th className="pb-2 font-medium">Destination</th>
                      <th className="pb-2 font-medium">Status</th>
                      <th className="pb-2 font-medium">Created</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-300">
                    {alerts.map((a) => (
                      <tr key={a.id} className="border-t border-slate-800/60">
                        <td className="py-2">{a.rule_name}</td>
                        <td className="py-2"><SeverityBadge severity={a.severity} /></td>
                        <td className="py-2 text-slate-500">{a.mitre_technique || "—"}</td>
                        <td className="py-2">{a.source_ip || "—"}</td>
                        <td className="py-2">{a.destination_ip || "—"}</td>
                        <td className="py-2 capitalize">{a.status}</td>
                        <td className="py-2 text-slate-500">{new Date(a.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}
    </DashboardShell>
  );
}
