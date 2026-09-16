import { useEffect, useMemo, useState, type ComponentType, type CSSProperties } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CodeXml,
  Plus,
  Play,
  CheckCircle2,
  Clock,
  Trash2,
  Edit2,
  ShieldAlert,
  AlertOctagon,
  AlertTriangle,
  AlertCircle,
  Info,
  FileEdit,
  XCircle,
  Loader2,
} from "lucide-react";
import { DashboardShell } from "../components/layout/DashboardShell";
import { apiClient } from "../api/client";
import { useTheme } from "../theme/ThemeProvider";

// ---------------------------------------------------------------------------
// Same design tokens as Dashboard.tsx / ZeroDayDetection.tsx — kept local so
// this page stays self-contained, matching the pattern established across
// the app. Severity + status color families are the same hex values used in
// the Threat Overview chips on the Dashboard, for visual continuity.
// ---------------------------------------------------------------------------
const DARK_PALETTE = {
  pageBg: "#040810",
  gradientOverlay: "linear-gradient(180deg,#050b18 0%,#040810 45%,#020509 100%)",
  blob1: "rgba(58,160,255,0.16)",
  blob2: "rgba(37,99,235,0.10)",
  blob3: "rgba(99,102,241,0.07)",
  radarColor: "#3aa0ff",
  radarOpacity: 0.14,
  text: "#f8fafc",
  textSecondary: "#94a3b8",
  textMuted: "#64748b",
  surface: "rgba(255,255,255,0.025)",
  surfaceHover: "rgba(255,255,255,0.045)",
  border: "rgba(255,255,255,0.08)",
  borderHover: "rgba(58,160,255,0.32)",
  primary: "#3aa0ff",
  primaryGlow: "#5fc2ff",
  onPrimary: "#04101f",
  hairline: "rgba(255,255,255,0.18)",
  shadowGlow: "rgba(58,160,255,0.20)",
  panelShadow: "rgba(0,0,0,0.75)",
  errorBg: "rgba(239,68,68,0.10)",
  errorBorder: "rgba(239,68,68,0.30)",
  errorText: "#fca5a5",
  critical: "#f87171",
  criticalBg: "rgba(239,68,68,0.14)",
  criticalRing: "rgba(239,68,68,0.28)",
  high: "#fb923c",
  highBg: "rgba(249,115,22,0.14)",
  highRing: "rgba(249,115,22,0.28)",
  medium: "#fbbf24",
  mediumBg: "rgba(245,158,11,0.14)",
  mediumRing: "rgba(245,158,11,0.28)",
  low: "#60a5fa",
  lowBg: "rgba(96,165,250,0.14)",
  lowRing: "rgba(96,165,250,0.28)",
  active: "#34d399",
  test: "#fbbf24",
  draft: "#94a3b8",
  retired: "#f87171",
};

const LIGHT_PALETTE = {
  pageBg: "#FAF9FF",
  gradientOverlay: "linear-gradient(180deg,#FDFCFF 0%,#FAF9FF 55%,#F5F3FF 100%)",
  blob1: "rgba(124,58,237,0.10)",
  blob2: "rgba(167,139,250,0.12)",
  blob3: "rgba(196,181,253,0.20)",
  radarColor: "#7C3AED",
  radarOpacity: 0.07,
  text: "#18181B",
  textSecondary: "#71717A",
  textMuted: "#A1A1AA",
  surface: "#FFFFFF",
  surfaceHover: "#FCFAFF",
  border: "#E9E7F2",
  borderHover: "rgba(124,58,237,0.35)",
  primary: "#7C3AED",
  primaryGlow: "#A78BFA",
  onPrimary: "#FFFFFF",
  hairline: "rgba(124,58,237,0.14)",
  shadowGlow: "rgba(124,58,237,0.18)",
  panelShadow: "rgba(124,58,237,0.12)",
  errorBg: "rgba(244,63,94,0.08)",
  errorBorder: "rgba(244,63,94,0.30)",
  errorText: "#E11D48",
  critical: "#F43F5E",
  criticalBg: "rgba(244,63,94,0.10)",
  criticalRing: "rgba(244,63,94,0.22)",
  high: "#EA580C",
  highBg: "rgba(234,88,12,0.10)",
  highRing: "rgba(234,88,12,0.22)",
  medium: "#D97706",
  mediumBg: "rgba(217,119,6,0.10)",
  mediumRing: "rgba(217,119,6,0.22)",
  low: "#7C3AED",
  lowBg: "rgba(124,58,237,0.10)",
  lowRing: "rgba(124,58,237,0.22)",
  active: "#16A34A",
  test: "#D97706",
  draft: "#A1A1AA",
  retired: "#F43F5E",
};

type Palette = typeof DARK_PALETTE;

interface DetectionRule {
  id: string;
  rule_id: string;
  name: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low" | string;
  status: "active" | "test" | "draft" | "retired" | string;
  version: number;
  mitre_technique?: string;
  conditions: any;
  created_at: string;
}

const SEVERITY_META: Record<string, { icon: ComponentType<any>; color: (p: Palette) => string; bg: (p: Palette) => string; ring: (p: Palette) => string }> = {
  critical: { icon: AlertOctagon, color: (p) => p.critical, bg: (p) => p.criticalBg, ring: (p) => p.criticalRing },
  high: { icon: AlertTriangle, color: (p) => p.high, bg: (p) => p.highBg, ring: (p) => p.highRing },
  medium: { icon: AlertCircle, color: (p) => p.medium, bg: (p) => p.mediumBg, ring: (p) => p.mediumRing },
  low: { icon: Info, color: (p) => p.low, bg: (p) => p.lowBg, ring: (p) => p.lowRing },
};

const STATUS_META: Record<string, { icon: ComponentType<any>; color: (p: Palette) => string; label: string }> = {
  active: { icon: CheckCircle2, color: (p) => p.active, label: "Active" },
  test: { icon: Clock, color: (p) => p.test, label: "Test" },
  draft: { icon: FileEdit, color: (p) => p.draft, label: "Draft" },
  retired: { icon: XCircle, color: (p) => p.retired, label: "Retired" },
};

const STATUS_FILTERS = ["all", "active", "test", "draft", "retired"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } },
};
const staggerContainer = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };

function severityMeta(severity: string) {
  return SEVERITY_META[severity] || SEVERITY_META.low;
}
function statusMeta(status: string) {
  return STATUS_META[status] || STATUS_META.draft;
}

export function DetectionEngineering() {
  const { theme } = useTheme();
  const palette: Palette = useMemo(() => (theme === "dark" ? DARK_PALETTE : LIGHT_PALETTE), [theme]);

  const [rules, setRules] = useState<DetectionRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiClient.get("/api/rules");
        if (!cancelled) setRules(res.data);
      } catch (err: any) {
        if (!cancelled) {
          setLoadError(
            err?.response?.status === 404
              ? "Rule management API isn't available yet — detection rules are currently seed-only (see database/postgres/init.sql)."
              : "Could not reach the SentinelX backend."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function notImplemented(action: string) {
    setNotice(`${action} isn't wired up yet — rule management API is pending.`);
    window.setTimeout(() => setNotice(null), 2600);
  }

  const counts = useMemo(() => {
    const base = { active: 0, test: 0, draft: 0, retired: 0 };
    for (const r of rules) if (r.status in base) base[r.status as keyof typeof base]++;
    return base;
  }, [rules]);

  const filteredRules = statusFilter === "all" ? rules : rules.filter((r) => r.status === statusFilter);

  const gridStyle: CSSProperties = { backgroundColor: palette.pageBg };

  return (
    <>
      {/* ---- Ambient background — same language as Dashboard.tsx ---- */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" style={gridStyle}>
        <div className="absolute inset-0" style={{ background: palette.gradientOverlay }} />
        <div className="absolute -top-52 -left-40 h-[560px] w-[560px] rounded-full blur-[140px]" style={{ backgroundColor: palette.blob1 }} />
        <div className="absolute top-1/4 -right-40 h-[520px] w-[520px] rounded-full blur-[160px]" style={{ backgroundColor: palette.blob2 }} />
        <div className="absolute bottom-[-20%] left-1/3 h-[480px] w-[480px] rounded-full blur-[150px]" style={{ backgroundColor: palette.blob3 }} />
        <div
          className="sx-radar-sweep absolute -top-72 -right-72 h-[900px] w-[900px] rounded-full"
          style={{ opacity: palette.radarOpacity, background: `conic-gradient(from 0deg, transparent 0deg, ${palette.radarColor} 6deg, transparent 46deg)` }}
        />
        <style>{`
          @keyframes sx-radar-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          .sx-radar-sweep { animation: sx-radar-spin 18s linear infinite; }
        `}</style>
      </div>

      <DashboardShell>
        {/* ---- Header ---- */}
        <motion.div initial="hidden" animate="show" variants={staggerContainer} className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <motion.div variants={fadeUp}>
            <div className="mb-1.5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: palette.primaryGlow }}>
              <CodeXml size={11} />
              SentinelX // Rule Engine
            </div>
            <h1 className="text-2xl font-semibold tracking-tight" style={{ color: palette.text }}>Detection Engineering</h1>
            <p className="mt-1 max-w-2xl text-sm" style={{ color: palette.textSecondary }}>
              Manage Sigma-inspired detection logic, test rules against historical telemetry before
              activation, and control the lifecycle of every rule the event worker evaluates.
            </p>
          </motion.div>

          <motion.div variants={fadeUp} className="flex gap-3">
            <button
              onClick={() => notImplemented("Testing drafts")}
              className="flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors"
              style={{ borderColor: palette.border, color: palette.textSecondary, backgroundColor: "transparent" }}
            >
              <Play size={15} /> Test All Drafts
            </button>
            <button
              onClick={() => notImplemented("Rule creation")}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-90"
              style={{ backgroundColor: palette.primary, color: palette.onPrimary }}
            >
              <Plus size={15} /> New Rule
            </button>
          </motion.div>
        </motion.div>

        {/* ---- Status stat strip — real counts derived from fetched rules ---- */}
        <motion.div initial="hidden" animate="show" variants={staggerContainer} className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(["active", "test", "draft", "retired"] as const).map((status) => {
            const meta = STATUS_META[status];
            const Icon = meta.icon;
            const color = meta.color(palette);
            return (
              <motion.button
                key={status}
                variants={fadeUp}
                onClick={() => setStatusFilter(statusFilter === status ? "all" : status)}
                className="flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition-colors"
                style={{
                  borderColor: statusFilter === status ? color : palette.border,
                  background: `linear-gradient(135deg, ${color}14 0%, transparent 70%)`,
                  backgroundColor: palette.surface,
                }}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border" style={{ borderColor: `${color}55`, backgroundColor: `${color}1a` }}>
                  <Icon size={18} style={{ color }} />
                </span>
                <div>
                  <div className="font-mono text-xl font-semibold" style={{ color }}>{counts[status]}</div>
                  <div className="text-[10px] uppercase tracking-wide" style={{ color: palette.textMuted }}>{meta.label}</div>
                </div>
              </motion.button>
            );
          })}
        </motion.div>

        {/* ---- Filter tabs ---- */}
        <div className="mb-4 flex w-fit gap-1 rounded-2xl border p-1" style={{ borderColor: palette.border, backgroundColor: palette.surface }}>
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className="rounded-xl px-3 py-1.5 text-xs font-medium capitalize transition-colors"
              style={{
                backgroundColor: statusFilter === s ? `${palette.primary}22` : "transparent",
                color: statusFilter === s ? palette.primaryGlow : palette.textSecondary,
              }}
            >
              {s}
            </button>
          ))}
        </div>

        {/* ---- Rules list ---- */}
        {loading ? (
          <div className="flex items-center justify-center gap-2 rounded-[28px] border p-14 text-sm" style={{ borderColor: palette.border, backgroundColor: palette.surface, color: palette.textSecondary }}>
            <Loader2 size={16} className="animate-spin" style={{ color: palette.primary }} />
            Loading rules…
          </div>
        ) : loadError ? (
          <div className="rounded-[28px] border p-6 text-sm" style={{ borderColor: palette.errorBorder, backgroundColor: palette.errorBg, color: palette.errorText }}>
            {loadError}
          </div>
        ) : filteredRules.length === 0 ? (
          <div className="rounded-[28px] border p-14 text-center" style={{ borderColor: palette.border, backgroundColor: palette.surface }}>
            <ShieldAlert size={24} className="mx-auto" style={{ color: palette.textMuted }} />
            <p className="mt-3 text-sm" style={{ color: palette.textMuted }}>
              {statusFilter === "all" ? "No detection rules found." : `No ${statusFilter} rules.`}
            </p>
          </div>
        ) : (
          <motion.div initial="hidden" animate="show" variants={staggerContainer} className="space-y-3">
            <AnimatePresence>
              {filteredRules.map((rule) => {
                const sevMeta = severityMeta(rule.severity);
                const stMeta = statusMeta(rule.status);
                const SevIcon = sevMeta.icon;
                const StatusIcon = stMeta.icon;
                const sevColor = sevMeta.color(palette);
                const statusColor = stMeta.color(palette);

                return (
                  <motion.div
                    key={rule.id}
                    variants={fadeUp}
                    layout
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    whileHover={{ y: -2 }}
                    className="relative flex flex-col gap-4 overflow-hidden rounded-[22px] border p-4 backdrop-blur-xl transition-colors sm:flex-row sm:items-center sm:justify-between"
                    style={{ borderColor: palette.border, backgroundColor: palette.surface }}
                  >
                    <span className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: sevColor }} />

                    <div className="flex items-center gap-4 pl-2">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${sevColor}1a` }}>
                        <SevIcon size={17} style={{ color: sevColor }} />
                      </span>
                      <div>
                        <div className="text-sm font-medium" style={{ color: palette.text }}>{rule.name}</div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px]" style={{ color: palette.textMuted }}>
                          <span>{rule.rule_id}</span>
                          {rule.mitre_technique && <span>· {rule.mitre_technique}</span>}
                          <span>· v{rule.version}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 pl-2 sm:justify-end sm:pl-0">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize"
                        style={{ borderColor: `${statusColor}55`, backgroundColor: `${statusColor}14`, color: statusColor }}
                      >
                        <StatusIcon size={12} />
                        {rule.status}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => notImplemented("Historical testing")}
                          title="Test against historical telemetry"
                          className="rounded-lg p-1.5 transition-colors"
                          style={{ color: palette.textMuted }}
                        >
                          <Play size={15} />
                        </button>
                        <button
                          onClick={() => notImplemented("Rule editing")}
                          title="Edit rule"
                          className="rounded-lg p-1.5 transition-colors"
                          style={{ color: palette.textMuted }}
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => notImplemented("Rule retirement")}
                          title="Retire rule"
                          className="rounded-lg p-1.5 transition-colors"
                          style={{ color: palette.errorText }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ---- Ephemeral "not implemented" notice ---- */}
        <AnimatePresence>
          {notice && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              className="fixed bottom-6 right-6 z-50 rounded-xl border px-4 py-3 text-xs shadow-lg"
              style={{ borderColor: palette.border, backgroundColor: palette.surface, color: palette.textSecondary }}
            >
              {notice}
            </motion.div>
          )}
        </AnimatePresence>
      </DashboardShell>
    </>
  );
}