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
  Server,
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
    color: "#60a5fa",
    bgColor: "rgba(96, 165, 250, 0.15)",
    borderColor: "rgba(96, 165, 250, 0.35)",
    ringColor: "rgba(96, 165, 250, 0.45)",
    badgeBg: "bg-blue-500/20 text-blue-300 border-blue-500/40",
    sla: "24 - 48 Hours (Audit & Baseline)",
    riskScoreRange: "0.1 - 3.9 (Low Risk)",
    justification:
      "Low severity alerts reflect baseline telemetry, hygiene reminders, and informational security events. These are retained as forensic breadcrumbs to construct precise chronological timelines during root-cause investigations.",
    criteria: [
      "New local user account provisioned or group membership modified",
      "Perimeter firewall blocked inbound unauthorized probe",
      "System service restarted or configuration daemon reloaded",
      "Known software update or package manager installation activity",
    ],
    soarAction: "Index to telemetry store for behavioral baseline tracking and Sigma rule tuning",
  },
};

export function ThreatOverviewModal({
  isOpen,
  onClose,
  severity,
  count,
  scope = "personal",
  selectedHost = null,
  onOpenGraph,
}: ThreatOverviewModalProps) {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const config = severity ? SEVERITY_CONFIG[severity] : null;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
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

  // Fetch alerts for this severity tier
  useEffect(() => {
    if (!isOpen || !severity) return;

    let isMounted = true;
    async function fetchSeverityAlerts() {
      setLoading(true);
      try {
        const params: Record<string, any> = {
          severity,
          limit: 30,
          scope,
        };
        if (selectedHost) params.host = selectedHost;

        const res = await apiClient.get<{ items: Alert[]; total: number }>("/api/alerts", { params });
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

  if (!config || !severity) return null;

  const SevIcon = config.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 dark:bg-black/80 backdrop-blur-md dark:backdrop-blur-xl"
          />

          {/* Modal Container */}
          <motion.div
            layoutId={severity ? `threat-tier-card-${severity}` : undefined}
            role="dialog"
            aria-modal="true"
            aria-label={`${config.label} Breakdown & Justification`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] border border-[#e2d9cc] dark:border-slate-800 bg-white/98 dark:bg-[#060b16]/98 shadow-[0_20px_60px_rgba(40,41,55,0.18)] dark:shadow-[0_40px_120px_-20px_rgba(0,0,0,0.95)]"
          >
            {/* Ambient Background Glow */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div
                className="absolute -top-32 -left-32 h-[380px] w-[380px] rounded-full blur-[140px] opacity-40 dark:opacity-100"
                style={{ backgroundColor: config.bgColor }}
              />
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#e2d9cc] dark:via-white/20 to-transparent" />
            </div>

            {/* Header */}
            <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e2d9cc] dark:border-white/[0.08] px-6 py-5">
              <div className="flex items-center gap-3.5">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border shadow-sm dark:shadow-lg"
                  style={{ borderColor: config.ringColor, backgroundColor: config.bgColor }}
                >
                  <SevIcon size={24} style={{ color: config.color }} />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-xl font-bold text-[#282937] dark:text-white tracking-tight">
                      {config.label} Overview
                    </h2>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-mono font-bold border ${config.badgeBg}`}>
                      {count} Active
                    </span>
                  </div>
                  <p className="text-xs text-[#58565e] dark:text-slate-400 mt-0.5">
                    Threat categorization, analytical justification, and contributing security telemetry
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close modal"
                className="self-end sm:self-auto flex h-9 w-9 items-center justify-center rounded-xl text-[#58565e] hover:bg-[#f8f4ec] hover:text-[#282937] dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="relative flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* Section 1: Threat Justification Card */}
              <div
                className="rounded-2xl border p-4.5 bg-[#fefbf4] dark:bg-gradient-to-br dark:from-white/[0.03] dark:to-transparent border-[#e2d9cc] dark:border-slate-800 shadow-xs dark:shadow-inner"
              >
                <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-wider text-[#282937] dark:text-slate-300">
                  <Shield size={14} style={{ color: config.color }} />
                  <span>Count Justification &amp; SOC Threat Definition</span>
                </div>
                <p className="text-xs leading-relaxed text-[#4a4b5e] dark:text-slate-300 font-sans">
                  {config.justification}
                </p>

                {/* Sub-grid of SLA & Risk Parameters */}
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-3 border-t border-[#e2d9cc] dark:border-white/[0.06]">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-black/40 border border-[#e2d9cc] dark:border-slate-800 shadow-xs">
                    <span className="text-[10px] text-[#58565e] dark:text-slate-500 uppercase tracking-wider block font-mono">Response SLA</span>
                    <span className="text-xs font-semibold text-[#282937] dark:text-slate-200 mt-0.5 block">{config.sla}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-black/40 border border-[#e2d9cc] dark:border-slate-800 shadow-xs">
                    <span className="text-[10px] text-[#58565e] dark:text-slate-500 uppercase tracking-wider block font-mono">CVSS / Risk Range</span>
                    <span className="text-xs font-semibold text-[#282937] dark:text-slate-200 mt-0.5 block">{config.riskScoreRange}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-black/40 border border-[#e2d9cc] dark:border-slate-800 shadow-xs">
                    <span className="text-[10px] text-[#58565e] dark:text-slate-500 uppercase tracking-wider block font-mono">Target Scope</span>
                    <span className="text-xs font-semibold text-[#282937] dark:text-slate-200 mt-0.5 block">
                      {selectedHost ? `Host: ${selectedHost}` : scope === "personal" ? "Local Agent" : "All Fleet"}
                    </span>
                  </div>
                </div>

                {/* Trigger Criteria Bullet points */}
                <div className="mt-3.5 pt-3 border-t border-[#e2d9cc] dark:border-white/[0.06]">
                  <span className="text-[11px] font-semibold text-[#58565e] dark:text-slate-400 block mb-2">
                    Primary Detection Criteria for this Severity:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {config.criteria.map((crit, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-[11px] text-[#4a4b5e] dark:text-slate-300">
                        <CheckCircle2 size={13} className="shrink-0 mt-0.5" style={{ color: config.color }} />
                        <span>{crit}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* SOAR Action Recommendation */}
                <div className="mt-3 pt-3 border-t border-[#e2d9cc] dark:border-white/[0.06] flex items-center gap-2 text-[11px] text-[#4a4b5e] dark:text-slate-300">
                  <Zap size={14} className="text-amber-500 dark:text-amber-400 shrink-0" />
                  <span>
                    <strong className="text-amber-700 dark:text-amber-300">Automated SOAR Action:</strong> {config.soarAction}
                  </span>
                </div>
              </div>

              {/* Section 2: Recent Contributing Detections */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Activity size={14} className="text-cyan-600 dark:text-cyan-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#282937] dark:text-slate-200">
                      Recent {config.label} Telemetry ({alerts.length} Displayed)
                    </h3>
                  </div>
                  <span className="text-[11px] text-[#58565e] dark:text-slate-500">
                    Sourced from Realtime Telemetry &amp; Sigma Ingestion
                  </span>
                </div>

                {loading ? (
                  <div className="flex h-36 flex-col items-center justify-center gap-2 rounded-2xl border border-[#e2d9cc] dark:border-slate-800 bg-[#fefbf4] dark:bg-slate-900/40">
                    <RefreshCw size={18} className="animate-spin text-cyan-500 dark:text-cyan-400" />
                    <span className="text-xs text-[#58565e] dark:text-slate-400">Loading alerts telemetry...</span>
                  </div>
                ) : alerts.length === 0 ? (
                  <div className="p-8 rounded-2xl border border-[#e2d9cc] dark:border-slate-800/80 bg-[#fefbf4] dark:bg-slate-900/30 text-center">
                    <p className="text-xs text-[#58565e] dark:text-slate-400">
                      No active {severity} alerts currently recorded in the active scope.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {alerts.map((al) => (
                      <div
                        key={al.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-[#e2d9cc] dark:border-slate-800/80 bg-white dark:bg-slate-900/60 hover:bg-[#fefbf4] dark:hover:bg-slate-800/60 shadow-xs transition-colors"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-xs text-[#282937] dark:text-slate-100 truncate">
                              {al.rule_name || "Telemetry Alert"}
                            </span>
                            {al.mitre_technique && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/15 border border-purple-500/30 text-purple-700 dark:text-purple-300 font-semibold">
                                {al.mitre_technique}
                              </span>
                            )}
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[#f8f4ec] dark:bg-slate-800 text-[#4a4b5e] dark:text-slate-300 border border-[#e2d9cc] dark:border-transparent">
                              {al.status || "open"}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-[#58565e] dark:text-slate-400 font-mono flex-wrap">
                            {al.source_ip && (
                              <span>Src: <strong className="text-[#282937] dark:text-slate-300">{al.source_ip}</strong></span>
                            )}
                            {al.destination_ip && (
                              <span>Dest: <strong className="text-[#282937] dark:text-slate-300">{al.destination_ip}</strong></span>
                            )}
                            {al.hostname && (
                              <span>Host: <strong className="text-cyan-700 dark:text-cyan-300">{al.hostname}</strong></span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                          <span className="text-[10px] text-[#58565e] dark:text-slate-500 font-mono flex items-center gap-1">
                            <Clock size={11} />
                            {al.created_at ? new Date(al.created_at).toLocaleTimeString() : "Live"}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleCopy(JSON.stringify(al, null, 2), al.id)}
                            title="Copy alert JSON"
                            className="p-1.5 rounded-lg border border-[#e2d9cc] dark:border-slate-700 bg-white dark:bg-slate-800/60 text-[#58565e] hover:text-[#282937] dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer shadow-xs"
                          >
                            {copiedId === al.id ? <Check size={12} className="text-emerald-500 dark:text-emerald-400" /> : <Copy size={12} />}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer / Quick Actions */}
            <div className="relative flex flex-wrap items-center justify-between gap-3 border-t border-[#e2d9cc] dark:border-white/[0.08] bg-[#fcfaf5] dark:bg-[#070c18] px-6 py-4">
              <div className="text-xs text-[#58565e] dark:text-slate-400">
                Actionable SOC playbooks and triage workflows
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate(`/case-management?severity=${severity}`);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-[#e2d9cc] dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-[#282937] dark:text-slate-200 hover:bg-[#f8f4ec] dark:hover:bg-slate-800 transition-colors cursor-pointer shadow-xs"
                >
                  <FileText size={13} className="text-cyan-600 dark:text-cyan-400" />
                  <span>View in Cases</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate(`/threat-hunting?severity=${severity}`);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-[#e2d9cc] dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-[#282937] dark:text-slate-200 hover:bg-[#f8f4ec] dark:hover:bg-slate-800 transition-colors cursor-pointer shadow-xs"
                >
                  <Crosshair size={13} className="text-purple-600 dark:text-purple-400" />
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
