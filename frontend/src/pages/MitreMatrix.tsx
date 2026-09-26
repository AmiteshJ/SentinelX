import { useEffect, useState, useMemo } from "react";
import {
  Compass,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Search,
  Filter,
  Layers,
  ExternalLink,
  ChevronRight,
  Info,
  CheckCircle2,
  XCircle,
  Flame,
  ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardShell } from "../components/layout/DashboardShell";
import { fetchMitreMatrix, fetchTechniqueDetails, type MitreMatrixResponse, type MitreTechnique, type MitreTechniqueDetail } from "../api/mitre";

export function MitreMatrix() {
  const [data, setData] = useState<MitreMatrixResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active_alerts" | "covered" | "uncovered_gap">("all");

  // Selected technique for side drawer
  const [selectedTechId, setSelectedTechId] = useState<string | null>(null);
  const [techDetail, setTechDetail] = useState<MitreTechniqueDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    async function loadMatrix() {
      setLoading(true);
      setError(null);
      try {
        const matrix = await fetchMitreMatrix();
        setData(matrix);
      } catch (err: any) {
        setError(err?.response?.data?.detail || "Failed to load MITRE ATT&CK matrix.");
      } finally {
        setLoading(false);
      }
    }
    loadMatrix();
  }, []);

  // Fetch technique details when selected
  useEffect(() => {
    if (!selectedTechId) {
      setTechDetail(null);
      return;
    }
    async function loadDetail() {
      setDetailLoading(true);
      try {
        const res = await fetchTechniqueDetails(selectedTechId!);
        setTechDetail(res);
      } catch (e) {
        console.error("Failed to load technique detail", e);
      } finally {
        setDetailLoading(false);
      }
    }
    loadDetail();
  }, [selectedTechId]);

  // Filter techniques within each tactic
  const filteredTactics = useMemo(() => {
    if (!data) return [];
    return data.tactics.map((tactic) => {
      const filteredTechniques = tactic.techniques.filter((tech) => {
        // Status filter
        if (statusFilter !== "all" && tech.status !== statusFilter) {
          return false;
        }
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return tech.id.toLowerCase().includes(q) || tech.name.toLowerCase().includes(q) || tech.description.toLowerCase().includes(q);
        }
        return true;
      });
      return { ...tactic, techniques: filteredTechniques };
    });
  }, [data, searchQuery, statusFilter]);

  return (
    <DashboardShell>
      <div className="space-y-6 pb-12">
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-[#0d1527] via-[#09101f] to-[#060a14] border border-slate-800/80 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-sx-blue/10 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="relative z-10 space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sx-blue/10 border border-sx-blue/30 text-sx-blue text-xs font-semibold">
              <Compass size={14} className="text-sx-blue animate-spin-slow" />
              MITRE ATT&amp;CK Matrix Navigator
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Enterprise Tactics &amp; Detection Coverage Heatmap
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
              Inspect active Sigma rule coverage, detect defensive visibility gaps, and trace live triggered alerts mapped to MITRE ATT&amp;CK tactics.
            </p>
          </div>

          {/* Quick Metrics */}
          {data?.summary && (
            <div className="relative z-10 flex flex-wrap items-center gap-3">
              <div className="px-4 py-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-center min-w-[110px]">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Rule Coverage</span>
                <p className="text-xl font-bold text-emerald-400">{data.summary.coverage_percentage}%</p>
                <span className="text-[10px] text-slate-500">{data.summary.covered_techniques} / {data.summary.total_techniques} Techs</span>
              </div>

              <div className="px-4 py-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-center min-w-[110px]">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Active Detections</span>
                <p className="text-xl font-bold text-rose-400 flex items-center justify-center gap-1">
                  <Flame size={18} className="text-rose-400 animate-pulse" />
                  {data.summary.active_alerts_techniques}
                </p>
                <span className="text-[10px] text-slate-500">Live Exploited</span>
              </div>

              <div className="px-4 py-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-center min-w-[110px]">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Coverage Gaps</span>
                <p className="text-xl font-bold text-amber-400">{data.summary.uncovered_gaps}</p>
                <span className="text-[10px] text-slate-500">Uncovered Techs</span>
              </div>
            </div>
          )}
        </div>

        {/* Toolbar & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#090e1a]/80 border border-slate-800/80 backdrop-blur-md">
          {/* Search box */}
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by ID (e.g. T1059) or technique name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900/90 border border-slate-700/70 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sx-blue/30 focus:border-sx-blue"
            />
          </div>

          {/* Status Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                statusFilter === "all"
                  ? "bg-sx-blue text-[#060a14] shadow-[0_0_15px_rgba(58,160,255,0.3)]"
                  : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              All Techniques
            </button>
            <button
              onClick={() => setStatusFilter("active_alerts")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
                statusFilter === "active_alerts"
                  ? "bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)]"
                  : "bg-slate-900 text-rose-400 hover:text-white border border-slate-800"
              }`}
            >
              <Flame size={13} />
              Active Detections
            </button>
            <button
              onClick={() => setStatusFilter("covered")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
                statusFilter === "covered"
                  ? "bg-emerald-500 text-[#060a14] shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                  : "bg-slate-900 text-emerald-400 hover:text-white border border-slate-800"
              }`}
            >
              <ShieldCheck size={13} />
              Rule Covered
            </button>
            <button
              onClick={() => setStatusFilter("uncovered_gap")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
                statusFilter === "uncovered_gap"
                  ? "bg-amber-500 text-[#060a14] shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                  : "bg-slate-900 text-amber-400 hover:text-white border border-slate-800"
              }`}
            >
              <AlertTriangle size={13} />
              Coverage Gaps
            </button>
          </div>
        </div>

        {/* Matrix Grid Container */}
        {loading ? (
          <div className="py-24 text-center space-y-3">
            <div className="w-10 h-10 border-2 border-sx-blue border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-slate-400">Compiling MITRE ATT&amp;CK matrix &amp; real-time telemetry coverage...</p>
          </div>
        ) : error ? (
          <div className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-center">
            {error}
          </div>
        ) : (
          <div className="overflow-x-auto pb-6">
            <div className="inline-flex gap-3 min-w-full items-start">
              {filteredTactics.map((tactic) => (
                <div
                  key={tactic.id}
                  className="w-64 shrink-0 rounded-2xl bg-[#090d18] border border-slate-800/90 overflow-hidden shadow-xl flex flex-col"
                >
                  {/* Tactic Column Header */}
                  <div className="p-3.5 bg-gradient-to-b from-[#11192b] to-[#0c1220] border-b border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-sx-blue uppercase">{tactic.id}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-400 font-mono">
                        {tactic.techniques.length}
                      </span>
                    </div>
                    <h3 className="text-xs font-bold text-slate-100 mt-1 truncate">{tactic.name}</h3>
                  </div>

                  {/* Techniques Stack */}
                  <div className="p-2 space-y-2 max-h-[620px] overflow-y-auto">
                    {tactic.techniques.length === 0 ? (
                      <div className="py-8 text-center text-[11px] text-slate-500 italic">
                        No matching techniques
                      </div>
                    ) : (
                      tactic.techniques.map((tech) => {
                        const isSelected = selectedTechId === tech.id;
                        return (
                          <motion.button
                            key={tech.id}
                            onClick={() => setSelectedTechId(tech.id)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={`w-full text-left p-3 rounded-xl transition-all border relative overflow-hidden group ${
                              isSelected
                                ? "bg-sx-blue/15 border-sx-blue shadow-[0_0_15px_rgba(58,160,255,0.25)]"
                                : tech.status === "active_alerts"
                                ? "bg-gradient-to-br from-rose-950/40 via-[#180d15] to-[#120a10] border-rose-500/50 hover:border-rose-400"
                                : tech.status === "covered"
                                ? "bg-gradient-to-br from-emerald-950/30 via-[#0d191c] to-[#091316] border-emerald-500/40 hover:border-emerald-400"
                                : "bg-slate-900/60 border-slate-800/80 hover:border-slate-700"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1.5">
                              <span className="text-[10px] font-mono font-bold text-slate-400 group-hover:text-sx-blue transition-colors">
                                {tech.id}
                              </span>
                              {tech.status === "active_alerts" && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-[9px] font-bold border border-rose-500/40 animate-pulse">
                                  <Flame size={10} />
                                  {tech.alert_count} alert{tech.alert_count > 1 ? "s" : ""}
                                </span>
                              )}
                              {tech.status === "covered" && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-semibold border border-emerald-500/40">
                                  {tech.rules_count} rule{tech.rules_count > 1 ? "s" : ""}
                                </span>
                              )}
                              {tech.status === "uncovered_gap" && (
                                <span className="text-[9px] text-amber-500/80 font-mono">GAP</span>
                              )}
                            </div>

                            <p className="text-xs font-semibold text-slate-200 mt-1 line-clamp-2 leading-snug">
                              {tech.name}
                            </p>
                          </motion.button>
                        );
                      })
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Technique Detail Slide-out Modal / Drawer */}
        <AnimatePresence>
          {selectedTechId && (
            <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm p-4 sm:p-6">
              <motion.div
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 40 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="w-full max-w-xl h-full max-h-[90vh] bg-[#0c1322] border border-slate-700/80 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
              >
                {/* Drawer Header */}
                <div className="p-6 bg-gradient-to-b from-[#131c31] to-[#0c1322] border-b border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-sx-blue/20 text-sx-blue border border-sx-blue/30">
                        {selectedTechId}
                      </span>
                      {techDetail?.tactic && (
                        <span className="text-xs text-slate-400">
                          {techDetail.tactic.name} ({techDetail.tactic.id})
                        </span>
                      )}
                    </div>
                    <h2 className="text-lg font-bold text-white mt-1.5">{techDetail?.name || "Loading..."}</h2>
                  </div>
                  <button
                    onClick={() => setSelectedTechId(null)}
                    className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
                  >
                    ✕
                  </button>
                </div>

                {/* Drawer Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {detailLoading || !techDetail ? (
                    <div className="py-20 text-center">
                      <div className="w-8 h-8 border-2 border-sx-blue border-t-transparent rounded-full animate-spin mx-auto" />
                    </div>
                  ) : (
                    <>
                      {/* Description */}
                      <div className="space-y-1.5">
                        <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400">Technique Overview</span>
                        <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800/80">
                          {techDetail.description}
                        </p>
                      </div>

                      {/* Platform & Data Sources */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
                          <span className="text-[10px] uppercase font-bold text-slate-400">Platforms</span>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {techDetail.platforms.map((p) => (
                              <span key={p} className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                                {p}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
                          <span className="text-[10px] uppercase font-bold text-slate-400">Data Sources</span>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {techDetail.data_sources.map((ds) => (
                              <span key={ds} className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                                {ds}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Associated Active Detection Rules */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400">
                            Mapped SentinelX Detection Rules ({techDetail.rules.length})
                          </span>
                          <span className={techDetail.rules.length > 0 ? "text-emerald-400 text-xs font-semibold" : "text-amber-400 text-xs font-semibold"}>
                            {techDetail.rules.length > 0 ? "Protected" : "Detection Gap"}
                          </span>
                        </div>

                        {techDetail.rules.length === 0 ? (
                          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400 flex items-start gap-2.5">
                            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                            <div>
                              <p className="font-semibold">No active Sigma rules mapped to this technique</p>
                              <p className="text-[11px] text-amber-400/80 mt-0.5">
                                Consider authoring a new Sigma rule in Detection Engineering to cover this attack vector.
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {techDetail.rules.map((rule) => (
                              <div
                                key={rule.rule_id}
                                className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-start justify-between gap-3"
                              >
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-white">{rule.name}</span>
                                    <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-bold ${
                                      rule.severity === "critical" ? "bg-red-500/20 text-red-400" :
                                      rule.severity === "high" ? "bg-orange-500/20 text-orange-400" :
                                      "bg-blue-500/20 text-blue-400"
                                    }`}>
                                      {rule.severity}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-400 mt-1">{rule.description || "Active production detection rule"}</p>
                                </div>
                                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                  ACTIVE
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Recent Live Alerts */}
                      {techDetail.recent_alerts.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-[11px] uppercase font-bold tracking-wider text-rose-400 flex items-center gap-1.5">
                            <Flame size={14} />
                            Recent Triggered Alerts ({techDetail.recent_alerts.length})
                          </span>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {techDetail.recent_alerts.map((alert: any) => (
                              <div
                                key={alert.id}
                                className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/30 text-xs flex items-center justify-between"
                              >
                                <div>
                                  <span className="font-semibold text-rose-200">{alert.rule_name || "Triggered Detection"}</span>
                                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                    Src: {alert.source_ip || "host"} → Dst: {alert.destination_ip || "external"}
                                  </p>
                                </div>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {new Date(alert.created_at).toLocaleTimeString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Mitigations */}
                      <div className="space-y-2">
                        <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400">
                          Recommended Defensive Mitigations
                        </span>
                        <div className="space-y-1.5">
                          {techDetail.mitigations.map((m, i) => (
                            <div key={i} className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/60 text-xs text-slate-300">
                              <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                              <span>{m}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Drawer Footer */}
                <div className="p-4 bg-slate-900/80 border-t border-slate-800 flex items-center justify-between">
                  <a
                    href={`https://attack.mitre.org/techniques/${selectedTechId.replace(".", "/")}/`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-sx-blue hover:text-sx-blue-glow font-semibold hover:underline"
                  >
                    View Official MITRE ATT&amp;CK Page
                    <ExternalLink size={12} />
                  </a>
                  <button
                    onClick={() => setSelectedTechId(null)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white rounded-xl transition-colors"
                  >
                    Done
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </DashboardShell>
  );
}
