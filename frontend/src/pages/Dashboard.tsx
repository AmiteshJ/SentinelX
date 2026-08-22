import { useEffect, useMemo, useState, type ReactNode, type ComponentType, type CSSProperties } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Database,
  Leaf,
  Zap,
  ShieldCheck,
  Radio,
  AlertOctagon,
  AlertTriangle,
  AlertCircle,
  Info,
  Wifi,
  WifiOff,
  Activity,
  ShieldAlert,
} from "lucide-react";
import { DashboardShell } from "../components/layout/DashboardShell";
import { apiClient } from "../api/client";
import { useRealtimeUpdates } from "../hooks/useRealtimeUpdates";
import { useTheme } from "../theme/ThemeProvider";
import type { DashboardOverview } from "../types/api";

// ---------------------------------------------------------------------------
// Design tokens — one dark palette (SOC command-deck), one light palette
// (exact spec: bg #FAF9FF, primary #7C3AED, "AI-native, creative, elegant").
// This is the template the rest of the app's pages will inherit from once
// this page is finalized, so it's kept as a single, explicit source of truth
// rather than scattered Tailwind color classes.
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
  hairline: "rgba(255,255,255,0.18)",
  shadowGlow: "rgba(58,160,255,0.20)",
  panelShadow: "rgba(0,0,0,0.75)",
  skeleton: "rgba(255,255,255,0.04)",
  eyebrow: "rgba(95,194,255,0.8)",
  live: "#34d399",
  replay: "#a78bfa",
  offlineDot: "#64748b",
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
  errorBg: "rgba(239,68,68,0.10)",
  errorBorder: "rgba(239,68,68,0.30)",
  errorText: "#fca5a5",
  ringColor: "rgba(58,160,255,0.55)",
  ringDim: "rgba(148,163,184,0.5)",
  cometColor: "#a78bfa",
  cometRing: "rgba(167,139,250,0.5)",
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
  hairline: "rgba(124,58,237,0.14)",
  shadowGlow: "rgba(124,58,237,0.18)",
  panelShadow: "rgba(124,58,237,0.12)",
  skeleton: "rgba(124,58,237,0.05)",
  eyebrow: "#7C3AED",
  live: "#16A34A",
  replay: "#7C3AED",
  offlineDot: "#A1A1AA",
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
  errorBg: "rgba(244,63,94,0.08)",
  errorBorder: "rgba(244,63,94,0.30)",
  errorText: "#E11D48",
  ringColor: "rgba(124,58,237,0.40)",
  ringDim: "rgba(161,161,170,0.55)",
  cometColor: "#7C3AED",
  cometRing: "rgba(124,58,237,0.35)",
};

type Palette = typeof DARK_PALETTE;

const MODE_LABEL: Record<string, string> = {
  LIVE: "LIVE MONITORING",
  DATASET: "DATASET MODE",
  REPLAY: "REPLAY MODE",
  OFFLINE: "OFFLINE",
};

function modeColor(mode: string, palette: Palette): string {
  if (mode === "LIVE") return palette.live;
  if (mode === "DATASET") return palette.primary;
  if (mode === "REPLAY") return palette.replay;
  return palette.offlineDot;
}

// Fixed (non-random) positions so the decorative art doesn't jump around on
// every realtime re-render.
const STAR_FIELD = [
  { top: "18%", left: "22%", size: 2, o: 0.8 },
  { top: "30%", left: "70%", size: 2, o: 0.5 },
  { top: "62%", left: "18%", size: 1.5, o: 0.6 },
  { top: "75%", left: "62%", size: 2, o: 0.4 },
  { top: "45%", left: "85%", size: 1.5, o: 0.7 },
  { top: "12%", left: "55%", size: 1.5, o: 0.5 },
];

const WAVE_BARS = [4, 8, 5, 12, 7, 14, 6, 10, 5, 8, 4, 11, 6, 9, 4];

// ---------------------------------------------------------------------------
// Motion variants
// ---------------------------------------------------------------------------
const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
};

// ---------------------------------------------------------------------------
// Local building blocks (kept in this file so Dashboard.tsx is self-contained)
// ---------------------------------------------------------------------------

function Panel({
  children,
  className = "",
  glowOnHover = true,
  palette,
}: {
  children: ReactNode;
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
            boxShadow: `0 24px 70px -20px ${palette.shadowGlow}`,
          }
          : undefined
      }
      style={{
        backgroundColor: palette.surface,
        borderColor: palette.border,
        boxShadow: `0 20px 60px -24px ${palette.panelShadow}`,
      }}
      className={`relative overflow-hidden rounded-[28px] border backdrop-blur-xl transition-colors duration-300 ${className}`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(to right, transparent, ${palette.hairline}, transparent)` }} />
      {children}
    </motion.div>
  );
}

function PanelHeader({
  icon: Icon,
  title,
  right,
  palette,
}: {
  icon: ComponentType<any>;
  title: string;
  right?: ReactNode;
  palette: Palette;
}) {
  return (
    <div className="relative z-10 mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon size={13} style={{ color: palette.primaryGlow }} />
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: palette.textSecondary }}>
          {title}
        </h3>
      </div>
      {right}
    </div>
  );
}

function StatusRow({
  ok,
  label,
  icon: Icon,
  palette,
}: {
  ok: boolean;
  label: string;
  icon: ComponentType<any>;
  palette: Palette;
}) {
  return (
    <div
      className="flex items-center justify-between rounded-2xl border px-3.5 py-2.5 transition-colors duration-200"
      style={{ borderColor: palette.border, backgroundColor: "transparent" }}
    >
      <div className="flex items-center gap-2.5">
        <Icon size={14} style={{ color: ok ? palette.textSecondary : palette.critical }} />
        <span className="font-mono text-[11px] tracking-wide" style={{ color: palette.text }}>
          {label}
        </span>
      </div>
      <span className="relative flex h-2 w-2">
        {ok && (
          <span
            className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
            style={{ backgroundColor: palette.live }}
          />
        )}
        <span
          className="relative inline-flex h-2 w-2 rounded-full"
          style={{ backgroundColor: ok ? palette.live : palette.critical }}
        />
      </span>
    </div>
  );
}

function AnimatedNumber({ value, className, color }: { value: number; className?: string; color?: string }) {
  return (
    <AnimatePresence mode="popLayout">
      <motion.span
        key={value}
        initial={{ opacity: 0, y: -8, filter: "blur(4px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, y: 8, filter: "blur(4px)" }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className={className}
        style={color ? { color } : undefined}
      >
        {value}
      </motion.span>
    </AnimatePresence>
  );
}

function SkeletonGrid({ palette }: { palette: Palette }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className={`h-40 animate-pulse rounded-[28px] border ${i === 3 || i === 4 ? "lg:col-span-3" : ""}`}
          style={{ borderColor: palette.border, backgroundColor: palette.skeleton }}
        />
      ))}
    </div>
  );
}

/** Decorative radar illustration for the Monitoring Mode card: concentric
 * rings, a glowing center, a faint starfield, and a small waveform — a
 * static, CSS-only approximation, no image assets required. */
function RadarArt({ palette }: { palette: Palette }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border"
            style={{ width: i * 60, height: i * 60, borderColor: palette.ringColor, opacity: 0.4 - i * 0.07 }}
          />
        ))}
        <div
          className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ backgroundColor: palette.primary, boxShadow: `0 0 18px 5px ${palette.primary}` }}
        />
      </div>
      {STAR_FIELD.map((s, idx) => (
        <span
          key={idx}
          className="absolute rounded-full"
          style={{ top: s.top, left: s.left, width: s.size, height: s.size, backgroundColor: palette.ringDim, opacity: s.o }}
        />
      ))}
      <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-end gap-[3px]">
        {WAVE_BARS.map((h, idx) => (
          <span key={idx} className="w-[2px] rounded-full" style={{ height: h, backgroundColor: palette.primary, opacity: 0.45 }} />
        ))}
      </div>
    </div>
  );
}

/** Decorative comet illustration for the Incident Overview card: concentric
 * rings tinted violet with a comet trail sweeping through, echoing the
 * radar motif without duplicating it. */
function CometArt({ palette }: { palette: Palette }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute right-[8%] top-[45%]">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="absolute right-0 top-0 -translate-y-1/2 rounded-full border"
            style={{ width: i * 55, height: i * 55, transform: `translate(30%, -50%)`, borderColor: palette.cometRing, opacity: 0.35 - i * 0.08 }}
          />
        ))}
      </div>
      <div
        className="absolute h-px w-44 origin-right"
        style={{ right: "6%", top: "38%", transform: "rotate(-38deg)", background: `linear-gradient(to left, ${palette.cometColor}, transparent)` }}
      />
      <div
        className="absolute h-2.5 w-2.5 rounded-full"
        style={{ right: "5%", top: "36%", backgroundColor: palette.cometColor, boxShadow: `0 0 16px 4px ${palette.cometColor}` }}
      />
      {STAR_FIELD.map((s, idx) => (
        <span
          key={idx}
          className="absolute rounded-full"
          style={{ top: s.top, left: s.left, width: s.size, height: s.size, backgroundColor: palette.ringDim, opacity: s.o }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------

export function Dashboard() {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { updates, connected } = useRealtimeUpdates();
  const { theme } = useTheme();

  const palette: Palette = useMemo(() => (theme === "dark" ? DARK_PALETTE : LIGHT_PALETTE), [theme]);

  function refresh() {
    apiClient
      .get<DashboardOverview>("/api/dashboard/overview")
      .then((res) => setData(res.data))
      .catch(() => setError("Could not reach the SentinelX backend."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (updates.length > 0) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updates.length]);

  const currentModeColor = modeColor(data?.monitoring_mode ?? "OFFLINE", palette);
  const gridStyle: CSSProperties = { backgroundColor: palette.pageBg };

  return (
    <>
      {/* ---- Immersive ambient background (fixed, behind everything, no grid lines) ---- */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" style={gridStyle}>
        <div className="absolute inset-0" style={{ background: palette.gradientOverlay }} />
        <div className="absolute -top-52 -left-40 h-[560px] w-[560px] rounded-full blur-[140px]" style={{ backgroundColor: palette.blob1 }} />
        <div className="absolute top-1/4 -right-40 h-[520px] w-[520px] rounded-full blur-[160px]" style={{ backgroundColor: palette.blob2 }} />
        <div className="absolute bottom-[-20%] left-1/3 h-[480px] w-[480px] rounded-full blur-[150px]" style={{ backgroundColor: palette.blob3 }} />
        {/* rotating ambient sweep — signature element, tuned per theme */}
        <div
          className="sx-radar-sweep absolute -top-72 -right-72 h-[900px] w-[900px] rounded-full"
          style={{
            opacity: palette.radarOpacity,
            background: `conic-gradient(from 0deg, transparent 0deg, ${palette.radarColor} 6deg, transparent 46deg)`,
          }}
        />
        <style>{`
          @keyframes sx-radar-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          .sx-radar-sweep { animation: sx-radar-spin 18s linear infinite; }
        `}</style>
      </div>

      <DashboardShell>
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6"
        >
          <div className="mb-1.5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: palette.eyebrow }}>
            <Activity size={11} />
            SentinelX // Command Deck
          </div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: palette.text }}>
            SOC Overview
          </h1>
          <p className="mt-1 max-w-2xl text-sm" style={{ color: palette.textSecondary }}>
            Live system status, real alert/incident counts, and a WebSocket-driven threat feed —
            every number here is either real or honestly zero. Nothing is fabricated to look busy.
          </p>
        </motion.div>

        {error && (
          <div
            className="mb-4 rounded-2xl border p-4 text-sm"
            style={{ backgroundColor: palette.errorBg, borderColor: palette.errorBorder, color: palette.errorText }}
          >
            {error}
          </div>
        )}

        {loading ? (
          <SkeletonGrid palette={palette} />
        ) : data ? (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {/* System Health */}
            <Panel className="p-5" palette={palette}>
              <PanelHeader icon={Database} title="System Health" palette={palette} />
              <div className="relative z-10 space-y-2">
                <StatusRow ok={data.system_health.postgres} label="POSTGRESQL" icon={Database} palette={palette} />
                <StatusRow ok={data.system_health.mongodb} label="MONGODB" icon={Leaf} palette={palette} />
                <StatusRow ok={data.system_health.redis} label="REDIS" icon={Zap} palette={palette} />
                <StatusRow ok={data.system_health.detection_engine} label="DETECTION ENGINE" icon={ShieldCheck} palette={palette} />
              </div>
            </Panel>

            {/* Monitoring Mode */}
            <Panel className="min-h-[220px] p-5" palette={palette}>
              <RadarArt palette={palette} />
              <PanelHeader icon={Radio} title="Monitoring Mode" palette={palette} />
              <div className="relative z-10 flex h-full flex-col justify-between">
                <div
                  className="inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5"
                  style={{ borderColor: palette.border, backgroundColor: palette.surface, boxShadow: `0 0 16px 1px ${currentModeColor}33` }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: currentModeColor }} />
                  <span className="font-mono text-[11px] font-medium tracking-wide" style={{ color: currentModeColor }}>
                    {MODE_LABEL[data.monitoring_mode] ?? "OFFLINE"}
                  </span>
                </div>
              </div>
            </Panel>

            {/* Active Incidents — hero stat */}
            <Panel className="min-h-[220px] p-5" palette={palette}>
              <CometArt palette={palette} />
              <PanelHeader icon={ShieldAlert} title="Incident Overview" palette={palette} />
              <div className="relative z-10 flex items-baseline gap-2">
                <AnimatedNumber
                  value={data.active_incidents}
                  className="font-mono text-4xl font-semibold tabular-nums"
                  color={palette.text}
                />
                <span className="text-xs" style={{ color: palette.textMuted }}>active incidents</span>
              </div>
            </Panel>

            {/* Threat Overview */}
            <Panel className="p-5 lg:col-span-3" glowOnHover={false} palette={palette}>
              <PanelHeader icon={AlertTriangle} title="Threat Overview" palette={palette} />
              <div className="relative z-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(
                  [
                    ["critical", data.critical_alerts, AlertOctagon, palette.critical, palette.criticalBg, palette.criticalRing],
                    ["high", data.high_alerts, AlertTriangle, palette.high, palette.highBg, palette.highRing],
                    ["medium", data.medium_alerts, AlertCircle, palette.medium, palette.mediumBg, palette.mediumRing],
                    ["low", data.low_alerts, Info, palette.low, palette.lowBg, palette.lowRing],
                  ] as const
                ).map(([severity, count, SevIcon, color, bg, ring]) => (
                  <div
                    key={severity}
                    className="relative flex items-center gap-3 overflow-hidden rounded-2xl border px-4 py-3.5"
                    style={{ borderColor: ring, background: `linear-gradient(135deg, ${bg} 0%, transparent 70%)` }}
                  >
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border"
                      style={{ borderColor: ring, backgroundColor: bg }}
                    >
                      <SevIcon size={18} style={{ color }} />
                    </span>
                    <div>
                      <AnimatedNumber value={count} className="block font-mono text-xl font-semibold tabular-nums" color={color} />
                      <span className="text-[10px] uppercase tracking-wide" style={{ color: palette.textMuted }}>{severity}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            {/* Live Threat Feed */}
            <Panel className="p-5 lg:col-span-3" glowOnHover={false} palette={palette}>
              <PanelHeader
                icon={Activity}
                title="Live Threat Feed"
                palette={palette}
                right={
                  <span
                    className="flex items-center gap-1.5 font-mono text-[10px] tracking-wide"
                    style={{ color: connected ? palette.live : palette.textMuted }}
                  >
                    {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
                    {connected ? "STREAM CONNECTED" : "DISCONNECTED"}
                  </span>
                }
              />
              {updates.length === 0 ? (
                <p className="relative z-10 text-xs leading-relaxed" style={{ color: palette.textMuted }}>
                  No alerts yet. This feed populates in real time via WebSocket as soon as the
                  event worker detects something — try a dataset upload or the ingestion API.
                </p>
              ) : (
                <ul className="relative z-10 max-h-56 space-y-1.5 overflow-y-auto pr-1">
                  <AnimatePresence initial={false}>
                    {updates.map((u, idx) => (
                      <motion.li
                        key={`${u.alert.id}-${idx}`}
                        layout
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="flex items-center justify-between rounded-lg border px-3 py-2 text-xs"
                        style={{ borderColor: palette.border }}
                      >
                        <span style={{ color: palette.text }}>{u.alert.rule_name}</span>
                        <span className="font-mono" style={{ color: palette.textMuted }}>{u.alert.source_ip}</span>
                        <span className="font-mono" style={{ color: palette.primaryGlow }}>risk {u.incident_risk_score}</span>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </Panel>
          </motion.div>
        ) : null}
      </DashboardShell>
    </>
  );
}