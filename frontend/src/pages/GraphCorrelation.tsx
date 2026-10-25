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

  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);

  // Load incidents for selector
  useEffect(() => {
    async function loadIncidents() {
      try {
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
    setFocusedNodeId(null);
    try {
      if (mode === "global") {
        const res = await fetchGlobalCorrelationGraph(25);
        setNodes(res.nodes);
        setEdges(res.edges);
        setSummary(res.summary);
        setChokePoints(res.summary?.choke_points || []);
      } else if (selectedIncidentId) {
        const res = await fetchIncidentCorrelationGraph(selectedIncidentId);
        setNodes(res.nodes);
        setEdges(res.edges);
        setSummary(res.summary);
        setChokePoints(res.summary?.choke_points || []);
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-white/95 dark:bg-gradient-to-r dark:from-[#0c1424] dark:via-[#09101d] dark:to-[#050811] border border-[#e2d9cc] dark:border-slate-800/80 shadow-[0_4px_24px_rgba(40,41,55,0.06)] dark:shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-[110px] pointer-events-none" />

          <div className="relative z-10 space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-300 dark:border-cyan-500/30 text-cyan-800 dark:text-cyan-400 text-xs font-semibold">
              <Network size={14} className="text-cyan-600 dark:text-cyan-400" />
              Graph-Based Alert Correlation (Phase 11)
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#282937] dark:text-white">
              Multi-Hop Threat Entity &amp; Attack Path Visualizer
            </h1>
            <p className="text-xs sm:text-sm text-[#4a4b5e] dark:text-slate-400 max-w-2xl">
              Traverse attack links connecting host processes, network connections, triggered Sigma alerts, and malicious IOCs to identify root causes and choke points.
            </p>
          </div>

          <div className="relative z-10 flex items-center gap-3">
            <button
              onClick={loadGraphData}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-[#e2d9cc] dark:border-slate-800 text-xs font-semibold text-[#282937] dark:text-slate-300 hover:bg-[#f8f4ec] dark:hover:bg-slate-800 hover:text-[#282937] dark:hover:text-white transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <RefreshCw size={14} className={loading ? "animate-spin text-cyan-600 dark:text-cyan-400" : ""} />
              Refresh Graph
            </button>
          </div>
        </div>

        {/* View Switcher & Incident Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white/95 dark:bg-[#090e1a]/80 border border-[#e2d9cc] dark:border-slate-800/80 backdrop-blur-md shadow-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMode("global")}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                mode === "global"
                  ? "bg-cyan-600 dark:bg-cyan-500 text-white dark:text-[#04101a] shadow-xs"
                  : "bg-white dark:bg-slate-900 text-[#4a4b5e] dark:text-slate-400 hover:text-[#282937] dark:hover:text-white border border-[#e2d9cc] dark:border-slate-800"
              }`}
            >
              <Layers size={14} />
              Global Threat Clusters
            </button>
            <button
              onClick={() => setMode("incident")}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                mode === "incident"
                  ? "bg-purple-600 dark:bg-purple-500 text-white shadow-xs"
                  : "bg-white dark:bg-slate-900 text-[#4a4b5e] dark:text-slate-400 hover:text-[#282937] dark:hover:text-white border border-[#e2d9cc] dark:border-slate-800"
              }`}
            >
              <Crosshair size={14} />
              Incident Sub-Graph
            </button>
          </div>

          {mode === "incident" && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#58565e] dark:text-slate-400 font-medium">Select Incident:</span>
              <select
                value={selectedIncidentId}
                onChange={(e) => setSelectedIncidentId(e.target.value)}
                className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#0b111e] border border-[#e2d9cc] dark:border-slate-700 text-xs text-[#282937] dark:text-slate-100 focus:outline-none focus:border-purple-500 cursor-pointer shadow-xs"
              >
                {incidentsList.map((inc) => (
                  <option key={inc.id} value={inc.id} className="bg-white dark:bg-[#0b111e] text-[#282937] dark:text-slate-200">
                    [{inc.severity.toUpperCase()}] {inc.title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Choke Points / Pivot Highlights (Clickable to focus node) */}
        {chokePoints.length > 0 && (
          <div className="p-4 rounded-2xl bg-[#fefbf4] dark:bg-gradient-to-r dark:from-cyan-950/20 dark:via-slate-900/40 dark:to-slate-900/20 border border-[#e2d9cc] dark:border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-cyan-50 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 border border-cyan-300 dark:border-cyan-500/30">
                <Zap size={18} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-[#282937] dark:text-white uppercase tracking-wider">Identified Attack Choke Points</h3>
                <p className="text-[11px] text-[#58565e] dark:text-slate-400">Click any central pivot to inspect its multi-hop connections in the visualizer</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {chokePoints.map((cp) => (
                <button
                  key={cp.id}
                  type="button"
                  onClick={() => setFocusedNodeId(cp.id)}
                  className={`px-3 py-1.5 rounded-xl border text-xs flex items-center gap-2 transition-all cursor-pointer ${
                    focusedNodeId === cp.id
                      ? "bg-cyan-50 dark:bg-cyan-500/20 border-cyan-500 text-cyan-900 dark:text-white shadow-xs"
                      : "bg-white dark:bg-slate-900 border-[#e2d9cc] dark:border-cyan-500/40 text-[#282937] dark:text-slate-300 hover:border-cyan-400"
                  }`}
                  title="Click to focus on this entity in graph"
                >
                  <span className="font-mono font-bold text-cyan-800 dark:text-cyan-300">{cp.label}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-100 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-400 font-bold">
                    {cp.degree} Links
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Main Graph Visualization */}
        {loading ? (
          <div className="h-[540px] rounded-2xl bg-[#fefbf4] dark:bg-[#070b14] border border-[#e2d9cc] dark:border-slate-800 flex items-center justify-center flex-col gap-3 shadow-xs">
            <div className="w-10 h-10 border-2 border-cyan-500 dark:border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-[#58565e] dark:text-slate-400 font-mono">Building multi-hop entity graph &amp; calculating attack paths...</p>
          </div>
        ) : error ? (
          <div className="p-8 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-400 text-center text-sm shadow-xs">
            {error}
          </div>
        ) : nodes.length === 0 ? (
          <div className="p-12 rounded-2xl bg-[#fefbf4] dark:bg-slate-900/60 border border-[#e2d9cc] dark:border-slate-800 text-center text-[#58565e] dark:text-slate-400 text-sm shadow-xs">
            No entities correlated in this view yet. Ingest telemetry or execute detections to build correlation links.
          </div>
        ) : (
          <div className="space-y-4">
            <AttackGraph
              nodes={nodes}
              edges={edges}
              height={580}
              selectedNodeId={focusedNodeId}
              onNodeClick={(node) => setFocusedNodeId(node.id)}
            />

            {/* Quick Stats & Flow Guide Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 rounded-2xl bg-[#fcfaf5] dark:bg-[#090e1a] border border-[#e2d9cc] dark:border-slate-800 text-xs text-[#58565e] dark:text-slate-400 font-mono shadow-xs">
              <div className="flex items-center gap-4">
                <span>Total Entities: <strong className="text-[#282937] dark:text-white font-semibold">{nodes.length}</strong></span>
                <span>Active Relations: <strong className="text-[#282937] dark:text-white font-semibold">{edges.length}</strong></span>
              </div>
              <span className="text-[11px] text-[#58565e] dark:text-slate-400">
                Directional animated pulses show live multi-hop attack propagation from Source IP → Exploit Alert → Target Host.
              </span>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
