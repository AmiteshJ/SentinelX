import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertOctagon,
  AlertTriangle,
  AlertCircle,
  Info,
  X,
  Shield,
  Activity,
  ExternalLink,
  Clock,
  ArrowRight,
  Zap,
  CheckCircle2,
  Copy,
  Check,
  RefreshCw,
  Crosshair,
  FileText
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../api/client";
import { useTheme } from "../../theme/ThemeProvider";
import type { Alert } from "../../types/api";

export interface ThreatOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  severity: "critical" | "high" | "medium" | "low" | null;
  count: number;
  scope?: string;
  selectedHost?: string | null;
  onOpenGraph?: () => void;
}

const SEVERITY_CONFIG = {
  critical: {
    label: "Critical Threats",
    singular: "Critical Alert",
    icon: AlertOctagon,
    color: "#f87171",
    bgColor: "rgba(239, 68, 68, 0.15)",
    borderColor: "rgba(239, 68, 68, 0.35)",
    ringColor: "rgba(239, 68, 68, 0.45)",
    badgeBg: "bg-red-500/20 text-red-300 border-red-500/40",
    sla: "< 15 Minutes (Immediate Containment)",
    riskScoreRange: "9.0 - 10.0 (High Risk)",
    justification:
      "Critical detections indicate confirmed, high-fidelity security compromises demanding immediate intervention. This includes confirmed remote code execution, ransomware encryptor staging, active Command & Control (C2) beaconing, rootkit execution, or credential dumping (e.g., Mimikatz/LSASS tampering). Unaddressed critical threats can result in immediate host takeover and widespread data exfiltration.",
    criteria: [
      "Confirmed exploit execution or unauthorized root/SYSTEM shell spawned",
      "Ransomware indicators: mass file tampering, shadow copy deletion, or known extension renaming",
      "Active C2 communications to verified malicious threat actor infrastructure",
      "LSASS memory injection or automated Kerberoasting attack pattern",
    ],
    soarAction: "Automatic host firewall isolation & immediate task kill of offending process PID",
  },
  high: {
    label: "High Threats",
    singular: "High Alert",
    icon: AlertTriangle,
    color: "#fb923c",
    bgColor: "rgba(249, 115, 22, 0.15)",
    borderColor: "rgba(249, 115, 22, 0.35)",
    ringColor: "rgba(249, 115, 22, 0.45)",
    badgeBg: "bg-orange-500/20 text-orange-300 border-orange-500/40",
    sla: "< 1 Hour (Priority Investigation)",
    riskScoreRange: "7.0 - 8.9 (Elevated Risk)",
    justification:
      "High severity alerts signify significant unauthorized activity, privilege escalation, or defense evasion. While an adversary may not yet have achieved complete domain dominance, high threats indicate active breach staging, pass-the-hash movements, malicious PowerShell obfuscation, or unauthorized configuration tampering.",
    criteria: [
      "Obfuscated PowerShell or encoded command line arguments execution",
      "Unauthorized service creation or registry run-key persistence",
      "Repeated brute-force authentication success followed by immediate privilege escalation",
      "Suspicious egress connection to anomalous foreign Autonomous System (ASN)",
    ],
    soarAction: "Snapshot host memory forensic state, stage firewall containment rule, and trigger SOC case escalation",
  },
  medium: {
    label: "Medium Threats",
    singular: "Medium Alert",
    icon: AlertCircle,
    color: "#fbbf24",
    bgColor: "rgba(245, 158, 11, 0.15)",
    borderColor: "rgba(245, 158, 11, 0.35)",
    ringColor: "rgba(245, 158, 11, 0.45)",
    badgeBg: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    sla: "< 4 Hours (Standard SOC Triage)",
    riskScoreRange: "4.0 - 6.9 (Moderate Risk)",
    justification:
      "Medium severity detections capture anomalous behaviors, network sweeps, and policy infractions. While frequently triggered by benign administrative tasks, vulnerability scanners, or atypical user workflows, they serve as crucial early warning signals for multi-hop attack chains.",
    criteria: [
      "Network port scanning (TCP SYN sweep / internal host discovery)",
      "High frequency failed authentication attempts against SSH or RDP",
      "Off-hours administrative logons or unexpected VPN session geo-hopping",
      "Unsigned binary executing from temporary or user-writable paths (%TEMP%, %APPDATA%)",
    ],
    soarAction: "Automated threat intelligence IP reputation enrichment and correlation into incident graph",
  },
  low: {
    label: "Low Threats",
    singular: "Low Alert",
    icon: Info,
    color: "#38bdf8",
    bgColor: "rgba(56, 189, 248, 0.15)",
    borderColor: "rgba(56, 189, 248, 0.35)",
    ringColor: "rgba(56, 189, 248, 0.45)",
    badgeBg: "bg-sky-500/20 text-sky-300 border-sky-500/40",
    sla: "< 24 Hours (Informational Tracking)",
    riskScoreRange: "0.1 - 3.9 (Low Risk / Audit)",
    justification:
      "Low severity alerts reflect audit telemetry, non-exploitable configuration drifts, and hygiene deviations. They provide deep forensic context when tracing the precursor events of a more advanced adversary campaign.",
    criteria: [
      "Informational software install or driver load registration",
      "Minor security policy baseline deviations",
      "Routine external ping/ICMP discovery probes",
      "Local account password change or certificate auto-renewal",
    ],
    soarAction: "Log to cold SIEM storage and increment asset baseline telemetry counters",
  },
} as const;

export function ThreatOverviewModal({
  isOpen,
  onClose,
  severity,
  count,
  scope,
  selectedHost,
  onOpenGraph,
}: ThreatOverviewModalProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const navigate = useNavigate();

  // Cache the last valid severity so exit animations render smoothly without glitching
  const [activeSeverity, setActiveSeverity] = useState<"critical" | "high" | "medium" | "low">("critical");

  useEffect(() => {
    if (severity) {
      setActiveSeverity(severity);
    }
  }, [severity]);

  const config = SEVERITY_CONFIG[activeSeverity];
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchSeverityAlerts() {
      if (!isOpen || !severity) return;
      setLoading(true);
      try {
        const params: Record<string, string> = {
          severity,
          limit: "15",
        };
        if (scope && scope !== "all") {
          params.scope = scope;
        }
        if (selectedHost) {
          params.hostname = selectedHost;
        }
        const res = await apiClient.get<{ items: Alert[] }>("/api/alerts", { params });
        if (isMounted) {
          setAlerts(res.data?.items || []);
        }
      } catch (err) {
        console.error("Failed to fetch alerts for threat modal:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchSeverityAlerts();
    return () => {
      isMounted = false;
    };
  }, [isOpen, severity, scope, selectedHost]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const SevIcon = config.icon;

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          {/* Backdrop with smooth fade */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 dark:bg-black/85 backdrop-blur-md"
          />

          {/* Modal Container: smooth scale and fade without glitchy layout morphing */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`${config.label} Breakdown & Justification`}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className={`relative z-10 flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] border shadow-2xl ${
              isDark
                ? "bg-[#060b16] border-slate-800 text-slate-100 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.95)]"
                : "bg-white border-[#e2d9cc] text-[#282937] shadow-[0_20px_60px_rgba(40,41,55,0.18)]"
            }`}
          >
            {/* Ambient Background Glow */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div
                className="absolute -top-32 -left-32 h-[380px] w-[380px] rounded-full blur-[140px] opacity-40 dark:opacity-80"
                style={{ backgroundColor: config.bgColor }}
              />
              <div
                className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent ${
                  isDark ? "via-white/20" : "via-[#e2d9cc]"
                } to-transparent`}
              />
            </div>

            {/* Header */}
            <div
              className={`relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b px-6 py-5 ${
                isDark ? "border-slate-800 bg-[#070d1a]" : "border-[#e2d9cc] bg-white"
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border shadow-md"
                  style={{ borderColor: config.ringColor, backgroundColor: config.bgColor }}
                >
                  <SevIcon size={24} style={{ color: config.color }} />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className={`text-xl font-bold tracking-tight ${isDark ? "text-white" : "text-[#282937]"}`}>
                      {config.label} Overview
                    </h2>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-mono font-bold border ${config.badgeBg}`}>
                      {count} Active
                    </span>
                  </div>
                  <p className={`text-xs mt-0.5 ${isDark ? "text-slate-400" : "text-[#58565e]"}`}>
                    Threat categorization, analytical justification, and contributing security telemetry
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close modal"
                className={`self-end sm:self-auto flex h-9 w-9 items-center justify-center rounded-xl transition-colors cursor-pointer ${
                  isDark
                    ? "text-slate-400 hover:bg-slate-800 hover:text-white"
                    : "text-[#58565e] hover:bg-[#f8f4ec] hover:text-[#282937]"
                }`}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div
              className={`relative flex-1 overflow-y-auto px-6 py-5 space-y-6 ${
                isDark ? "bg-[#060b16] text-slate-200" : "bg-white text-[#282937]"
              }`}
            >
              {/* Section 1: Threat Justification Card */}
              <div
                className={`rounded-2xl border p-5 ${
                  isDark
                    ? "bg-[#0a101f] border-slate-800/90 shadow-inner"
                    : "bg-[#fefbf4] border-[#e2d9cc] shadow-xs"
                }`}
              >
                <div
                  className={`flex items-center gap-2 mb-2.5 text-xs font-bold uppercase tracking-wider ${
                    isDark ? "text-slate-200" : "text-[#282937]"
                  }`}
                >
                  <Shield size={14} style={{ color: config.color }} />
                  <span>Count Justification &amp; SOC Threat Definition</span>
                </div>
                <p className={`text-xs leading-relaxed font-sans ${isDark ? "text-slate-300" : "text-[#4a4b5e]"}`}>
                  {config.justification}
                </p>

                {/* Sub-grid of SLA & Risk Parameters */}
                <div
                  className={`mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-3.5 border-t ${
                    isDark ? "border-slate-800/80" : "border-[#e2d9cc]"
                  }`}
                >
                  <div
                    className={`p-3 rounded-xl border ${
                      isDark ? "bg-[#050913] border-slate-800/80" : "bg-white border-[#e2d9cc] shadow-xs"
                    }`}
                  >
                    <span className={`text-[10px] uppercase tracking-wider block font-mono ${isDark ? "text-slate-500" : "text-[#58565e]"}`}>
                      Response SLA
                    </span>
                    <span className={`text-xs font-semibold mt-0.5 block ${isDark ? "text-slate-200" : "text-[#282937]"}`}>
                      {config.sla}
                    </span>
                  </div>

                  <div
                    className={`p-3 rounded-xl border ${
                      isDark ? "bg-[#050913] border-slate-800/80" : "bg-white border-[#e2d9cc] shadow-xs"
                    }`}
                  >
                    <span className={`text-[10px] uppercase tracking-wider block font-mono ${isDark ? "text-slate-500" : "text-[#58565e]"}`}>
                      CVSS / Risk Range
                    </span>
                    <span className={`text-xs font-semibold mt-0.5 block ${isDark ? "text-slate-200" : "text-[#282937]"}`}>
                      {config.riskScoreRange}
                    </span>
                  </div>

                  <div
                    className={`p-3 rounded-xl border ${
                      isDark ? "bg-[#050913] border-slate-800/80" : "bg-white border-[#e2d9cc] shadow-xs"
                    }`}
                  >
                    <span className={`text-[10px] uppercase tracking-wider block font-mono ${isDark ? "text-slate-500" : "text-[#58565e]"}`}>
                      Target Scope
                    </span>
                    <span className={`text-xs font-semibold mt-0.5 block ${isDark ? "text-slate-200" : "text-[#282937]"}`}>
                      {selectedHost ? `Host: ${selectedHost}` : scope === "personal" ? "Local Agent" : "All Fleet"}
                    </span>
                  </div>
                </div>

                {/* Trigger Criteria Bullet points */}
                <div
                  className={`mt-3.5 pt-3.5 border-t ${
                    isDark ? "border-slate-800/80" : "border-[#e2d9cc]"
                  }`}
                >
                  <span className={`text-[11px] font-semibold block mb-2 ${isDark ? "text-slate-300" : "text-[#58565e]"}`}>
                    Primary Detection Criteria for this Severity:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {config.criteria.map((crit, idx) => (
                      <div
                        key={idx}
                        className={`flex items-start gap-2 text-[11px] ${
                          isDark ? "text-slate-300" : "text-[#4a4b5e]"
                        }`}
                      >
                        <CheckCircle2 size={13} className="shrink-0 mt-0.5" style={{ color: config.color }} />
                        <span>{crit}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* SOAR Action Recommendation */}
                <div
                  className={`mt-3 pt-3 border-t flex items-center gap-2 text-[11px] ${
                    isDark ? "border-slate-800/80 text-slate-300" : "border-[#e2d9cc] text-[#4a4b5e]"
                  }`}
                >
                  <Zap size={14} className="text-amber-400 shrink-0" />
                  <span>
                    <strong className={isDark ? "text-amber-300" : "text-amber-700"}>Automated SOAR Action:</strong> {config.soarAction}
                  </span>
                </div>
              </div>

              {/* Section 2: Recent Contributing Detections */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Activity size={14} className="text-cyan-400" />
                    <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-slate-200" : "text-[#282937]"}`}>
                      Recent {config.label} Telemetry ({alerts.length} Displayed)
                    </h3>
                  </div>
                  <span className={`text-[11px] ${isDark ? "text-slate-500" : "text-[#58565e]"}`}>
                    Sourced from Realtime Telemetry &amp; Sigma Ingestion
                  </span>
                </div>

                {loading ? (
                  <div
                    className={`flex h-36 flex-col items-center justify-center gap-2 rounded-2xl border ${
                      isDark ? "bg-[#0a101f] border-slate-800" : "bg-[#fefbf4] border-[#e2d9cc]"
                    }`}
                  >
                    <RefreshCw size={18} className="animate-spin text-cyan-400" />
                    <span className={`text-xs ${isDark ? "text-slate-400" : "text-[#58565e]"}`}>Loading alerts telemetry...</span>
                  </div>
                ) : alerts.length === 0 ? (
                  <div
                    className={`p-8 rounded-2xl border text-center ${
                      isDark ? "bg-[#0a101f] border-slate-800/80 text-slate-400" : "bg-[#fefbf4] border-[#e2d9cc] text-[#58565e]"
                    }`}
                  >
                    <p className="text-xs">
                      No active {activeSeverity} alerts currently recorded in the active scope.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {alerts.map((al) => (
                      <div
                        key={al.id}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border transition-colors ${
                          isDark
                            ? "bg-[#0a101f] border-slate-800/90 hover:bg-[#0f172a] shadow-xs"
                            : "bg-white border-[#e2d9cc] hover:bg-[#fefbf4] shadow-xs"
                        }`}
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`font-semibold text-xs truncate ${isDark ? "text-slate-100" : "text-[#282937]"}`}>
                              {al.rule_name || "Telemetry Alert"}
                            </span>
                            {al.mitre_technique && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/15 border border-purple-500/30 text-purple-300 font-semibold">
                                {al.mitre_technique}
                              </span>
                            )}
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase border ${
                                isDark
                                  ? "bg-slate-800 text-slate-300 border-slate-700"
                                  : "bg-[#f8f4ec] text-[#4a4b5e] border-[#e2d9cc]"
                              }`}
                            >
                              {al.status || "open"}
                            </span>
                          </div>

                          <div className={`flex items-center gap-3 text-[11px] font-mono flex-wrap ${isDark ? "text-slate-400" : "text-[#58565e]"}`}>
                            {al.source_ip && (
                              <span>Src: <strong className={isDark ? "text-slate-200" : "text-[#282937]"}>{al.source_ip}</strong></span>
                            )}
                            {al.destination_ip && (
                              <span>Dest: <strong className={isDark ? "text-slate-200" : "text-[#282937]"}>{al.destination_ip}</strong></span>
                            )}
                            {al.hostname && (
                              <span>Host: <strong className="text-cyan-400">{al.hostname}</strong></span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                          <span className={`text-[10px] font-mono flex items-center gap-1 ${isDark ? "text-slate-500" : "text-[#58565e]"}`}>
                            <Clock size={11} />
                            {al.created_at ? new Date(al.created_at).toLocaleTimeString() : "Live"}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleCopy(JSON.stringify(al, null, 2), al.id)}
                            title="Copy alert JSON"
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer shadow-xs ${
                              isDark
                                ? "bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700"
                                : "bg-white border-[#e2d9cc] text-[#58565e] hover:text-[#282937] hover:bg-[#f8f4ec]"
                            }`}
                          >
                            {copiedId === al.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer / Quick Actions */}
            <div
              className={`relative flex flex-wrap items-center justify-between gap-3 border-t px-6 py-4 ${
                isDark ? "bg-[#070d1a] border-slate-800" : "bg-[#fcfaf5] border-[#e2d9cc]"
              }`}
            >
              <div className={`text-xs ${isDark ? "text-slate-400" : "text-[#58565e]"}`}>
                Actionable SOC playbooks and triage workflows
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate(`/cases?severity=${activeSeverity}`);
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer shadow-xs ${
                    isDark
                      ? "bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800"
                      : "bg-white border-[#e2d9cc] text-[#282937] hover:bg-[#f8f4ec]"
                  }`}
                >
                  <FileText size={13} className="text-cyan-400" />
                  <span>View in Cases</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate(`/hunting?severity=${activeSeverity}`);
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer shadow-xs ${
                    isDark
                      ? "bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800"
                      : "bg-white border-[#e2d9cc] text-[#282937] hover:bg-[#f8f4ec]"
                  }`}
                >
                  <Crosshair size={13} className="text-purple-400" />
                  <span>Threat Hunting</span>
                </button>

                {onOpenGraph && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenGraph();
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-500 text-xs font-bold text-black hover:bg-cyan-400 transition-colors cursor-pointer shadow-md"
                  >
                    <ExternalLink size={13} />
                    <span>Correlate Attack Graph</span>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
