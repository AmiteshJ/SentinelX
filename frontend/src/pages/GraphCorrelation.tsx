import { useEffect, useState } from "react";
import {
  GitFork,
  Network,
  ShieldAlert,
  Server,
  Terminal,
  Crosshair,
  RefreshCw,
  Layers,
  ArrowRight,
  Zap,
  Filter
} from "lucide-react";
import { DashboardShell } from "../components/layout/DashboardShell";
import { AttackGraph } from "../components/graph/AttackGraph";
import {
  fetchGlobalCorrelationGraph,
  fetchIncidentCorrelationGraph,
  type GraphNode,
  type GraphEdge,
  type ChokePoint
} from "../api/correlation";
import { apiClient } from "../api/client";

export function GraphCorrelation() {
  const [mode, setMode] = useState<"global" | "incident">("global");
  const [incidentsList, setIncidentsList] = useState<{ id: string; title: string; severity: string }[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>("");

  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [chokePoints, setChokePoints] = useState<ChokePoint[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load incidents for selector
  useEffect(() => {
    async function loadIncidents() {
      try {
        const { data } = await apiClient.get<any[]>("/api/dashboard/stats");
        // Or fetch from /api/cases
        const res = await apiClient.get<any[]>("/api/cases");
        if (res.data && res.data.length > 0) {
          const list = res.data.map((c) => ({
            id: c.incident_id || c.id,
            title: c.title,
            severity: c.severity || "medium"
          }));
          setIncidentsList(list);
          if (!selectedIncidentId) {
            setSelectedIncidentId(list[0].id);
          }
        }
      } catch (e) {
        console.error("Failed to load incidents list", e);
      }
    }
    loadIncidents();
  }, []);

  // Fetch graph data
  async function loadGraphData() {
    setLoading(true);
    setError(null);
    try {
      if (mode === "global") {
        const res = await fetchGlobalCorrelationGraph(15);
        setNodes(res.nodes);
        setEdges(res.edges);
        setSummary(res.summary);
        setChokePoints([]);
      } else if (selectedIncidentId) {
        const res = await fetchIncidentCorrelationGraph(selectedIncidentId);
        setNodes(res.nodes);
        setEdges(res.edges);
        setSummary(res.summary);
        setChokePoints(res.summary.choke_points || []);
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to load correlation graph.");
      setNodes([]);
      setEdges([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGraphData();
  }, [mode, selectedIncidentId]);

  return (
    <DashboardShell>
      <div className="space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-[#0c1424] via-[#09101d] to-[#050811] border border-slate-800/80 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-[110px] pointer-events-none" />

          <div className="relative z-10 space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold">
              <Network size={14} className="text-cyan-400" />
              Graph-Based Alert Correlation (Phase 11)
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Multi-Hop Threat Entity &amp; Attack Path Visualizer
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
              Traverse attack links connecting host processes, network connections, triggered Sigma alerts, and malicious IOCs to identify root causes and choke points.
            </p>
          </div>

          <div className="relative z-10 flex items-center gap-3">
            <button
              onClick={loadGraphData}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-inner"
            >
              <RefreshCw size={14} className={loading ? "animate-spin text-cyan-400" : ""} />
              Refresh Graph
            </button>
          </div>
        </div>

        {/* View Switcher & Incident Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#090e1a]/80 border border-slate-800/80 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMode("global")}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                mode === "global"
                  ? "bg-cyan-500 text-[#04101a] shadow-[0_0_15px_rgba(6,182,212,0.35)]"
                  : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              <Layers size={14} />
              Global Threat Clusters
            </button>
            <button
              onClick={() => setMode("incident")}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                mode === "incident"
                  ? "bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.35)]"
                  : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              <Crosshair size={14} />
              Incident Sub-Graph
            </button>
          </div>

          {mode === "incident" && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Select Incident:</span>
              <select
                value={selectedIncidentId}
                onChange={(e) => setSelectedIncidentId(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
              >
                {incidentsList.map((inc) => (
                  <option key={inc.id} value={inc.id}>
                    [{inc.severity.toUpperCase()}] {inc.title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Choke Points / Pivot Highlights (if incident mode) */}
        {chokePoints.length > 0 && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/20 via-slate-900/40 to-slate-900/20 border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                <Zap size={18} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Identified Attack Choke Points</h3>
                <p className="text-[11px] text-slate-400">Entities with highest connectivity degree (central attack pivots)</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {chokePoints.map((cp) => (
                <div key={cp.id} className="px-3 py-1.5 rounded-xl bg-slate-900 border border-cyan-500/40 text-xs flex items-center gap-2">
                  <span className="font-mono font-bold text-cyan-300">{cp.label}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-bold">
                    {cp.degree} Links
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Graph Visualization */}
        {loading ? (
          <div className="h-[520px] rounded-2xl bg-[#070b14] border border-slate-800 flex items-center justify-center flex-col gap-3">
            <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-400">Building multi-hop entity graph...</p>
          </div>
        ) : error ? (
          <div className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-center">
            {error}
          </div>
        ) : nodes.length === 0 ? (
          <div className="p-12 rounded-2xl bg-slate-900/60 border border-slate-800 text-center text-slate-400 text-sm">
            No entities correlated in this view yet. Ingest telemetry or execute detections to build correlation links.
          </div>
        ) : (
          <div className="space-y-4">
            <AttackGraph nodes={nodes} edges={edges} height={560} />

            {/* Quick Stats Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 rounded-2xl bg-[#090e1a] border border-slate-800 text-xs text-slate-400 font-mono">
              <div className="flex items-center gap-4">
                <span>Total Entities: <strong className="text-white">{nodes.length}</strong></span>
                <span>Active Relations: <strong className="text-white">{edges.length}</strong></span>
              </div>
              <span className="text-[11px] text-slate-500">
                Interactive: Click on any node to view entity attributes and metadata. Drag to inspect topology.
              </span>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
