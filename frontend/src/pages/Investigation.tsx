import { useState, type FormEvent } from "react";
import { DashboardShell } from "../components/layout/DashboardShell";
import { BentoCard } from "../components/ui/BentoCard";
import { apiClient } from "../api/client";
import { AttackGraph } from "../components/graph/AttackGraph";
import { fetchIncidentCorrelationGraph, type IncidentGraphResponse } from "../api/correlation";
import { Network, Clock, Shield, AlertTriangle } from "lucide-react";

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
  const [graphData, setGraphData] = useState<IncidentGraphResponse | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "graph">("overview");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Manual SOAR Console state
  const [manualAction, setManualAction] = useState("block_ip");
  const [manualTarget, setManualTarget] = useState("");
  const [manualStatus, setManualStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [manualExecuting, setManualExecuting] = useState(false);

  async function handleLoad(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data: res } = await apiClient.get(`/api/investigation/${incidentId}`);
      setData(res);

      // Also load graph data
      try {
        const gRes = await fetchIncidentCorrelationGraph(incidentId);
        setGraphData(gRes);
      } catch (gErr) {
        console.warn("Could not load incident graph", gErr);
        setGraphData(null);
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Incident not found.");
      setData(null);
      setGraphData(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleTakeAction(action: string, target: string) {
    if (!window.confirm(`Are you sure you want to execute ${action} on ${target}?`)) return;
    setActionLoading(target);
    try {
      await apiClient.post("/api/agent/command", { action, target, incident_id: incidentId || undefined });
      alert(`Successfully dispatched ${action} for ${target} to Live Agent`);
      if (incidentId && data) {
        handleLoad(new Event("submit") as any);
      }
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Failed to queue action");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleExecuteManualSoar(e: FormEvent) {
    e.preventDefault();
    if (!manualTarget.trim()) return;
    setManualExecuting(true);
    setManualStatus(null);
    try {
      await apiClient.post("/api/agent/command", {
        action: manualAction,
        target: manualTarget.trim(),
        incident_id: incidentId || undefined,
      });
      setManualStatus({
        type: "success",
        message: `Command [${manualAction.toUpperCase()} -> ${manualTarget}] successfully queued! The SentinelX live agent will execute it immediately.`,
      });
      setManualTarget("");
    } catch (err: any) {
      setManualStatus({
        type: "error",
        message: err?.response?.data?.detail || "Failed to dispatch command to agent.",
      });
    } finally {
      setManualExecuting(false);
    }
  }

  return (
    <DashboardShell>
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-slate-100">Incident Investigation & SOAR Response</h1>
        <p className="text-sm text-slate-500">
          Analyze security incidents, investigate timelines, and execute live host containment actions.
        </p>
      </div>

      {/* Standalone SOAR Active Response Console */}
      <div className="glass-panel mb-6 border-red-500/20 bg-red-950/10 p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-red-400">
              SOAR Active Response (Host Containment Console)
            </h2>
          </div>
          <span className="text-[11px] text-slate-400">Targeting Live Connected Host Agents</span>
        </div>

        <form onSubmit={handleExecuteManualSoar} className="flex flex-col gap-3 sm:flex-row">
          <select
            value={manualAction}
            onChange={(e) => setManualAction(e.target.value)}
            className="rounded-lg border border-slate-700 bg-black/40 px-3 py-2 text-xs font-medium text-slate-200 outline-none focus:border-red-500"
          >
            <option value="block_ip">🛡️ Block IP (Firewall)</option>
            <option value="kill_process">🛑 Kill Process (Host Taskkill)</option>
            <option value="unblock_ip">🔓 Unblock IP (Remove Firewall Rule)</option>
          </select>

          <input
            required
            placeholder={manualAction === "kill_process" ? "Process Name or PID (e.g., notepad.exe)" : "Target IP Address (e.g., 198.51.100.25)"}
            value={manualTarget}
            onChange={(e) => setManualTarget(e.target.value)}
            className="flex-1 rounded-lg border border-slate-700 bg-black/40 px-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-red-500"
          />

          <button
            type="submit"
            disabled={manualExecuting}
            className="rounded-lg bg-red-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-red-600/20 hover:bg-red-500 disabled:opacity-50 transition-colors"
          >
            {manualExecuting ? "Dispatching..." : "Execute on Host Agent"}
          </button>
        </form>

        {/* Quick presets for rapid testing */}
        <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400">
          <span>Quick Test Presets:</span>
          <button
            type="button"
            onClick={() => { setManualAction("block_ip"); setManualTarget("198.51.100.25"); }}
            className="rounded bg-slate-800/80 px-2 py-0.5 text-slate-300 hover:bg-slate-700"
          >
            Test IP: 198.51.100.25
          </button>
          <button
            type="button"
            onClick={() => { setManualAction("kill_process"); setManualTarget("notepad.exe"); }}
            className="rounded bg-slate-800/80 px-2 py-0.5 text-slate-300 hover:bg-slate-700"
          >
            Test Process: notepad.exe
          </button>
        </div>

        {manualStatus && (
          <div
            className={`mt-3 rounded-lg border p-3 text-xs ${
              manualStatus.type === "success"
                ? "border-emerald-500/40 bg-emerald-950/20 text-emerald-300"
                : "border-red-500/40 bg-red-950/20 text-red-300"
            }`}
          >
            {manualStatus.message}
          </div>
        )}
      </div>

      {/* Incident Deep Dive Search */}
      <div className="mb-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Incident Deep Dive</h3>
      </div>
      <form onSubmit={handleLoad} className="glass-panel mb-4 flex gap-2 p-4">
        <input
          required
          placeholder="Enter Incident ID to load timeline and forensics (from Security Operations)"
          value={incidentId}
          onChange={(e) => setIncidentId(e.target.value)}
          className="flex-1 rounded-lg border border-slate-700 bg-black/20 px-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-sx-blue"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-sx-blue/90 px-4 py-2 text-xs font-medium text-black hover:bg-sx-blue disabled:opacity-50"
        >
          {loading ? "Loading…" : "Open Incident"}
        </button>
      </form>

      {error && <div className="glass-panel mb-4 border-red-500/30 p-4 text-sm text-red-300">{error}</div>}

      {data && (
        <div className="space-y-4">
          {/* Tab Switcher */}
          <div className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-900/80 border border-slate-800 w-fit">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === "overview"
                  ? "bg-sx-blue text-[#04101a] shadow-[0_0_12px_rgba(58,160,255,0.3)]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Clock size={13} />
              Forensics &amp; Timeline
            </button>
            <button
              onClick={() => setActiveTab("graph")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === "graph"
                  ? "bg-cyan-500 text-[#04101a] shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Network size={13} />
              Attack Entity Graph
              {graphData && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-black/30 text-[10px] font-mono">
                  {graphData.nodes.length}
                </span>
              )}
            </button>
          </div>

          {activeTab === "overview" ? (
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
                  <ul className="space-y-2 text-xs text-slate-300">
                    {data.affected_assets.ips.map((ip) => (
                      <li key={ip} className="flex items-center justify-between">
                        <span>{ip}</span>
                        <button
                          onClick={() => handleTakeAction("block_ip", ip)}
                          disabled={actionLoading === ip}
                          className="rounded bg-red-500/20 px-2 py-1 text-[10px] text-red-400 hover:bg-red-500/30 disabled:opacity-50"
                        >
                          {actionLoading === ip ? "Queuing..." : "Block IP"}
                        </button>
                      </li>
                    ))}
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
          ) : (
            <div className="space-y-3">
              {graphData ? (
                <>
                  {graphData.summary.choke_points.length > 0 && (
                    <div className="p-3.5 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-semibold flex items-center gap-2">
                        <Network size={14} className="text-cyan-400" />
                        Identified Attack Pivot Choke Points:
                      </span>
                      <div className="flex items-center gap-2">
                        {graphData.summary.choke_points.map((cp) => (
                          <span key={cp.id} className="px-2.5 py-1 rounded-lg bg-slate-900 border border-cyan-500/40 font-mono text-cyan-300 text-[11px]">
                            {cp.label} ({cp.degree} links)
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <AttackGraph nodes={graphData.nodes} edges={graphData.edges} height={520} />
                </>
              ) : (
                <div className="p-8 rounded-2xl bg-slate-900 text-center text-slate-400 text-xs">
                  Loading incident graph...
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </DashboardShell>
  );
}
