import { useMemo, useState, type CSSProperties } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Target,
  Search,
  Play,
  FileJson,
  Server,
  Activity,
  X,
  Save,
  Download,
  Filter,
  ShieldAlert,
  Cpu,
  Loader2,
  Fingerprint,
} from "lucide-react";
import { DashboardShell } from "../components/layout/DashboardShell";
import { apiClient } from "../api/client";
import { useTheme } from "../theme/ThemeProvider";

// ---------------------------------------------------------------------------
// Same design tokens as Dashboard.tsx / ZeroDayDetection.tsx / DetectionEngineering.tsx
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
  primary: "#3aa0ff",
  primaryGlow: "#5fc2ff",
  onPrimary: "#04101f",
  fieldBg: "rgba(0,0,0,0.25)",
  headerBg: "rgba(255,255,255,0.02)",
  chipBg: "rgba(255,255,255,0.06)",
  errorBg: "rgba(239,68,68,0.10)",
  errorBorder: "rgba(239,68,68,0.30)",
  errorText: "#fca5a5",
  successText: "#34d399",
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
  primary: "#7C3AED",
  primaryGlow: "#A78BFA",
  onPrimary: "#FFFFFF",
  fieldBg: "rgba(124,58,237,0.03)",
  headerBg: "rgba(124,58,237,0.04)",
  chipBg: "rgba(124,58,237,0.08)",
  errorBg: "rgba(244,63,94,0.08)",
  errorBorder: "rgba(244,63,94,0.30)",
  errorText: "#E11D48",
  successText: "#16A34A",
};

type Palette = typeof DARK_PALETTE;

interface HuntEvent {
  _id: string;
  ingested_at: string;
  source_ip?: string;
  destination_ip?: string;
  destination_port?: number;
  protocol?: string;
  event_type?: string;
  label?: string;
  [key: string]: any;
}

const QUICK_FILTERS = [
  { label: "Malicious ports", query: 'destination_port IN (4444, 31337, 12345, 6666, 6667)' },
  { label: "Remote access", query: 'destination_port IN (22, 23, 3389, 5900)' },
  { label: "Large transfers", query: "bytes_sent >= 50000000" },
];

const TIME_RANGES = [
  { value: "15m", label: "Last 15 minutes" },
  { value: "1h", label: "Last 1 hour" },
  { value: "6h", label: "Last 6 hours" },
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } },
};
const staggerContainer = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// A ghost/outline button that matches the rest of the app's hover language
// (border + text lift), replacing manual onMouseEnter/onMouseLeave DOM mutation.
function GhostButton({ icon: Icon, children, onClick, palette }: { icon: any; children: React.ReactNode; onClick?: () => void; palette: Palette }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ backgroundColor: palette.surfaceHover, color: palette.text }}
      className="flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors"
      style={{ borderColor: palette.border, color: palette.textSecondary }}
    >
      <Icon size={15} /> {children}
    </motion.button>
  );
}

export function ThreatHunting() {
  const { theme } = useTheme();
  const palette: Palette = useMemo(() => (theme === "dark" ? DARK_PALETTE : LIGHT_PALETTE), [theme]);

  const [query, setQuery] = useState("");
  const [timeRange, setTimeRange] = useState("24h");
  const [events, setEvents] = useState<HuntEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [huntError, setHuntError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"table" | "timeline" | "graph">("table");
  const [selectedEvent, setSelectedEvent] = useState<HuntEvent | null>(null);
  const [enrichment, setEnrichment] = useState<{ loading: boolean; data: any | null; error: string | null }>({ loading: false, data: null, error: null });
  const [notice, setNotice] = useState<string | null>(null);

  function notImplemented(action: string) {
    setNotice(`${action} isn't wired up yet.`);
    window.setTimeout(() => setNotice(null), 2600);
  }

  async function handleHunt(overrideQuery?: string) {
    setLoading(true);
    setHuntError(null);
    try {
      const res = await apiClient.get(`/api/hunting/events`, {
        params: { query: overrideQuery ?? query, time_range: timeRange, page: 1, page_size: 100 },
      });
      setEvents(res.data.events);
      setTotal(res.data.total);
    } catch (err: any) {
      setEvents([]);
      setTotal(0);
      setHuntError(
        err?.response?.status === 404
          ? "Threat hunting API isn't available yet — there's no /api/hunting/events endpoint on the backend yet, so THQL queries can't run."
          : err?.response?.data?.detail || "Could not reach the SentinelX backend."
      );
    } finally {
      setLoading(false);
    }
  }

  function handlePivotIp(ip?: string) {
    if (!ip) return;
    const pivotQuery = `source_ip = "${ip}"`;
    setQuery(pivotQuery);
    handleHunt(pivotQuery);
  }

  async function handleEnrichIoc(ip?: string) {
    if (!ip) return;
    setEnrichment({ loading: true, data: null, error: null });
    try {
      const { data } = await apiClient.get(`/api/threat-intelligence/ip/${ip}`);
      setEnrichment({ loading: false, data, error: null });
    } catch (err: any) {
      setEnrichment({ loading: false, data: null, error: err?.response?.data?.detail || "Enrichment lookup failed." });
    }
  }

  function handleExport() {
    if (events.length === 0) return;
    downloadJson(events, `sentinelx-hunt-${Date.now()}.json`);
  }

  function openEvent(ev: HuntEvent) {
    setSelectedEvent(ev);
    setEnrichment({ loading: false, data: null, error: null });
  }

  const gridStyle: CSSProperties = { backgroundColor: palette.pageBg };

  return (
    <>
      {/* ---- Ambient background — same language as the rest of the app ---- */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" style={gridStyle}>
        <div className="absolute inset-0" style={{ background: palette.gradientOverlay }} />
        <div className="absolute -top-52 -right-40 h-[560px] w-[560px] rounded-full blur-[140px]" style={{ backgroundColor: palette.blob1 }} />
        <div className="absolute top-1/4 -left-40 h-[520px] w-[520px] rounded-full blur-[160px]" style={{ backgroundColor: palette.blob2 }} />
        <div
          className="sx-radar-sweep absolute -top-72 -left-72 h-[900px] w-[900px] rounded-full"
          style={{ opacity: palette.radarOpacity, background: `conic-gradient(from 0deg, transparent 0deg, ${palette.radarColor} 6deg, transparent 46deg)` }}
        />
        <style>{`
          @keyframes sx-radar-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          .sx-radar-sweep { animation: sx-radar-spin 18s linear infinite; }
        `}</style>
      </div>

            <DashboardShell>
        <div className="relative transition-all duration-300" style={{ marginRight: selectedEvent ? 384 : 0 }}>
          {/* ---- Header ---- */}
          <motion.div initial="hidden" animate="show" variants={staggerContainer} className="mb-4 flex flex-wrap items-start justify-between gap-4">
            <motion.div variants={fadeUp}>
              <div className="mb-1.5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: palette.primaryGlow }}>
                <Target size={11} />
                SentinelX // Hunting Workspace
              </div>
              <h1 className="text-2xl font-semibold tracking-tight" style={{ color: palette.text }}>Threat Hunting</h1>
              <p className="mt-1 max-w-2xl text-sm" style={{ color: palette.textSecondary }}>
                Query raw telemetry with THQL, pivot on entities, and enrich indicators without
                waiting for a rule to fire.
              </p>
            </motion.div>
            <motion.div variants={fadeUp} className="flex gap-3">
              <GhostButton icon={Save} palette={palette} onClick={() => notImplemented("Saving hunts")}>Save Hunt</GhostButton>
              <GhostButton icon={Download} palette={palette} onClick={handleExport}>Export</GhostButton>
            </motion.div>
          </motion.div>

          {/* ---- Split Layout: Left (Editor) and Right (Results) ---- */}
          <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-160px)] min-h-[600px] mt-4">
            
            {/* ---- Left Panel: Query builder ---- */}
            <motion.div initial="hidden" animate="show" variants={fadeUp} className="flex flex-col w-full lg:w-3/5 rounded-[24px] border p-5 backdrop-blur-xl h-full" style={{ borderColor: palette.border, backgroundColor: palette.surface }}>
              
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold" style={{ color: palette.text }}>THQL Editor</span>
                
                {/* Quick filters */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-1 text-[11px]" style={{ color: palette.textMuted }}><Filter size={11} /> Quick filters:</span>
                  {QUICK_FILTERS.map((f) => (
                    <button
                      key={f.label}
                      onClick={() => setQuery(f.query)}
                      className="rounded-full border px-2.5 py-1 text-[11px] transition-colors"
                      style={{ borderColor: palette.border, color: palette.textSecondary, backgroundColor: palette.chipBg }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative flex-1 flex flex-col min-h-[200px]">
                <Search size={16} className="pointer-events-none absolute left-3.5 top-3.5" style={{ color: palette.textMuted }} />
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder='source_ip = "10.0.0.15" AND destination_port IN (4444, 5555)'
                  className="flex-1 w-full resize-none rounded-xl py-3 pl-10 pr-4 font-mono text-sm outline-none transition-colors"
                  style={{ backgroundColor: palette.fieldBg, border: `1px solid ${palette.border}`, color: palette.text }}
                />
              </div>
              
              <div className="mt-3 flex flex-wrap gap-4 text-[11px] mb-4" style={{ color: palette.textMuted }}>
                <span><strong style={{ color: palette.textSecondary }}>Fields:</strong> source_ip, destination_port, protocol, bytes_sent…</span>
                <span><strong style={{ color: palette.textSecondary }}>Operators:</strong> =, !=, IN, CONTAINS, BETWEEN</span>
              </div>

              <div className="flex w-full flex-col sm:flex-row gap-3">
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="flex-1 rounded-xl px-3 py-2.5 text-sm outline-none transition-colors"
                  style={{ backgroundColor: palette.fieldBg, border: `1px solid ${palette.border}`, color: palette.text }}
                >
                  {TIME_RANGES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                <button
                  onClick={() => handleHunt()}
                  disabled={loading}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-opacity disabled:opacity-50"
                  style={{ backgroundColor: palette.primary, color: palette.onPrimary }}
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                  Run Query
                </button>
              </div>
            </motion.div>

            {/* ---- Right Panel: Results ---- */}
            <div className="flex flex-col w-full lg:w-2/5 h-full overflow-hidden">
              {huntError && (
                <div className="mb-4 rounded-2xl border p-4 text-sm shrink-0" style={{ backgroundColor: palette.errorBg, borderColor: palette.errorBorder, color: palette.errorText }}>
                  {huntError}
                </div>
              )}

              <div className="mb-3 flex shrink-0 items-center gap-1 rounded-2xl border p-1" style={{ borderColor: palette.border, backgroundColor: palette.surface }}>
                {(["table", "timeline", "graph"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className="rounded-xl px-3.5 py-1.5 text-xs font-medium capitalize transition-colors"
                    style={{ backgroundColor: activeTab === tab ? `${palette.primary}22` : "transparent", color: activeTab === tab ? palette.primaryGlow : palette.textSecondary }}
                  >
                    {tab} view
                  </button>
                ))}
                <span className="ml-auto pr-2 text-[11px] font-medium" style={{ color: palette.textSecondary }}>
                  {total > 0 ? `${total} events found` : "No results yet"}
                </span>
              </div>

              {activeTab !== "table" ? (
                <div className="flex-1 rounded-[28px] border p-14 text-center flex flex-col justify-center items-center" style={{ borderColor: palette.border, backgroundColor: palette.surface }}>
                  <Activity size={22} className="mb-3" style={{ color: palette.textMuted }} />
                  <p className="text-sm" style={{ color: palette.textMuted }}>
                    {activeTab === "timeline" ? "Timeline" : "Graph"} view isn't implemented yet — table view has the real data.
                  </p>
                </div>
              ) : (
                <div className="flex-1 overflow-auto rounded-[24px] border backdrop-blur-xl relative" style={{ borderColor: palette.border, backgroundColor: palette.surface }}>
                  <table className="w-full border-collapse text-left">
                    <thead className="sticky top-0 z-10" style={{ backgroundColor: palette.headerBg }}>
                      <tr>
                        {["Timestamp", "Type", "Source", "Destination"].map((h) => (
                          <th key={h} className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider backdrop-blur-md" style={{ color: palette.textSecondary }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-16 text-center" style={{ color: palette.textSecondary }}>
                            <Loader2 size={20} className="mx-auto mb-3 animate-spin" style={{ color: palette.primary }} />
                            Executing hunt…
                          </td>
                        </tr>
                      ) : events.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-16 text-center" style={{ color: palette.textMuted }}>
                            <Search size={22} className="mx-auto mb-3 opacity-60" />
                            <p>No telemetry matched the query.</p>
                          </td>
                        </tr>
                      ) : (
                        <AnimatePresence>
                          {events.map((ev, i) => (
                            <motion.tr
                              key={ev._id || i}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0 }}
                              onClick={() => openEvent(ev)}
                              className="cursor-pointer border-t transition-colors"
                              style={{ borderColor: palette.border, backgroundColor: selectedEvent?._id === ev._id ? palette.surfaceHover : "transparent" }}
                            >
                              <td className="whitespace-nowrap px-5 py-3 font-mono text-xs" style={{ color: palette.textSecondary }}>
                                {new Date(ev.ingested_at).toLocaleString()}
                              </td>
                              <td className="whitespace-nowrap px-5 py-3">
                                <span className="rounded px-2 py-0.5 text-[11px] font-medium" style={{ backgroundColor: palette.chipBg, color: palette.text }}>
                                  {ev.label || ev.event_type || "NetworkFlow"}
                                </span>
                              </td>
                              <td className="whitespace-nowrap px-5 py-3 font-mono text-xs" style={{ color: palette.textSecondary }}>{ev.source_ip || "—"}</td>
                              <td className="whitespace-nowrap px-5 py-3 font-mono text-xs" style={{ color: palette.textSecondary }}>
                                {ev.destination_ip ? `${ev.destination_ip}:${ev.destination_port || ""}` : "—"}
                              </td>
                            </motion.tr>
                          ))}
                        </AnimatePresence>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ---- Event inspector drawer ---- */}
        <AnimatePresence>
          {selectedEvent && (
            <motion.div
              initial={{ x: 384, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 384, opacity: 0 }}
              transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              className="fixed right-0 top-0 z-50 flex h-full w-96 flex-col border-l backdrop-blur-xl"
              style={{ backgroundColor: palette.pageBg, borderColor: palette.border }}
            >
              <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: palette.border }}>
                <h3 className="flex items-center gap-2 text-sm font-semibold" style={{ color: palette.text }}>
                  <FileJson size={16} style={{ color: palette.primary }} />
                  Event Details
                </h3>
                <button onClick={() => setSelectedEvent(null)} className="rounded-lg p-1 transition-colors" style={{ color: palette.textMuted }}>
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 space-y-6 overflow-y-auto p-5">
                <div>
                  <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: palette.textSecondary }}>Investigation Actions</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <motion.button
                      whileHover={{ backgroundColor: `${palette.primary}33` }}
                      onClick={() => handlePivotIp(selectedEvent.source_ip)}
                      className="flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-colors"
                      style={{ backgroundColor: `${palette.primary}1a`, color: palette.primary }}
                    >
                      <Target size={14} /> Pivot IP
                    </motion.button>
                    <motion.button
                      whileHover={{ backgroundColor: palette.surfaceHover }}
                      onClick={() => handleEnrichIoc(selectedEvent.source_ip)}
                      className="flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-colors"
                      style={{ borderColor: palette.border, color: palette.text }}
                    >
                      <ShieldAlert size={14} /> Enrich IOC
                    </motion.button>
                    <motion.button
                      whileHover={{ backgroundColor: palette.surfaceHover }}
                      onClick={() => notImplemented("Rule creation")}
                      className="flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-colors"
                      style={{ borderColor: palette.border, color: palette.text }}
                    >
                      <Cpu size={14} /> Create Rule
                    </motion.button>
                    <motion.button
                      whileHover={{ backgroundColor: palette.surfaceHover }}
                      onClick={() => notImplemented("Adding to a case")}
                      className="flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-colors"
                      style={{ borderColor: palette.border, color: palette.text }}
                    >
                      <Server size={14} /> Add to Case
                    </motion.button>
                  </div>
                </div>

                {(enrichment.loading || enrichment.data || enrichment.error) && (
                  <div>
                    <h4 className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: palette.textSecondary }}>
                      <Fingerprint size={12} /> IOC Enrichment
                    </h4>
                    <div className="rounded-xl border p-3 text-xs" style={{ borderColor: palette.border, backgroundColor: palette.fieldBg }}>
                      {enrichment.loading ? (
                        <span className="flex items-center gap-2" style={{ color: palette.textSecondary }}>
                          <Loader2 size={13} className="animate-spin" /> Looking up {selectedEvent.source_ip}…
                        </span>
                      ) : enrichment.error ? (
                        <span style={{ color: palette.errorText }}>{enrichment.error}</span>
                      ) : (
                        <pre className="whitespace-pre-wrap font-mono" style={{ color: palette.text }}>{JSON.stringify(enrichment.data, null, 2)}</pre>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: palette.textSecondary }}>Entity Summary</h4>
                  <div className="space-y-2 rounded-xl p-3" style={{ backgroundColor: palette.fieldBg }}>
                    {[
                      ["Time", new Date(selectedEvent.ingested_at).toLocaleString()],
                      ["Src IP", selectedEvent.source_ip || "—"],
                      ["Dst IP", selectedEvent.destination_ip || "—"],
                      ["Dst Port", selectedEvent.destination_port ?? "—"],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between text-sm">
                        <span style={{ color: palette.textSecondary }}>{label}:</span>
                        <span className="font-mono" style={{ color: palette.text }}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: palette.textSecondary }}>Raw JSON</h4>
                  {/* Intentionally a fixed dark "terminal" look regardless of page theme — matches
                      the convention of code/log viewers staying dark even in light-themed apps. */}
                  <div className="overflow-x-auto rounded-xl border p-4 text-xs" style={{ backgroundColor: "rgba(0,0,0,0.55)", borderColor: palette.border, color: "#4ade80" }}>
                    <pre className="font-mono">{JSON.stringify(selectedEvent, null, 2)}</pre>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
