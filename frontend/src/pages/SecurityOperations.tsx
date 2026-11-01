import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert,
  AlertOctagon,
  AlertTriangle,
  AlertCircle,
  Info,
  Activity,
  Layers,
  Search,
  RefreshCw,
  Clock,
  ExternalLink,
  Copy,
  Check,
  Zap,
  Crosshair,
  Server,
  ArrowRight,
  Filter,
  Radio,
  FileText,
  ChevronRight,
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { DashboardShell } from "../components/layout/DashboardShell";
import { apiClient } from "../api/client";
import { useRealtimeUpdates } from "../hooks/useRealtimeUpdates";
import { useWorkspaceStore } from "../store/workspaceStore";
import { useTheme } from "../theme/ThemeProvider";
import type { Alert, Incident } from "../types/api";

const DARK_PALETTE = {
  surface: "rgba(255,255,255,0.025)",
  surfaceHover: "rgba(255,255,255,0.045)",
  border: "rgba(255,255,255,0.08)",
  borderHover: "rgba(58,160,255,0.32)",
  text: "#f8fafc",
  textSecondary: "#94a3b8",
  textMuted: "#64748b",
  primary: "#3aa0ff",
  primaryGlow: "#5fc2ff",
  hairline: "rgba(255,255,255,0.18)",
  panelShadow: "rgba(0,0,0,0.75)",
  shadowGlow: "rgba(58,160,255,0.15)",
};

const LIGHT_PALETTE = {
  surface: "#FFFFFF",
  surfaceHover: "#FEFBF4",
  border: "#E2D9CC",
  borderHover: "rgba(250,135,117,0.50)",
  text: "#282937",
  textSecondary: "#4A4B5E",
  textMuted: "#58565E",
  primary: "#282937",
  primaryGlow: "#FA8775",
  hairline: "rgba(40,41,55,0.08)",
  panelShadow: "rgba(40,41,55,0.07)",
  shadowGlow: "rgba(250,135,117,0.15)",
};

type Palette = typeof DARK_PALETTE;

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
  },
};

function getSeverityBadge(sev: string) {
  switch (sev?.toLowerCase()) {
    case "critical":
      return {
        badge: "bg-red-500/15 text-red-400 border-red-500/35",
        accent: "#ef4444",
        icon: AlertOctagon,
      };
    case "high":
      return {
        badge: "bg-orange-500/15 text-orange-400 border-orange-500/35",
        accent: "#f97316",
        icon: AlertTriangle,
      };
    case "medium":
      return {
        badge: "bg-amber-500/15 text-amber-400 border-amber-500/35",
        accent: "#f59e0b",
        icon: AlertCircle,
      };
    default:
      return {
        badge: "bg-sky-500/15 text-sky-400 border-sky-500/35",
        accent: "#38bdf8",
        icon: Info,
      };
  }
}

function formatRelativeTime(dateString: string) {
  const diffSec = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (diffSec < 5) return "Just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return new Date(dateString).toLocaleDateString([], { month: "short", day: "numeric" });
}

export function SecurityOperations() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const palette: Palette = isDark ? DARK_PALETTE : LIGHT_PALETTE;
  const navigate = useNavigate();

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<"all" | "critical" | "high">("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { updates, connected } = useRealtimeUpdates();
  const { scope, selectedHost } = useWorkspaceStore();

  async function loadData() {
    setLoading(true);
    setError(null);
    const baseParams: Record<string, any> = { limit: 100, scope };
    if (selectedHost) {
      baseParams.host = selectedHost;
    }

    const [alertsResult, incidentsResult] = await Promise.allSettled([
      apiClient.get("/api/alerts", { params: baseParams }),
      apiClient.get("/api/incidents", { params: baseParams }),
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
      setError("Unable to connect to the SentinelX security telemetry pipeline.");
    }
    setLoading(false);
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, selectedHost]);

  // Re-fetch when real-time socket events arrive
  useEffect(() => {
    if (updates.length > 0) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updates.length]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered lists
  const filteredAlerts = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return alerts.filter((al) => {
      if (severityFilter === "critical" && al.severity !== "critical") return false;
      if (severityFilter === "high" && al.severity !== "high" && al.severity !== "critical") return false;
      return (
        !q ||
        al.rule_name?.toLowerCase().includes(q) ||
        al.mitre_technique?.toLowerCase().includes(q) ||
        al.source_ip?.toLowerCase().includes(q) ||
        al.destination_ip?.toLowerCase().includes(q) ||
        al.hostname?.toLowerCase().includes(q) ||
        al.id?.toLowerCase().includes(q)
      );
    });
  }, [alerts, searchQuery, severityFilter]);

  const filteredIncidents = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return incidents.filter((inc) => {
      if (severityFilter === "critical" && inc.severity !== "critical") return false;
      if (severityFilter === "high" && inc.severity !== "high" && inc.severity !== "critical") return false;
      return (
        !q ||
        inc.title?.toLowerCase().includes(q) ||
        inc.status?.toLowerCase().includes(q) ||
        inc.severity?.toLowerCase().includes(q) ||
        inc.id?.toLowerCase().includes(q)
      );
    });
  }, [incidents, searchQuery, severityFilter]);

  // KPI Calculations
  const criticalCount = useMemo(() => {
    return alerts.filter((a) => a.severity === "critical").length;
  }, [alerts]);

  const highCount = useMemo(() => {
    return alerts.filter((a) => a.severity === "high").length;
  }, [alerts]);

  const openIncidentsCount = useMemo(() => {
    return incidents.filter((i) => i.status === "open" || i.status === "investigating").length;
  }, [incidents]);

  return (
    <DashboardShell>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        {/* Header Bar */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 border-[#e2d9cc] dark:border-slate-800"
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-mono uppercase tracking-widest text-emerald-400 font-semibold">
                Tactical Operations // SOC Command Deck
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#282937] dark:text-white">
              Security Operations Center
            </h1>
            <p className="mt-0.5 text-xs text-[#58565e] dark:text-slate-400">
              Correlated attack chains (PostgreSQL) and real-time telemetry alerts (MongoDB) in unified split-view.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold border ${
                connected
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : "bg-slate-500/10 text-slate-400 border-slate-500/30"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-400 animate-ping" : "bg-slate-500"}`}
              />
              {connected ? "LIVE SOCKET ACTIVE" : "STREAM STANDBY"}
            </span>

            <button
              type="button"
              onClick={loadData}
              title="Refresh security operations feed"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#e2d9cc] dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 hover:text-[#282937] dark:hover:text-white transition-colors cursor-pointer shadow-xs"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </motion.div>

        {/* Polished Compact Bento Metric Capsules */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {/* Capsule 1: Correlated Incidents */}
          <div
            className="group relative overflow-hidden rounded-2xl border p-3.5 backdrop-blur-xl transition-all duration-300 hover:border-blue-500/40 hover:shadow-lg"
            style={{
              backgroundColor: isDark ? "rgba(59, 130, 246, 0.03)" : "#FFFFFF",
              borderColor: isDark ? "rgba(255, 255, 255, 0.08)" : "#E2D9CC",
            }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-blue-600 dark:text-blue-400">
                Attack Chains
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20 text-sx-blue">
                <Layers size={13} />
              </div>
            </div>
            <div className="text-xl font-mono font-bold text-[#282937] dark:text-white">
              {incidents.length}
            </div>
            <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
              <span>Correlated Incidents</span>
              <span className="text-sx-blue font-semibold">{openIncidentsCount} Open</span>
            </div>
          </div>

          {/* Capsule 2: Live Telemetry Stream */}
          <div
            className="group relative overflow-hidden rounded-2xl border p-3.5 backdrop-blur-xl transition-all duration-300 hover:border-cyan-500/40 hover:shadow-lg"
            style={{
              backgroundColor: isDark ? "rgba(6, 182, 212, 0.03)" : "#FFFFFF",
              borderColor: isDark ? "rgba(255, 255, 255, 0.08)" : "#E2D9CC",
            }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-cyan-600 dark:text-cyan-400">
                Telemetry Alerts
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <Activity size={13} />
              </div>
            </div>
            <div className="text-xl font-mono font-bold text-[#282937] dark:text-white">
              {alerts.length}
            </div>
            <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
              <span>Ingested Events</span>
              <span className="text-cyan-400 font-semibold">MongoDB</span>
            </div>
          </div>

          {/* Capsule 3: Critical Triage */}
          <div
            className="group relative overflow-hidden rounded-2xl border p-3.5 backdrop-blur-xl transition-all duration-300 hover:border-red-500/40 hover:shadow-lg"
            style={{
              backgroundColor: isDark ? "rgba(239, 68, 68, 0.03)" : "#FFFFFF",
              borderColor: isDark ? "rgba(255, 255, 255, 0.08)" : "#E2D9CC",
            }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-red-600 dark:text-red-400">
                Critical &bull; High Triage
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
                <AlertOctagon size={13} />
              </div>
            </div>
            <div className="text-xl font-mono font-bold text-red-500 dark:text-red-400 flex items-center gap-1.5">
              <span>{criticalCount + highCount}</span>
              {(criticalCount > 0 || highCount > 0) && (
                <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
              )}
            </div>
            <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
              <span>Immediate Attention</span>
              <span className="text-red-400 font-semibold">{criticalCount} Critical</span>
            </div>
          </div>

          {/* Capsule 4: Fleet & Scope */}
          <div
            className="group relative overflow-hidden rounded-2xl border p-3.5 backdrop-blur-xl transition-all duration-300 hover:border-emerald-500/40 hover:shadow-lg"
            style={{
              backgroundColor: isDark ? "rgba(16, 185, 129, 0.03)" : "#FFFFFF",
              borderColor: isDark ? "rgba(255, 255, 255, 0.08)" : "#E2D9CC",
            }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-emerald-600 dark:text-emerald-400">
                Target Scope
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Server size={13} />
              </div>
            </div>
            <div className="text-base font-bold text-[#282937] dark:text-white truncate">
              {selectedHost || (scope === "personal" ? "Local Agent" : "Global Fleet")}
            </div>
            <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
              <span>Workspace Scope</span>
              <span className="text-emerald-500 font-semibold">{scope.toUpperCase()}</span>
            </div>
          </div>
        </div>

        {/* Global Filter and Search Bar */}
        <div
          className="rounded-2xl border p-3 backdrop-blur-xl"
          style={{
            backgroundColor: palette.surface,
            borderColor: palette.border,
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search size={14} />
              </div>
              <input
                type="text"
                placeholder="Search rule names, IPs, MITRE techniques, or incident titles across split stream..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-[#e2d9cc] dark:border-slate-800 bg-white dark:bg-black/40 pl-9 pr-4 py-2 text-xs text-[#282937] dark:text-white transition-colors focus:border-sx-blue focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto">
              {[
                { id: "all", label: "All Severities" },
                { id: "critical", label: `Critical Only (${criticalCount})` },
                { id: "high", label: `High & Critical (${criticalCount + highCount})` },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSeverityFilter(f.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    severityFilter === f.id
                      ? "bg-sx-blue text-black shadow-xs font-bold"
                      : "text-slate-500 hover:text-[#282937] dark:hover:text-white bg-black/5 dark:bg-white/5"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs flex items-center gap-2">
            <AlertOctagon size={15} />
            <span>{error}</span>
          </div>
        )}

        {/* SPLIT SCREEN DATA SECTION: Correlated Security Incidents (Left) + Realtime Telemetry (Right) */}
        {loading ? (
          <div className="flex h-56 flex-col items-center justify-center gap-3">
            <RefreshCw size={22} className="animate-spin text-sx-blue" />
            <span className="text-xs text-slate-400 font-mono">Correlating security telemetry stream...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
            {/* 1. LEFT COLUMN: Correlated Security Incidents */}
            <div
              className="relative overflow-hidden rounded-2xl border backdrop-blur-xl"
              style={{
                backgroundColor: palette.surface,
                borderColor: palette.border,
              }}
            >
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-px"
                style={{
                  background: `linear-gradient(to right, transparent, ${palette.hairline}, transparent)`,
                }}
              />
              {/* Header */}
              <div className="p-4 border-b border-[#e2d9cc] dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20 text-sx-blue">
                    <Layers size={14} />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-[#282937] dark:text-slate-200">
                      Correlated Incidents
                    </h2>
                    <span className="text-[10px] text-slate-500 font-mono">
                      PostgreSQL Multi-Stage Attack Chains
                    </span>
                  </div>
                </div>

                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-500/10 text-sx-blue border border-blue-500/25">
                  {filteredIncidents.length} Recorded
                </span>
              </div>

              {/* Incidents Feed */}
              <div className="p-3.5 space-y-2.5 max-h-[780px] overflow-y-auto">
                {filteredIncidents.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    No security incidents match the active search filter.
                  </div>
                ) : (
                  filteredIncidents.map((inc) => {
                    const badge = getSeverityBadge(inc.severity);
                    const SevIcon = badge.icon;
                    return (
                      <div
                        key={inc.id}
                        className="group relative overflow-hidden rounded-xl border p-3.5 transition-all duration-200 hover:border-slate-600/50 hover:shadow-md"
                        style={{
                          backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "#FFFFFF",
                          borderColor: isDark ? "rgba(255,255,255,0.07)" : "#E2D9CC",
                        }}
                      >
                        {/* Left severity indicator border */}
                        <div
                          className="absolute left-0 top-0 bottom-0 w-1"
                          style={{ backgroundColor: badge.accent }}
                        />

                        {/* Top Line: Severity + Status + Risk Score */}
                        <div className="flex items-center justify-between gap-2 mb-2 pl-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[10px] font-bold uppercase border ${badge.badge}`}
                            >
                              <SevIcon size={11} />
                              <span>{inc.severity}</span>
                            </span>

                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono capitalize bg-black/5 dark:bg-white/5 border border-[#e2d9cc] dark:border-slate-800 text-slate-600 dark:text-slate-300">
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  inc.status === "open"
                                    ? "bg-amber-400"
                                    : inc.status === "resolved"
                                    ? "bg-emerald-400"
                                    : "bg-cyan-400"
                                }`}
                              />
                              <span>{inc.status}</span>
                            </span>
                          </div>

                          {inc.risk_score !== null && (
                            <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/25">
                              Risk {inc.risk_score}/100
                            </span>
                          )}
                        </div>

                        {/* Incident Title */}
                        <h3 className="pl-1 text-xs font-semibold text-[#282937] dark:text-white line-clamp-2">
                          {inc.title}
                        </h3>

                        {/* Telemetry Strip & Actions */}
                        <div className="mt-2.5 pt-2 border-t border-[#e2d9cc] dark:border-slate-800/70 flex items-center justify-between text-[11px] font-mono text-slate-500 pl-1">
                          <div className="flex items-center gap-2">
                            <span className="text-cyan-500 dark:text-cyan-400 font-semibold">
                              {inc.alert_count} {inc.alert_count === 1 ? "alert" : "alerts"}
                            </span>
                            <span>&bull;</span>
                            <span>{formatRelativeTime(inc.updated_at)}</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleCopy(inc.id, inc.id)}
                              title="Copy Incident ID"
                              className="p-1 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
                            >
                              {copiedId === inc.id ? (
                                <Check size={12} className="text-emerald-400" />
                              ) : (
                                <Copy size={12} />
                              )}
                            </button>

                            <Link
                              to={`/investigation?incident_id=${inc.id}`}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-sx-blue/10 hover:bg-sx-blue/20 text-sx-blue border border-sx-blue/30 transition-colors"
                            >
                              <Crosshair size={11} />
                              <span>Investigate</span>
                            </Link>

                            <Link
                              to={`/dashboard?view=correlation&incident_id=${inc.id}`}
                              className="p-1 rounded text-slate-400 hover:text-white transition-colors"
                              title="View Attack Graph"
                            >
                              <ExternalLink size={12} />
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* 2. RIGHT COLUMN: Realtime Telemetry Alerts Feed */}
            <div
              className="relative overflow-hidden rounded-2xl border backdrop-blur-xl"
              style={{
                backgroundColor: palette.surface,
                borderColor: palette.border,
              }}
            >
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-px"
                style={{
                  background: `linear-gradient(to right, transparent, ${palette.hairline}, transparent)`,
                }}
              />
              {/* Header */}
              <div className="p-4 border-b border-[#e2d9cc] dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                    <Activity size={14} />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-[#282937] dark:text-slate-200">
                      Realtime Telemetry Stream
                    </h2>
                    <span className="text-[10px] text-slate-500 font-mono">
                      MongoDB Live Event Ingestion Engine
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/25">
                    {filteredAlerts.length} Events
                  </span>
                </div>
              </div>

              {/* Alerts Feed */}
              <div className="p-3.5 space-y-2.5 max-h-[780px] overflow-y-auto">
                {filteredAlerts.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    No telemetry alerts recorded for the active criteria.
                  </div>
                ) : (
                  filteredAlerts.map((a) => {
                    const badge = getSeverityBadge(a.severity);
                    const SevIcon = badge.icon;
                    return (
                      <div
                        key={a.id}
                        className="group relative overflow-hidden rounded-xl border p-3.5 transition-all duration-200 hover:border-slate-600/50 hover:shadow-md"
                        style={{
                          backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "#FFFFFF",
                          borderColor: isDark ? "rgba(255,255,255,0.07)" : "#E2D9CC",
                        }}
                      >
                        {/* Left severity indicator border */}
                        <div
                          className="absolute left-0 top-0 bottom-0 w-1"
                          style={{ backgroundColor: badge.accent }}
                        />

                        {/* Top Line: Severity + Host + Time */}
                        <div className="flex items-center justify-between gap-2 mb-1.5 pl-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[10px] font-bold uppercase border ${badge.badge}`}
                            >
                              <SevIcon size={11} />
                              <span>{a.severity}</span>
                            </span>

                            {a.hostname && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[10px] bg-black/5 dark:bg-white/5 border border-[#e2d9cc] dark:border-slate-800 text-cyan-500 dark:text-cyan-400 font-semibold">
                                <Server size={10} />
                                <span>{a.hostname}</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 text-[10px] font-mono text-slate-500">
                            <Clock size={10} />
                            <span>{formatRelativeTime(a.created_at)}</span>
                          </div>
                        </div>

                        {/* Alert Rule Name */}
                        <h3 className="pl-1 text-xs font-semibold text-[#282937] dark:text-white">
                          {a.rule_name || "Telemetry Alert Triggered"}
                        </h3>

                        {/* Vectors & MITRE ATT&CK */}
                        <div className="mt-2.5 pt-2 border-t border-[#e2d9cc] dark:border-slate-800/70 flex items-center justify-between gap-2 text-[11px] font-mono pl-1 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* MITRE Technique */}
                            {a.mitre_technique ? (
                              <Link
                                to={`/mitre-matrix?technique=${a.mitre_technique}`}
                                className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/10 border border-purple-500/25 text-purple-600 dark:text-purple-300 font-semibold hover:underline"
                              >
                                {a.mitre_technique}
                              </Link>
                            ) : (
                              <span className="text-[10px] text-slate-500 font-mono">T1059.001</span>
                            )}

                            {/* Network Vector */}
                            {a.source_ip || a.destination_ip ? (
                              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                <span className="text-[#282937] dark:text-slate-300 font-semibold">
                                  {a.source_ip || "0.0.0.0"}
                                </span>
                                <ArrowRight size={10} className="text-slate-500" />
                                <span className="text-[#282937] dark:text-slate-300 font-semibold">
                                  {a.destination_ip || "0.0.0.0"}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-500 italic">Internal Daemon Execution</span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleCopy(JSON.stringify(a, null, 2), a.id)}
                            title="Copy Alert JSON"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold text-slate-400 hover:text-white bg-black/5 dark:bg-white/5 border border-[#e2d9cc] dark:border-slate-800 transition-colors cursor-pointer"
                          >
                            {copiedId === a.id ? (
                              <>
                                <Check size={11} className="text-emerald-400" />
                                <span className="text-emerald-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy size={11} />
                                <span>JSON</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </DashboardShell>
  );
}
