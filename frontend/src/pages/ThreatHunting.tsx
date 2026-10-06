import { useMemo, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
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
  ShieldCheck,
  AlertTriangle,
  Cpu,
  Loader2,
  Fingerprint,
  Sparkles,
  ArrowRight,
  Lock,
  Globe,
  CheckCircle2,
  MessageSquareText,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Info,
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

export interface EventAnalysis {
  headline: string;
  verdict: "safe" | "warning" | "danger" | "info";
  verdictLabel: string;
  plainEnglish: string;
  implications: string;
  recommendedAction: string;
  serviceName: string;
  direction: "Outbound" | "Inbound" | "Internal LAN" | "External";
  riskScore: number;
  processName?: string;
  iconType: "shieldCheck" | "shieldAlert" | "alertTriangle" | "globe" | "lock";
}

function isPrivateIp(ip?: string): boolean {
  if (!ip) return false;
  if (ip === "127.0.0.1" || ip === "localhost" || ip === "::1") return true;
  if (ip.startsWith("10.") || ip.startsWith("192.168.")) return true;
  if (ip.startsWith("172.")) {
    const parts = ip.split(".");
    const second = parseInt(parts[1], 10);
    if (!isNaN(second) && second >= 16 && second <= 31) return true;
  }
  return false;
}

function analyzeHuntEvent(ev: HuntEvent): EventAnalysis {
  const src = ev.source_ip || "";
  const dst = ev.destination_ip || "";
  const port = ev.destination_port ?? 0;
  const proto = (ev.protocol || "TCP").toUpperCase();
  const action = (ev.action || "allow").toLowerCase();
  const severity = (ev.severity || "low").toLowerCase();
  const evType = (ev.event_type || "").toLowerCase();
  const processName = ev.process_name || ev.raw?.process_name || "";
  const reason = ev.raw?.reason || "";

  const isSrcPrivate = isPrivateIp(src);
  const isDstPrivate = isPrivateIp(dst);

  let direction: "Outbound" | "Inbound" | "Internal LAN" | "External" = "Outbound";
  if (isSrcPrivate && !isDstPrivate) {
    direction = "Outbound";
  } else if (!isSrcPrivate && isDstPrivate) {
    direction = "Inbound";
  } else if (isSrcPrivate && isDstPrivate) {
    direction = "Internal LAN";
  } else {
    direction = "External";
  }

  let headline = `Network Communication (${proto} Port ${port})`;
  let verdict: "safe" | "warning" | "danger" | "info" = "info";
  let verdictLabel = "Operational Flow";
  let plainEnglish = `A network packet was routed between ${src || "source"} and ${dst || "destination"} over ${proto} port ${port}.`;
  let implications = "Standard telemetry captured by the SentinelX sensor stream.";
  let recommendedAction = "Review event attributes or pivot on IP to view historical patterns.";
  let serviceName = `Port ${port}`;
  let riskScore = 15;
  let iconType: "shieldCheck" | "shieldAlert" | "alertTriangle" | "globe" | "lock" = "globe";

  if (port === 22) {
    serviceName = "SSH (Secure Shell, Port 22)";
    if (direction === "Inbound" || severity === "high" || severity === "critical" || action === "blocked") {
      headline = "Blocked Inbound SSH Brute-Force Attempt";
      verdict = "danger";
      verdictLabel = "High-Risk Intrusion Probe";
      plainEnglish = `An external remote machine (${src}) attempted an unauthorized connection to Port 22 (SSH Server Administration) on your host. SentinelX defenses intercepted and blocked the connection.`;
      implications = reason || "External botnets scan the internet for machines with exposed SSH ports to launch automated dictionary or password-guessing attacks.";
      recommendedAction = "Maintain port blocking, ensure Port 22 is not forwarded to the WAN, and require cryptographic keys instead of passwords.";
      riskScore = 85;
      iconType = "shieldAlert";
    } else {
      headline = "Outbound SSH Remote Administration";
      verdict = "warning";
      verdictLabel = "Administrative Remote Access";
      plainEnglish = `An outbound SSH management session was established from your host to ${dst} on port 22.`;
      implications = "Used for remote shell administration, server deployment, or Git over SSH.";
      recommendedAction = "Verify that this remote server is an authorized organization asset.";
      riskScore = 30;
      iconType = "lock";
    }
  } else if (port === 4444 || evType === "port_scan") {
    serviceName = "Metasploit / Reverse Shell Probe (Port 4444)";
    headline = "Blocked Metasploit Port Scan / Probe";
    verdict = "danger";
    verdictLabel = "Malicious Reconnaissance";
    plainEnglish = `An external scanner (${src}) probed your machine specifically targeting Port 4444 — the default listener port used by Metasploit payloads and command-and-control shells. The probe was dropped.`;
    implications = reason || "The attacker is conducting adversarial reconnaissance to discover if an active reverse shell or backdoor is running on your endpoint.";
    recommendedAction = "Firewall has dropped the probe. Add source IP to the perimeter blocklist and verify no unauthorized listeners are bound to local port 4444.";
    riskScore = 92;
    iconType = "shieldAlert";
  } else if (port === 443) {
    serviceName = "HTTPS (Hypertext Transfer Protocol Secure, Port 443)";
    headline = "Encrypted Web Session (HTTPS)";
    verdict = "safe";
    verdictLabel = "Benign Web Activity";
    plainEnglish = `Your computer (${src}) established a secure, encrypted HTTPS connection over Port 443 to a remote web server (${dst}). All data is encrypted in transit using TLS/SSL.`;
    implications = "Normal everyday web browsing, cloud API exchange, or application sync. Traffic content cannot be intercepted in transit.";
    recommendedAction = "Normal expected telemetry. No administrative or security remediation is needed.";
    riskScore = 5;
    iconType = "shieldCheck";
  } else if (port === 53 || evType === "dns_query") {
    serviceName = "DNS (Domain Name System, Port 53)";
    headline = "Domain Name Resolution Query";
    verdict = "safe";
    verdictLabel = "Network Lookup";
    const domain = ev.dns_query || "external host";
    plainEnglish = `Your machine contacted a DNS resolver (${dst}:53) to convert the domain name "${domain}" into an IP address so a connection could be made.`;
    implications = "Standard internet name lookup. Essential for reaching websites, services, and cloud APIs.";
    recommendedAction = "Safe operational event. (Monitor if anomalous high-frequency random subdomains occur, which could indicate DNS tunneling).";
    riskScore = 8;
    iconType = "globe";
  } else if (port === 80) {
    serviceName = "HTTP (Unencrypted Web, Port 80)";
    headline = "Cleartext Web Traffic (HTTP)";
    verdict = "warning";
    verdictLabel = "Unencrypted Protocol";
    plainEnglish = `An unencrypted HTTP connection was observed on Port 80. Content sent across this connection is transmitted in plaintext.`;
    implications = "Susceptible to on-path eavesdropping or interception on untrusted public networks.";
    recommendedAction = "Upgrade target service to HTTPS (Port 443) wherever feasible.";
    riskScore = 35;
    iconType = "alertTriangle";
  } else if (port === 3389) {
    serviceName = "RDP (Remote Desktop Protocol, Port 3389)";
    headline = "Windows Remote Desktop (RDP) Traffic";
    verdict = direction === "Inbound" ? "danger" : "warning";
    verdictLabel = direction === "Inbound" ? "High-Risk Remote Access" : "Remote Management";
    plainEnglish = `Traffic was detected on Port 3389, which provides full graphical desktop control over Windows machines.`;
    implications = "RDP is a top target for ransomware operators seeking initial access or lateral movement.";
    recommendedAction = "Ensure RDP is never exposed to the public internet. Require a VPN and MFA.";
    riskScore = 80;
    iconType = "lock";
  } else if (severity === "critical" || severity === "high" || action === "blocked" || action === "dropped") {
    headline = `Threat Alert Intercepted (${evType || "Security Event"})`;
    verdict = "danger";
    verdictLabel = "Blocked Security Threat";
    plainEnglish = `SentinelX detected a high-priority threat pattern between ${src} and ${dst} on port ${port}. The defensive action was recorded as "${action}".`;
    implications = reason || "Activity matched a critical anomaly signature or behavioral detection threshold.";
    recommendedAction = "Inspect source reputation, verify host endpoint state, and escalate to an incident case if unauthorized.";
    riskScore = 88;
    iconType = "shieldAlert";
  } else {
    headline = `Network Communication (${proto} Port ${port})`;
    verdict = "info";
    verdictLabel = "Operational Flow";
    plainEnglish = `Telemetry captured an active ${direction.toLowerCase()} network flow between ${src} and ${dst}. Action: ${action}.`;
    implications = reason || "Normal network flow recorded during routine system operation.";
    recommendedAction = "No immediate threat detected. Cross-reference with host logs if investigating unusual behavior.";
    riskScore = 15;
    iconType = "globe";
  }

  return {
    headline,
    verdict,
    verdictLabel,
    plainEnglish,
    implications,
    recommendedAction,
    serviceName,
    direction,
    riskScore,
    processName,
    iconType,
  };
}

const QUICK_FILTERS = [
  { label: "My IP (10.255.90.146)", query: 'source_ip = "10.255.90.146" OR destination_ip = "10.255.90.146"' },
  { label: "Malicious ports", query: 'destination_port IN (4444, 31337, 12345, 6666, 6667)' },
  { label: "Remote access", query: 'destination_port IN (22, 23, 3389, 5900)' },
  { label: "High/Critical alerts", query: 'severity IN ("high", "critical")' },
  { label: "Large transfers", query: "bytes_sent >= 50000000" },
];

const TIME_RANGES = [
  { value: "15m", label: "Last 15 minutes" },
  { value: "1h", label: "Last 1 hour" },
  { value: "6h", label: "Last 6 hours" },
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "all", label: "All time" },
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
  const navigate = useNavigate();

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
  const [copiedJson, setCopiedJson] = useState(false);
  const [jsonExpanded, setJsonExpanded] = useState(false);

  function notImplemented(action: string) {
    setNotice(`${action} isn't wired up yet.`);
    window.setTimeout(() => setNotice(null), 2600);
  }

  function handleCopyJson(data: any) {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  }

  function handleAskAi(ev: HuntEvent, a: EventAnalysis) {
    const prompt = `Investigate this network security event from Threat Hunting:
- Event: ${a.headline} (${a.verdictLabel})
- Direction: ${a.direction} (${ev.source_ip || "Unknown"} -> ${ev.destination_ip || "Unknown"}:${ev.destination_port ?? "N/A"})
- Protocol: ${ev.protocol || "TCP"}
- Process: ${a.processName || "N/A"}
- Severity / Action: ${ev.severity || "low"} / ${ev.action || "allow"}
- Reason / Context: ${ev.raw?.reason || a.implications}

Please provide:
1. Root cause analysis & attacker methodology
2. MITRE ATT&CK technique mapping
3. Step-by-step remediation actions for the SOC team`;

    navigate(`/ai-assistant?prompt=${encodeURIComponent(prompt)}`);
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
        <div className="relative transition-all duration-300" style={{ marginRight: selectedEvent ? 460 : 0 }}>
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
          {selectedEvent && (() => {
            const analysis = analyzeHuntEvent(selectedEvent);

            return (
              <motion.div
                initial={{ x: 460, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 460, opacity: 0 }}
                transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                className="fixed right-0 top-0 z-50 flex h-full w-[460px] max-w-[95vw] flex-col border-l backdrop-blur-2xl shadow-[-20px_0_50px_rgba(0,0,0,0.6)]"
                style={{ backgroundColor: palette.pageBg, borderColor: palette.border }}
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: palette.border }}>
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                      <FileJson size={16} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold" style={{ color: palette.text }}>
                        Event Investigation
                      </h3>
                      <p className="text-[11px] font-mono text-slate-400">
                        ID: {selectedEvent._id?.slice(-8) || "telemetry"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedEvent(null)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="flex-1 space-y-5 overflow-y-auto p-5">
                  {/* ============================================================ */}
                  {/* DEDICATED: WHAT IT ACTUALLY MEANS // SECURITY ANALYSIS */}
                  {/* ============================================================ */}
                  <div
                    className="rounded-2xl border p-4.5 backdrop-blur-xl relative overflow-hidden shadow-xl"
                    style={{
                      borderColor:
                        analysis.verdict === "danger"
                          ? "rgba(244,63,94,0.38)"
                          : analysis.verdict === "safe"
                          ? "rgba(16,185,129,0.38)"
                          : analysis.verdict === "warning"
                          ? "rgba(245,158,11,0.38)"
                          : "rgba(56,189,248,0.38)",
                      background:
                        analysis.verdict === "danger"
                          ? "linear-gradient(135deg, rgba(244,63,94,0.12) 0%, rgba(15,23,42,0.7) 100%)"
                          : analysis.verdict === "safe"
                          ? "linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(15,23,42,0.7) 100%)"
                          : analysis.verdict === "warning"
                          ? "linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(15,23,42,0.7) 100%)"
                          : "linear-gradient(135deg, rgba(56,189,248,0.12) 0%, rgba(15,23,42,0.7) 100%)",
                    }}
                  >
                    {/* Ambient Glow */}
                    <div
                      className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full blur-3xl"
                      style={{
                        backgroundColor:
                          analysis.verdict === "danger"
                            ? "rgba(244,63,94,0.25)"
                            : analysis.verdict === "safe"
                            ? "rgba(16,185,129,0.25)"
                            : analysis.verdict === "warning"
                            ? "rgba(245,158,11,0.25)"
                            : "rgba(56,189,248,0.25)",
                      }}
                    />

                    {/* Section Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-200">
                        <Sparkles size={13} className="text-cyan-400 animate-pulse" />
                        WHAT IT ACTUALLY MEANS
                      </div>
                      <span
                        className="rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider border shadow-sm"
                        style={{
                          borderColor:
                            analysis.verdict === "danger"
                              ? "rgba(244,63,94,0.45)"
                              : analysis.verdict === "safe"
                              ? "rgba(16,185,129,0.45)"
                              : analysis.verdict === "warning"
                              ? "rgba(245,158,11,0.45)"
                              : "rgba(56,189,248,0.45)",
                          color:
                            analysis.verdict === "danger"
                              ? "#fb7185"
                              : analysis.verdict === "safe"
                              ? "#34d399"
                              : analysis.verdict === "warning"
                              ? "#fbbf24"
                              : "#38bdf8",
                          backgroundColor:
                            analysis.verdict === "danger"
                              ? "rgba(244,63,94,0.2)"
                              : analysis.verdict === "safe"
                              ? "rgba(16,185,129,0.2)"
                              : analysis.verdict === "warning"
                              ? "rgba(245,158,11,0.2)"
                              : "rgba(56,189,248,0.2)",
                        }}
                      >
                        {analysis.verdictLabel}
                      </span>
                    </div>

                    {/* Headline */}
                    <h4 className="text-sm font-bold text-white mb-2 leading-snug">
                      {analysis.headline}
                    </h4>

                    {/* Plain English explanation */}
                    <p className="text-xs text-slate-200 leading-relaxed mb-4">
                      {analysis.plainEnglish}
                    </p>

                    {/* Key Telemetry Badges */}
                    <div className="grid grid-cols-2 gap-2 mb-3.5 text-[11px] font-mono">
                      <div className="rounded-xl border border-white/10 bg-black/35 p-2.5">
                        <span className="text-slate-400 block text-[9px] uppercase tracking-wider">FLOW DIRECTION</span>
                        <div className="font-semibold text-white flex items-center gap-1.5 mt-0.5">
                          <ArrowRight
                            size={12}
                            className={analysis.direction === "Inbound" ? "text-rose-400 rotate-180" : "text-cyan-400"}
                          />
                          {analysis.direction}
                        </div>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-black/35 p-2.5">
                        <span className="text-slate-400 block text-[9px] uppercase tracking-wider">SERVICE / ROLE</span>
                        <div className="font-semibold text-white truncate mt-0.5">
                          {analysis.serviceName}
                        </div>
                      </div>
                      {analysis.processName && (
                        <div className="rounded-xl border border-white/10 bg-black/35 p-2.5">
                          <span className="text-slate-400 block text-[9px] uppercase tracking-wider">PROCESS ATTRIBUTION</span>
                          <div className="font-semibold text-white truncate mt-0.5">
                            {analysis.processName}
                          </div>
                        </div>
                      )}
                      <div className="rounded-xl border border-white/10 bg-black/35 p-2.5">
                        <span className="text-slate-400 block text-[9px] uppercase tracking-wider">ESTIMATED RISK</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-bold text-white">{analysis.riskScore}/100</span>
                          <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full transition-all duration-500 rounded-full"
                              style={{
                                width: `${analysis.riskScore}%`,
                                backgroundColor:
                                  analysis.riskScore > 70
                                    ? "#f43f5e"
                                    : analysis.riskScore > 30
                                    ? "#f59e0b"
                                    : "#10b981",
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Security Implications / Why It Matters */}
                    <div className="rounded-xl border border-white/10 bg-black/30 p-3 mb-2.5">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-300 mb-1 flex items-center gap-1.5">
                        <Info size={12} className="text-cyan-400" />
                        WHY THIS MATTERS
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {analysis.implications}
                      </p>
                    </div>

                    {/* Recommended Action */}
                    <div className="rounded-xl border border-white/10 bg-black/30 p-3 mb-3.5">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-300 mb-1 flex items-center gap-1.5">
                        <CheckCircle2 size={12} className="text-emerald-400" />
                        RECOMMENDED NEXT STEPS
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {analysis.recommendedAction}
                      </p>
                    </div>

                    {/* Ask AI Copilot Button */}
                    <button
                      type="button"
                      onClick={() => handleAskAi(selectedEvent, analysis)}
                      className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-xs font-semibold bg-gradient-to-r from-cyan-500/25 via-sky-500/30 to-blue-500/25 hover:from-cyan-500/35 hover:to-blue-500/35 border border-cyan-400/40 text-cyan-200 hover:text-white transition-all shadow-md cursor-pointer group"
                    >
                      <MessageSquareText size={14} className="text-cyan-300 group-hover:scale-110 transition-transform" />
                      Ask AI Copilot for Full Investigation
                      <ArrowRight size={12} className="text-cyan-400 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>

                  {/* ============================================================ */}
                  {/* INVESTIGATION ACTIONS */}
                  {/* ============================================================ */}
                  <div>
                    <h4 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: palette.textSecondary }}>
                      Analyst Actions
                    </h4>
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

                  {/* ============================================================ */}
                  {/* IOC ENRICHMENT (IF LOADED) */}
                  {/* ============================================================ */}
                  {(enrichment.loading || enrichment.data || enrichment.error) && (
                    <div>
                      <h4 className="mb-2.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: palette.textSecondary }}>
                        <Fingerprint size={12} /> IOC Threat Intelligence
                      </h4>
                      <div className="rounded-xl border p-3.5 text-xs backdrop-blur-md" style={{ borderColor: palette.border, backgroundColor: palette.fieldBg }}>
                        {enrichment.loading ? (
                          <span className="flex items-center gap-2" style={{ color: palette.textSecondary }}>
                            <Loader2 size={13} className="animate-spin text-cyan-400" /> Looking up {selectedEvent.source_ip}…
                          </span>
                        ) : enrichment.error ? (
                          <span style={{ color: palette.errorText }}>{enrichment.error}</span>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-slate-300 pb-1.5 border-b border-white/10 font-mono text-[11px]">
                              <span>Abuse Confidence:</span>
                              <span className={`font-bold ${enrichment.data?.data?.abuse_confidence_score > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                                {enrichment.data?.data?.abuse_confidence_score ?? 0}%
                              </span>
                            </div>
                            <pre className="whitespace-pre-wrap font-mono text-[11px] text-slate-300 max-h-48 overflow-y-auto">
                              {JSON.stringify(enrichment.data, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ============================================================ */}
                  {/* ENTITY SUMMARY */}
                  {/* ============================================================ */}
                  <div>
                    <h4 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: palette.textSecondary }}>
                      Entity Summary
                    </h4>
                    <div className="space-y-2.5 rounded-xl p-3.5 border border-white/[0.08]" style={{ backgroundColor: palette.fieldBg }}>
                      {[
                        ["Timestamp", new Date(selectedEvent.ingested_at).toLocaleString()],
                        ["Source IP", selectedEvent.source_ip || "—"],
                        ["Destination IP", selectedEvent.destination_ip || "—"],
                        ["Destination Port", selectedEvent.destination_port ? `${selectedEvent.destination_port} (${analysis.serviceName})` : "—"],
                        ["Protocol", selectedEvent.protocol || "TCP"],
                        ["Sensor Action", selectedEvent.action || "allow"],
                        ["Severity", selectedEvent.severity || "low"],
                      ].map(([label, value]) => (
                        <div key={label} className="flex items-center justify-between text-xs">
                          <span style={{ color: palette.textSecondary }}>{label}:</span>
                          <span className="font-mono font-medium text-slate-200">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ============================================================ */}
                  {/* RAW JSON (COLLAPSIBLE WITH COPY BUTTON) */}
                  {/* ============================================================ */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <button
                        type="button"
                        onClick={() => setJsonExpanded((prev) => !prev)}
                        className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 hover:text-white transition-colors cursor-pointer"
                      >
                        {jsonExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        Raw Log Payload ({jsonExpanded ? "Collapse" : "Expand"})
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopyJson(selectedEvent)}
                        className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-mono text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                      >
                        {copiedJson ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                        {copiedJson ? "Copied" : "Copy JSON"}
                      </button>
                    </div>

                    {jsonExpanded && (
                      <div className="overflow-x-auto rounded-xl border p-3.5 text-[11px]" style={{ backgroundColor: "rgba(0,0,0,0.65)", borderColor: palette.border, color: "#4ade80" }}>
                        <pre className="font-mono leading-relaxed">{JSON.stringify(selectedEvent, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })()}
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
