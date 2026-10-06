import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Network,
  Layers,
  Crosshair,
  RefreshCw,
  Zap,
  X,
  ShieldAlert,
  Info,
  Maximize2
} from "lucide-react";
import { AttackGraph } from "./AttackGraph";
import {
  fetchGlobalCorrelationGraph,
  fetchIncidentCorrelationGraph,
  type GraphNode,
  type GraphEdge,
  type ChokePoint
} from "../../api/correlation";
import { apiClient } from "../../api/client";

interface GraphCorrelationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialIncidentId?: string;
}

export function GraphCorrelationModal({
  isOpen,
  onClose,
  initialIncidentId,
}: GraphCorrelationModalProps) {
  const [mode, setMode] = useState<"global" | "incident">(initialIncidentId ? "incident" : "global");
  const [incidentsList, setIncidentsList] = useState<{ id: string; title: string; severity: string }[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>(initialIncidentId || "");

  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [chokePoints, setChokePoints] = useState<ChokePoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  // Load incidents for selector
  useEffect(() => {
    if (!isOpen) return;

    async function loadIncidents() {
      try {
        const [incRes, casesRes] = await Promise.allSettled([
          apiClient.get<any>("/api/incidents?limit=50"),
          apiClient.get<any[]>("/api/cases"),
        ]);

        const list: { id: string; title: string; severity: string }[] = [];

        if (incRes.status === "fulfilled" && incRes.value.data?.items) {
          incRes.value.data.items.forEach((inc: any) => {
            list.push({
              id: inc.id,
              title: inc.title || `Incident ${inc.id.slice(0, 8)}`,
              severity: inc.severity || "high",
            });
          });
        }

        if (casesRes.status === "fulfilled" && casesRes.value.data) {
          casesRes.value.data.forEach((c: any) => {
            const incId = c.incident_id || c.id;
            if (!list.some((item) => item.id === incId)) {
              list.push({
                id: incId,
                title: c.title,
                severity: c.severity || "medium",
              });
            }
          });
        }

        setIncidentsList(list);
        if (!selectedIncidentId && list.length > 0) {
          setSelectedIncidentId(list[0].id);
        }
      } catch (e) {
        console.error("Failed to load incidents list", e);
      }
    }
    loadIncidents();
  }, [isOpen]);

  // Fetch graph data
  async function loadGraphData() {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    try {
      if (mode === "global") {
        const res = await fetchGlobalCorrelationGraph(25);
        setNodes(res.nodes);
        setEdges(res.edges);
        setChokePoints([]);
      } else {
        const targetId = selectedIncidentId || incidentsList[0]?.id;
        if (targetId) {
          const res = await fetchIncidentCorrelationGraph(targetId);
          setNodes(res.nodes);
          setEdges(res.edges);
          setChokePoints(res.summary.choke_points || []);
        } else {
          setNodes([]);
          setEdges([]);
        }
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to load correlation graph data.");
      setNodes([]);
      setEdges([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadGraphData();
    }
  }, [isOpen, mode, selectedIncidentId]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-xl"
          />

          {/* Modal Container */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Graph Correlation Insights"
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex h-full max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-cyan-500/30 bg-[#060b16]/98 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.95)]"
          >
            {/* Ambient Background Glows */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute -top-32 -left-32 h-[420px] w-[420px] rounded-full bg-cyan-500/15 blur-[130px]" />
              <div className="absolute -bottom-32 -right-32 h-[420px] w-[420px] rounded-full bg-indigo-500/10 blur-[130px]" />
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />
            </div>

            {/* Modal Header */}
            <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] px-6 py-4.5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                  <Network size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                      Graph Correlation Insights
                    </h2>
                    <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-mono text-cyan-300 border border-cyan-500/30">
                      Phase 11 Engine
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Multi-hop threat entity relations, attack paths &amp; pivot choke points
                  </p>
                </div>
              </div>

              {/* Header Right Actions */}
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={loadGraphData}
                  disabled={loading}
                  title="Refresh Graph"
                  className="flex items-center gap-1.5 rounded-xl border border-slate-700/80 bg-slate-900/90 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <RefreshCw size={13} className={loading ? "animate-spin text-cyan-400" : ""} />
                  <span>Refresh</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close modal"
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* View Switcher & Incident Filter Bar */}
            <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-white/[0.06] bg-[#090e1a]/60 px-6 py-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMode("global")}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    mode === "global"
                      ? "bg-cyan-500 text-[#04101a] shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                      : "bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800"
                  }`}
                >
                  <Layers size={13} />
                  <span>Global Threat Clusters</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode("incident")}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    mode === "incident"
                      ? "bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                      : "bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800"
                  }`}
                >
                  <Crosshair size={13} />
                  <span>Incident Sub-Graph</span>
                </button>
              </div>

              {mode === "incident" && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-medium whitespace-nowrap">Target Incident:</span>
                  <select
                    value={selectedIncidentId}
                    onChange={(e) => setSelectedIncidentId(e.target.value)}
                    className="max-w-xs truncate rounded-xl border border-slate-700 bg-slate-900/90 px-3 py-1.5 text-xs text-slate-200 focus:border-purple-400 focus:outline-none"
                  >
                    {incidentsList.map((inc) => (
                      <option key={inc.id} value={inc.id}>
                        [{inc.severity.toUpperCase()}] {inc.title}
                      </option>
                    ))}
                    {incidentsList.length === 0 && (
                      <option value="">No active incidents found</option>
                    )}
                  </select>
                </div>
              )}
            </div>

            {/* Modal Body / Graph Workspace */}
            <div className="relative flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {/* Choke Points / Pivot Highlights (if incident mode has choke points) */}
              {chokePoints.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/25 via-slate-900/50 to-slate-900/25 p-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                      <Zap size={16} />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                        Identified Attack Choke Points
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Critical high-degree entities connecting multi-hop attack vectors
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {chokePoints.map((cp) => (
                      <div
                        key={cp.id}
                        className="flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-slate-900/90 px-3 py-1 text-xs"
                      >
                        <span className="font-mono font-bold text-cyan-300">{cp.label}</span>
                        <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-bold text-cyan-400">
                          {cp.degree} Links
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Main Graph Visualization */}
              {loading ? (
                <div className="flex h-[460px] flex-col items-center justify-center gap-3 rounded-2xl border border-slate-800 bg-[#070b14]">
                  <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
                  <p className="text-xs text-slate-400 font-mono">Building multi-hop entity graph...</p>
                </div>
              ) : error ? (
                <div className="flex h-[460px] flex-col items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/10 p-8 text-center text-rose-300">
                  <ShieldAlert size={32} className="mb-2 text-rose-400" />
                  <p className="text-sm font-semibold">{error}</p>
                </div>
              ) : nodes.length === 0 ? (
                <div className="flex h-[460px] flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/60 p-12 text-center text-slate-400">
                  <Info size={32} className="mb-2 text-slate-500" />
                  <p className="text-sm font-medium text-slate-300">No correlated entities in this view yet</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Ingest telemetry or run detection rules to automatically establish multi-hop correlation links.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="overflow-hidden rounded-2xl border border-slate-800/80 bg-[#070b14]">
                    <AttackGraph nodes={nodes} edges={edges} height={480} />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer / Stats & Guide */}
            <div className="relative flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] bg-[#070c18] px-6 py-3 text-xs font-mono text-slate-400">
              <div className="flex items-center gap-4">
                <span>
                  Correlated Entities: <strong className="text-white font-semibold">{nodes.length}</strong>
                </span>
                <span>
                  Active Relations: <strong className="text-white font-semibold">{edges.length}</strong>
                </span>
              </div>
              <span className="text-[11px] text-slate-500 hidden sm:inline">
                Interactive: Click any node to inspect attributes &amp; MITRE tags. Drag to manipulate topology.
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
