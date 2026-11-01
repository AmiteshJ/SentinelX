import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert,
  ShieldCheck,
  FileText,
  Search,
  Filter,
  RefreshCw,
  Copy,
  Check,
  Lock,
  User,
  Clock,
  ChevronDown,
  ChevronUp,
  Database,
  KeyRound,
  Calendar,
  Layers,
  Terminal,
  Hash,
  ExternalLink,
} from "lucide-react";
import { DashboardShell } from "../components/layout/DashboardShell";
import { apiClient } from "../api/client";
import { useTheme } from "../theme/ThemeProvider";
import type { AuditLogEntry } from "../types/api";

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

function Panel({
  children,
  className = "",
  glowOnHover = true,
  palette,
}: {
  children: React.ReactNode;
  className?: string;
  glowOnHover?: boolean;
  palette: Palette;
}) {
  return (
    <motion.div
      variants={itemVariants}
      whileHover={
        glowOnHover
          ? {
              borderColor: palette.borderHover,
              backgroundColor: palette.surfaceHover,
              boxShadow: `0 20px 60px -20px ${palette.shadowGlow}`,
            }
          : undefined
      }
      style={{
        backgroundColor: palette.surface,
        borderColor: palette.border,
      }}
      className={`relative overflow-hidden rounded-2xl border backdrop-blur-xl transition-all duration-300 ${className}`}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background: `linear-gradient(to right, transparent, ${palette.hairline}, transparent)`,
        }}
      />
      {children}
    </motion.div>
  );
}

function getActionMeta(action: string) {
  const lower = action.toLowerCase();
  if (lower.includes("login") || lower.includes("auth") || lower.includes("oauth")) {
    return {
      badge: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
      accent: "#38bdf8",
      category: "Authentication",
    };
  }
  if (lower.includes("register") || lower.includes("verify") || lower.includes("create")) {
    return {
      badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      accent: "#34d399",
      category: "Account & Identity",
    };
  }
  if (lower.includes("delete") || lower.includes("remove") || lower.includes("kill") || lower.includes("revoke")) {
    return {
      badge: "bg-red-500/15 text-red-400 border-red-500/30",
      accent: "#f87171",
      category: "Destructive Action",
    };
  }
  if (lower.includes("update") || lower.includes("edit") || lower.includes("modify") || lower.includes("policy")) {
    return {
      badge: "bg-amber-500/15 text-amber-400 border-amber-500/30",
      accent: "#fbbf24",
      category: "Configuration Change",
    };
  }
  return {
    badge: "bg-purple-500/15 text-purple-300 border-purple-500/30",
    accent: "#c084fc",
    category: "System Operation",
  };
}

function formatDateGroup(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const entryDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const diffTime = today.getTime() - entryDate.getTime();
  const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

  const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

  let relative = "";
  if (diffDays === 0) relative = "Today";
  else if (diffDays === 1) relative = "Yesterday";
  else if (diffDays > 1 && diffDays < 7) relative = `${diffDays} days ago`;
  else relative = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });

  const formattedDate = date.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return { key, formattedDate, relative };
}

export function AuditLogs() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const palette: Palette = isDark ? DARK_PALETTE : LIGHT_PALETTE;

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<AuditLogEntry[]>("/api/audit/logs?limit=100");
      setLogs(res.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Admin role required to view audit logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter logs by search and category
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        log.action?.toLowerCase().includes(q) ||
        log.user_id?.toLowerCase().includes(q) ||
        log.resource_type?.toLowerCase().includes(q) ||
        log.resource_id?.toLowerCase().includes(q) ||
        log.id?.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (selectedCategory === "all") return true;
      if (selectedCategory === "auth") {
        const lower = log.action.toLowerCase();
        return (
          lower.includes("login") ||
          lower.includes("register") ||
          lower.includes("verify") ||
          lower.includes("auth") ||
          lower.includes("oauth")
        );
      }
      if (selectedCategory === "resource") {
        return !!log.resource_type;
      }
      return true;
    });
  }, [logs, searchQuery, selectedCategory]);

  // Group logs date-wise
  const dateGroupedLogs = useMemo(() => {
    const map = new Map<
      string,
      { formattedDate: string; relative: string; entries: AuditLogEntry[] }
    >();

    for (const log of filteredLogs) {
      const { key, formattedDate, relative } = formatDateGroup(log.created_at);
      if (!map.has(key)) {
        map.set(key, { formattedDate, relative, entries: [] });
      }
      map.get(key)!.entries.push(log);
    }

    return Array.from(map.entries()).map(([key, data]) => ({
      key,
      ...data,
    }));
  }, [filteredLogs]);

  // Statistics
  const uniqueUsers = useMemo(() => {
    const set = new Set(logs.map((l) => l.user_id).filter(Boolean));
    return set.size;
  }, [logs]);

  const authEventsCount = useMemo(() => {
    return logs.filter((l) => {
      const a = l.action.toLowerCase();
      return a.includes("auth") || a.includes("login") || a.includes("verify") || a.includes("register");
    }).length;
  }, [logs]);

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
              <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-[11px] font-mono uppercase tracking-widest text-cyan-400 font-semibold">
                Audit Trail // Cryptographic Non-Repudiation
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#282937] dark:text-white">
              Tamper-Evident Audit Logs
            </h1>
            <p className="mt-0.5 text-xs text-[#58565e] dark:text-slate-400">
              Cryptographically verified, immutable record of security-critical actions and operator sessions.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck size={13} className="text-emerald-400" />
              <span>SHA-256 SECURED</span>
            </span>

            <button
              type="button"
              onClick={fetchLogs}
              title="Refresh audit log entries"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#e2d9cc] dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 hover:text-[#282937] dark:hover:text-white transition-colors cursor-pointer shadow-xs"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </motion.div>

        {/* Polished Compact Bento Metric Capsules */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {/* Bento Capsule 1 */}
          <div
            className="group relative overflow-hidden rounded-2xl border p-3.5 backdrop-blur-xl transition-all duration-300 hover:border-cyan-500/40 hover:shadow-lg"
            style={{
              backgroundColor: isDark ? "rgba(6, 182, 212, 0.03)" : "#FFFFFF",
              borderColor: isDark ? "rgba(255, 255, 255, 0.08)" : "#E2D9CC",
            }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-cyan-600 dark:text-cyan-400">
                Audit Ledger
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <Database size={13} />
              </div>
            </div>
            <div className="text-xl font-mono font-bold text-[#282937] dark:text-white">
              {logs.length}
            </div>
            <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
              <span>Retained Records</span>
              <span className="text-cyan-500 font-semibold">PostgreSQL</span>
            </div>
          </div>

          {/* Bento Capsule 2 */}
          <div
            className="group relative overflow-hidden rounded-2xl border p-3.5 backdrop-blur-xl transition-all duration-300 hover:border-emerald-500/40 hover:shadow-lg"
            style={{
              backgroundColor: isDark ? "rgba(16, 185, 129, 0.03)" : "#FFFFFF",
              borderColor: isDark ? "rgba(255, 255, 255, 0.08)" : "#E2D9CC",
            }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-emerald-600 dark:text-emerald-400">
                Auth &amp; Identity
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <KeyRound size={13} />
              </div>
            </div>
            <div className="text-xl font-mono font-bold text-emerald-600 dark:text-emerald-400">
              {authEventsCount}
            </div>
            <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
              <span>Logins, OTP &amp; OAuth</span>
              <span className="text-emerald-500 font-semibold">Active</span>
            </div>
          </div>

          {/* Bento Capsule 3 */}
          <div
            className="group relative overflow-hidden rounded-2xl border p-3.5 backdrop-blur-xl transition-all duration-300 hover:border-purple-500/40 hover:shadow-lg"
            style={{
              backgroundColor: isDark ? "rgba(168, 85, 247, 0.03)" : "#FFFFFF",
              borderColor: isDark ? "rgba(255, 255, 255, 0.08)" : "#E2D9CC",
            }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-purple-600 dark:text-purple-400">
                Security Actors
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
                <User size={13} />
              </div>
            </div>
            <div className="text-xl font-mono font-bold text-purple-600 dark:text-purple-300">
              {uniqueUsers}
            </div>
            <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
              <span>Unique Operators</span>
              <span className="text-purple-400 font-semibold">Tracked</span>
            </div>
          </div>

          {/* Bento Capsule 4 */}
          <div
            className="group relative overflow-hidden rounded-2xl border p-3.5 backdrop-blur-xl transition-all duration-300 hover:border-blue-500/40 hover:shadow-lg"
            style={{
              backgroundColor: isDark ? "rgba(59, 130, 246, 0.03)" : "#FFFFFF",
              borderColor: isDark ? "rgba(255, 255, 255, 0.08)" : "#E2D9CC",
            }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-blue-600 dark:text-blue-400">
                Chain of Custody
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
                <ShieldCheck size={13} />
              </div>
            </div>
            <div className="text-base font-bold text-sx-blue flex items-center gap-1.5 mt-0.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Immutable</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
              <span>Append-Only</span>
              <span className="text-sx-blue font-semibold">Protected</span>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
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
                placeholder="Search audit actions, user UUIDs, log IDs, or resources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-[#e2d9cc] dark:border-slate-800 bg-white dark:bg-black/40 pl-9 pr-4 py-2 text-xs text-[#282937] dark:text-white transition-colors focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto">
              {[
                { id: "all", label: `All Events (${logs.length})` },
                { id: "auth", label: `Authentication (${authEventsCount})` },
                { id: "resource", label: "Targeted Resources" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    selectedCategory === cat.id
                      ? "bg-cyan-500 text-black shadow-xs font-bold"
                      : "text-slate-500 hover:text-[#282937] dark:hover:text-white bg-black/5 dark:bg-white/5"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Error / Unauthorized State */}
        {error ? (
          <Panel palette={palette} className="p-8 text-center" glowOnHover={false}>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 dark:text-amber-400 mb-3.5 shadow-lg">
              <Lock size={26} />
            </div>
            <h2 className="text-base font-bold text-[#282937] dark:text-white">
              Admin Authorization Enforced (RBAC §4.2)
            </h2>
            <p className="mt-1 text-xs text-[#58565e] dark:text-slate-400 max-w-md mx-auto">
              {error}
            </p>
            <div className="mt-4 p-3.5 rounded-xl bg-black/5 dark:bg-black/30 border border-[#e2d9cc] dark:border-slate-800 max-w-lg mx-auto text-left text-xs text-slate-400 font-mono space-y-1.5">
              <div className="text-[11px] text-slate-500 uppercase font-semibold">Security Policy Note:</div>
              <div>&bull; Self-registered accounts receive the default <span className="text-sx-blue">viewer</span> role.</div>
              <div>&bull; Elevation to <span className="text-amber-400">admin</span> is an explicit command action to preserve immutable chain of custody.</div>
            </div>
          </Panel>
        ) : loading ? (
          <div className="flex h-56 flex-col items-center justify-center gap-3">
            <RefreshCw size={22} className="animate-spin text-cyan-400" />
            <span className="text-xs text-slate-400 font-mono">Decrypting audit trail ledger...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 rounded-2xl border border-dashed border-[#e2d9cc] dark:border-slate-800">
            No audit ledger entries match your filter query.
          </div>
        ) : (
          /* Date-Wise Grouped Bento Log Cards */
          <div className="space-y-6">
            {dateGroupedLogs.map((dateGroup) => (
              <div key={dateGroup.key} className="space-y-3">
                {/* Date Block Header Banner */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      <Calendar size={12} />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#282937] dark:text-slate-200">
                      {dateGroup.formattedDate}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-black/5 dark:bg-white/5 text-slate-500 border border-[#e2d9cc] dark:border-slate-800">
                      {dateGroup.relative}
                    </span>
                  </div>

                  <span className="text-[11px] font-mono text-slate-400">
                    {dateGroup.entries.length} {dateGroup.entries.length === 1 ? "entry" : "entries"}
                  </span>
                </div>

                {/* Cards under this date block */}
                <div className="grid grid-cols-1 gap-2.5">
                  {dateGroup.entries.map((log) => {
                    const isExpanded = expandedLogId === log.id;
                    const meta = getActionMeta(log.action);
                    const logTime = new Date(log.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    });

                    return (
                      <div
                        key={log.id}
                        className="group relative overflow-hidden rounded-xl border backdrop-blur-xl transition-all duration-200 hover:border-slate-600/50 hover:shadow-md"
                        style={{
                          backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "#FFFFFF",
                          borderColor: isDark ? "rgba(255,255,255,0.07)" : "#E2D9CC",
                        }}
                      >
                        {/* Left category accent line */}
                        <div
                          className="absolute left-0 top-0 bottom-0 w-1"
                          style={{ backgroundColor: meta.accent }}
                        />

                        <div className="p-3.5 pl-4 sm:pl-5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                            {/* Left Meta: Action Pill & Category */}
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-mono text-xs font-bold border ${meta.badge}`}
                              >
                                {log.action}
                              </span>

                              <span className="text-[11px] text-slate-500 font-medium">
                                {meta.category}
                              </span>

                              {/* Target resource if any */}
                              {log.resource_type && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/5 border border-[#e2d9cc] dark:border-slate-800 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                                  <span className="font-semibold text-cyan-500">{log.resource_type}</span>
                                  <span className="text-slate-400">:</span>
                                  <span className="truncate max-w-[130px]" title={log.resource_id || "global"}>
                                    {log.resource_id || "global"}
                                  </span>
                                </span>
                              )}
                            </div>

                            {/* Right Meta: Actor, Time & Expand */}
                            <div className="flex items-center gap-3 self-end sm:self-center">
                              {/* Security Actor */}
                              <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
                                <User size={12} className="text-slate-500" />
                                {log.user_id ? (
                                  <span
                                    className="text-[#282937] dark:text-slate-300 font-semibold"
                                    title={log.user_id}
                                  >
                                    usr_{log.user_id.slice(0, 6)}
                                  </span>
                                ) : (
                                  <span className="text-slate-500 italic">daemon</span>
                                )}
                              </div>

                              {/* Time */}
                              <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500">
                                <Clock size={11} />
                                <span>{logTime}</span>
                              </div>

                              {/* Inspect Button */}
                              <button
                                type="button"
                                onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-cyan-500 dark:text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 transition-colors cursor-pointer"
                              >
                                <span>{isExpanded ? "Close" : "Inspect"}</span>
                                {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                              </button>
                            </div>
                          </div>

                          {/* Expandable JSON Detail Drawer */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="mt-3.5 pt-3 border-t border-[#e2d9cc] dark:border-slate-800/80 overflow-hidden"
                              >
                                <div className="rounded-xl bg-black/60 border border-slate-800 p-3 font-mono text-[11px] text-slate-300">
                                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-slate-400">
                                    <div className="flex items-center gap-1.5">
                                      <Terminal size={12} className="text-cyan-400" />
                                      <span className="text-cyan-400 font-bold uppercase text-[10px]">
                                        Cryptographic Proof &bull; Event Ledger Payload
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleCopy(JSON.stringify(log, null, 2), log.id)}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                                    >
                                      {copiedId === log.id ? (
                                        <>
                                          <Check size={11} className="text-emerald-400" />
                                          <span className="text-emerald-400">Copied</span>
                                        </>
                                      ) : (
                                        <>
                                          <Copy size={11} />
                                          <span>Copy JSON</span>
                                        </>
                                      )}
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                    <div>
                                      <span className="text-slate-500">Record ID: </span>
                                      <span className="text-white select-all">{log.id}</span>
                                    </div>
                                    <div>
                                      <span className="text-slate-500">Timestamp: </span>
                                      <span className="text-slate-200">{new Date(log.created_at).toISOString()}</span>
                                    </div>
                                    <div>
                                      <span className="text-slate-500">Actor Principal: </span>
                                      <span className="text-slate-200">{log.user_id || "System Subsystem"}</span>
                                    </div>
                                    <div>
                                      <span className="text-slate-500">Resource Target: </span>
                                      <span className="text-slate-200">
                                        {log.resource_type ? `${log.resource_type}:${log.resource_id}` : "Global Context"}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </DashboardShell>
  );
}
