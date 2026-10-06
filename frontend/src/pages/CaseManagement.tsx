import { useEffect, useState, useMemo, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase,
  FileText,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ShieldAlert,
  AlertTriangle,
  AlertOctagon,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  ChevronRight,
  ExternalLink,
  Layers,
  ArrowRight,
  User,
  Tag,
  X,
  FileSpreadsheet,
  CheckSquare,
  Server,
  Target,
  Terminal,
  Radio,
  Globe,
  Info,
  ShieldCheck,
  Activity
} from "lucide-react";
import { DashboardShell } from "../components/layout/DashboardShell";
import { apiClient } from "../api/client";
import type { Case, Report } from "../types/api";

const STATUSES = ["open", "investigating", "contained", "resolved", "closed"] as const;

const STATUS_BADGE: Record<string, { label: string; bg: string; text: string; border: string }> = {
  open: { label: "Open", bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30" },
  investigating: { label: "Investigating", bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" },
  contained: { label: "Contained", bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30" },
  resolved: { label: "Resolved", bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
  closed: { label: "Closed", bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-500/30" },
};

const SEVERITY_BADGE: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30" },
  high: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/30" },
  medium: { bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/30" },
  low: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
};

interface IncidentSummary {
  id: string;
  title: string;
  severity: string;
  status: string;
  risk_score: number | null;
  alert_count: number;
  created_at: string;
  updated_at: string;
}

interface IncidentDetail {
  incident: {
    id: string;
    title: string;
    severity: string;
    status: string;
    risk_score: number | null;
    created_at: string;
    updated_at: string;
  };
  timeline: { timestamp: string; event: string }[];
  alerts: {
    id: string;
    rule_name: string;
    severity: string;
    source_ip?: string;
    destination_ip?: string;
    mitre_technique?: string;
    description?: string;
    created_at: string;
  }[];
  affected_assets: { ips: string[] };
  mitre_techniques: string[];
}

export function CaseManagement() {
  const location = useLocation();
  const navigate = useNavigate();

  // Active sub-view tab: "cases", "incidents", "reports", or "unified"
  const defaultTab = location.pathname.includes("/reports") ? "reports" : "cases";
  const [activeTab, setActiveTab] = useState<"cases" | "incidents" | "reports" | "unified">(defaultTab);

  // Cases data & state
  const [cases, setCases] = useState<Case[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [incidents, setIncidents] = useState<IncidentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");

  // Create Case Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newSeverity, setNewSeverity] = useState("medium");
  const [newIncidentId, setNewIncidentId] = useState("");
  const [creatingCase, setCreatingCase] = useState(false);
  const [caseError, setCaseError] = useState<string | null>(null);

  // Generate Report Modal
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportTargetIncidentId, setReportTargetIncidentId] = useState("");
  const [customIncidentInput, setCustomIncidentInput] = useState("");
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportSuccess, setReportSuccess] = useState<string | null>(null);

  // Inspected Incident Details Modal State
  const [inspectedIncidentId, setInspectedIncidentId] = useState<string | null>(null);
  const [incidentDetail, setIncidentDetail] = useState<IncidentDetail | null>(null);
  const [loadingIncidentDetail, setLoadingIncidentDetail] = useState(false);
  const [incidentDetailError, setIncidentDetailError] = useState<string | null>(null);

  // Copy feedback state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load all data
  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [casesRes, reportsRes, incRes] = await Promise.allSettled([
        apiClient.get<Case[]>("/api/cases"),
        apiClient.get<{ items: Report[] }>("/api/reports"),
        apiClient.get<{ items: IncidentSummary[] }>("/api/incidents?limit=50"),
      ]);

      if (casesRes.status === "fulfilled") {
        setCases(casesRes.value.data || []);
      }
      if (reportsRes.status === "fulfilled") {
        setReports(reportsRes.value.data?.items || []);
      }
      if (incRes.status === "fulfilled" && incRes.value.data?.items) {
        const incList = incRes.value.data.items;
        setIncidents(incList);
        if (!reportTargetIncidentId && incList.length > 0) {
          setReportTargetIncidentId(incList[0].id);
        }
      }
    } catch {
      setError("Could not reach the SentinelX backend services.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Inspect incident details: fetch source, causing rules, targets, timeline
  async function handleInspectIncident(id: string) {
    setInspectedIncidentId(id);
    setLoadingIncidentDetail(true);
    setIncidentDetailError(null);
    try {
      const { data } = await apiClient.get<IncidentDetail>(`/api/investigation/${id}`);
      setIncidentDetail(data);
    } catch (err: any) {
      setIncidentDetailError(err?.response?.data?.detail || "Could not load incident details.");
      setIncidentDetail(null);
    } finally {
      setLoadingIncidentDetail(false);
    }
  }

  // Create case from an inspected incident
  function handleCreateCaseFromIncident(inc: IncidentDetail["incident"]) {
    setNewTitle(`Investigation: ${inc.title}`);
    setNewSeverity(inc.severity || "high");
    setNewIncidentId(inc.id);
    setNewDescription(`Analyst case initiated for incident ${inc.id}. Severity: ${inc.severity}, Risk Score: ${inc.risk_score ?? "N/A"}.`);
    setInspectedIncidentId(null);
    setShowCreateModal(true);
  }

  // Generate report for an inspected incident
  function handleGenerateReportFromIncident(incId: string) {
    setReportTargetIncidentId(incId);
    setInspectedIncidentId(null);
    setShowReportModal(true);
  }

  // Handle case creation
  async function handleCreateCase(e: FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreatingCase(true);
    setCaseError(null);
    try {
      const relatedIds = newIncidentId.trim() ? [newIncidentId.trim()] : [];
      await apiClient.post("/api/cases", {
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        severity: newSeverity,
        related_incident_ids: relatedIds,
      });
      setNewTitle("");
      setNewDescription("");
      setNewIncidentId("");
      setShowCreateModal(false);
      await loadData();
    } catch (err: any) {
      setCaseError(err?.response?.data?.detail || "Could not create investigation case.");
    } finally {
      setCreatingCase(false);
    }
  }

  // Handle status update
  async function handleUpdateStatus(caseId: string, status: string) {
    try {
      await apiClient.patch(`/api/cases/${caseId}`, { status });
      setCases((prev) =>
        prev.map((c) => (c.id === caseId ? { ...c, status, updated_at: new Date().toISOString() } : c))
      );
    } catch (err: any) {
      console.error("Failed to update status", err);
    }
  }

  // Handle Report generation
  async function handleGenerateReport(e?: FormEvent) {
    if (e) e.preventDefault();
    const targetId = customIncidentInput.trim() || reportTargetIncidentId.trim();
    if (!targetId) {
      setReportError("Please select or enter an Incident ID.");
      return;
    }
    setGeneratingReport(true);
    setReportError(null);
    setReportSuccess(null);
    try {
      await apiClient.post(`/api/reports/generate/${targetId}`);
      setReportSuccess(`Executive report generated successfully for incident: ${targetId}`);
      setCustomIncidentInput("");
      setShowReportModal(false);
      await loadData();
    } catch (err: any) {
      setReportError(err?.response?.data?.detail || "Could not generate report for this incident.");
    } finally {
      setGeneratingReport(false);
    }
  }

  // Copy report summary
  function handleCopySummary(reportId: string, summaryText: string) {
    navigator.clipboard.writeText(summaryText);
    setCopiedId(reportId);
    setTimeout(() => setCopiedId(null), 2500);
  }

  // Filtered cases
  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      const matchSearch =
        searchQuery === "" ||
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.related_incident_ids && c.related_incident_ids.some((id) => id.toLowerCase().includes(searchQuery.toLowerCase())));
      const matchStatus = statusFilter === "all" || c.status === statusFilter;
      const matchSeverity = severityFilter === "all" || c.severity === severityFilter;
      return matchSearch && matchStatus && matchSeverity;
    });
  }, [cases, searchQuery, statusFilter, severityFilter]);

  // Filtered reports
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      return (
        searchQuery === "" ||
        r.incident_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.executive_summary.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [reports, searchQuery]);

  // Filtered incidents
  const filteredIncidents = useMemo(() => {
    return incidents.filter((i) => {
      const matchSearch =
        searchQuery === "" ||
        i.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchSeverity = severityFilter === "all" || i.severity === severityFilter;
      return matchSearch && matchSeverity;
    });
  }, [incidents, searchQuery, severityFilter]);

  // Statistics
  const openCasesCount = cases.filter((c) => c.status === "open" || c.status === "investigating").length;
  const criticalCasesCount = cases.filter((c) => c.severity === "critical" || c.severity === "high").length;
  const totalReportsCount = reports.length;

  return (
    <DashboardShell>
      <div className="space-y-6 pb-12">
        {/* Header Hero */}
        <div className="relative overflow-hidden rounded-[28px] border border-slate-800/80 bg-gradient-to-r from-[#0c1424] via-[#09101d] to-[#050811] p-6 shadow-2xl">
          <div className="pointer-events-none absolute top-0 right-0 h-96 w-96 rounded-full bg-blue-500/10 blur-[120px]" />
          <div className="pointer-events-none absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-purple-500/10 blur-[100px]" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400">
                <Briefcase size={14} className="text-blue-400" />
                <span>Unified SOC Operations Workspace</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Case Management &amp; Security Reports
              </h1>
              <p className="max-w-2xl text-xs sm:text-sm text-slate-400">
                Seamlessly coordinate analyst investigations, inspect incident origins &amp; root causes, and generate automated AI executive summaries from real telemetry.
              </p>
            </div>

            {/* Quick Actions Header */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.35)] hover:brightness-110 active:scale-95 transition-all cursor-pointer"
              >
                <Plus size={15} />
                <span>New Case</span>
              </button>

              <button
                type="button"
                onClick={() => setShowReportModal(true)}
                className="flex items-center gap-2 rounded-xl border border-purple-500/40 bg-purple-500/15 px-4 py-2.5 text-xs font-semibold text-purple-300 hover:bg-purple-500/25 active:scale-95 transition-all cursor-pointer shadow-[0_0_15px_rgba(168,85,247,0.2)]"
              >
                <Sparkles size={15} className="text-purple-300" />
                <span>Generate Report</span>
              </button>

              <button
                type="button"
                onClick={loadData}
                disabled={loading}
                title="Refresh All"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700/80 bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
              >
                <RefreshCw size={14} className={loading ? "animate-spin text-blue-400" : ""} />
              </button>
            </div>
          </div>
        </div>

        {/* Top KPI Metrics Bento Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {/* Total Cases */}
          <div
            onClick={() => setActiveTab("cases")}
            className="rounded-2xl border border-slate-800/80 bg-[#070c18]/80 p-4 backdrop-blur-md cursor-pointer hover:border-blue-500/40 transition-colors"
          >
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Total Cases</span>
              <Briefcase size={16} className="text-blue-400" />
            </div>
            <div className="mt-2 text-2xl font-bold font-mono text-white">{cases.length}</div>
            <div className="mt-1 text-[11px] text-slate-400 flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-400" />
              <span>{openCasesCount} active in triage</span>
            </div>
          </div>

          {/* Critical Priority */}
          <div className="rounded-2xl border border-slate-800/80 bg-[#070c18]/80 p-4 backdrop-blur-md">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Critical &amp; High</span>
              <AlertOctagon size={16} className="text-red-400" />
            </div>
            <div className="mt-2 text-2xl font-bold font-mono text-red-400">{criticalCasesCount}</div>
            <div className="mt-1 text-[11px] text-slate-400">Requires urgent analyst SLA</div>
          </div>

          {/* AI Reports */}
          <div
            onClick={() => setActiveTab("reports")}
            className="rounded-2xl border border-slate-800/80 bg-[#070c18]/80 p-4 backdrop-blur-md cursor-pointer hover:border-purple-500/40 transition-colors"
          >
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Executive Reports</span>
              <FileText size={16} className="text-purple-400" />
            </div>
            <div className="mt-2 text-2xl font-bold font-mono text-purple-300">{totalReportsCount}</div>
            <div className="mt-1 text-[11px] text-slate-400 flex items-center gap-1">
              <Sparkles size={11} className="text-purple-400" />
              <span>LLM-assisted summaries</span>
            </div>
          </div>

          {/* Correlated Incidents — Interactive Card */}
          <div
            onClick={() => setActiveTab("incidents")}
            className="group rounded-2xl border border-cyan-500/30 bg-[#070c18]/80 p-4 backdrop-blur-md cursor-pointer hover:border-cyan-400 hover:bg-cyan-950/20 transition-all shadow-[0_0_15px_rgba(6,182,212,0.1)]"
            title="Click to view all correlated incidents, source origins, and root causes"
          >
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider group-hover:text-cyan-300 transition-colors">
                Correlated Incidents
              </span>
              <ShieldAlert size={16} className="text-cyan-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="mt-2 text-2xl font-bold font-mono text-cyan-300">{incidents.length}</div>
            <div className="mt-1 text-[11px] text-cyan-400/80 flex items-center gap-1 font-medium">
              <span>Inspect sources &amp; causes</span>
              <ArrowRight size={11} className="transition-transform group-hover:translate-x-0.5" />
            </div>
          </div>
        </div>

        {/* Error / Success Notifications */}
        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-white">
              <X size={16} />
            </button>
          </div>
        )}
        {reportSuccess && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} />
              <span>{reportSuccess}</span>
            </div>
            <button onClick={() => setReportSuccess(null)} className="text-emerald-400 hover:text-white">
              <X size={16} />
            </button>
          </div>
        )}

        {/* View Switcher Tabs & Search Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-slate-800/80 bg-[#090e1a]/80 p-3 backdrop-blur-md">
          {/* Tab buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab("cases")}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "cases"
                  ? "bg-blue-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.4)]"
                  : "bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              <Briefcase size={14} />
              <span>Investigation Cases ({cases.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("incidents")}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "incidents"
                  ? "bg-cyan-600 text-white shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                  : "bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              <ShieldAlert size={14} />
              <span>Correlated Incidents ({incidents.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("reports")}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "reports"
                  ? "bg-purple-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.4)]"
                  : "bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              <FileText size={14} />
              <span>Executive Reports ({reports.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("unified")}
              className={`hidden xl:flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "unified"
                  ? "bg-indigo-600 text-white shadow-[0_0_12px_rgba(99,102,241,0.4)]"
                  : "bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              <Layers size={14} />
              <span>Dual Workspace View</span>
            </button>
          </div>

          {/* Search bar */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title, IP, ID or root cause..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950/80 py-1.5 pl-9 pr-3 text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* VIEW 1: CASES TAB */}
        {/* ========================================================================= */}
        {activeTab === "cases" && (
          <div className="space-y-4">
            {/* Filter pills */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-slate-500 font-medium mr-1 flex items-center gap-1">
                  <Filter size={12} /> Status:
                </span>
                {["all", ...STATUSES].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatusFilter(s)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-medium capitalize transition-colors cursor-pointer ${
                      statusFilter === s
                        ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium mr-1">Severity:</span>
                {["all", "critical", "high", "medium", "low"].map((sev) => (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => setSeverityFilter(sev)}
                    className={`rounded-lg px-2 py-0.5 text-[11px] font-medium capitalize transition-colors cursor-pointer ${
                      severityFilter === sev
                        ? "bg-slate-700 text-white"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>

            {/* Cases List */}
            {filteredCases.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800/80 bg-[#070c18] p-12 text-center text-slate-400">
                <Briefcase size={36} className="mb-3 text-slate-600" />
                <h3 className="text-sm font-semibold text-slate-200">No Investigation Cases Found</h3>
                <p className="mt-1 text-xs text-slate-500 max-w-sm">
                  {searchQuery || statusFilter !== "all" || severityFilter !== "all"
                    ? "Try adjusting your search query or status filter."
                    : "Create a new case to start tracking incidents, assigning analysts, and managing resolution."}
                </p>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="mt-4 flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-lg hover:bg-blue-500 cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Create First Case</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3.5">
                {filteredCases.map((c) => {
                  const sevInfo = SEVERITY_BADGE[c.severity.toLowerCase()] || SEVERITY_BADGE.medium;
                  const statInfo = STATUS_BADGE[c.status.toLowerCase()] || STATUS_BADGE.open;

                  return (
                    <motion.div
                      key={c.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="group rounded-2xl border border-slate-800/80 bg-[#070c18]/90 p-4.5 backdrop-blur-md transition-all hover:border-slate-700 hover:shadow-xl"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        {/* Title & metadata */}
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${sevInfo.bg} ${sevInfo.text} ${sevInfo.border}`}
                            >
                              {c.severity}
                            </span>
                            <h3 className="text-sm font-bold text-slate-100 group-hover:text-blue-300 transition-colors">
                              {c.title}
                            </h3>
                          </div>

                          {c.description && (
                            <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                              {c.description}
                            </p>
                          )}

                          {/* Related Incidents with interactive inspection button */}
                          {c.related_incident_ids && c.related_incident_ids.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2 pt-1.5">
                              <span className="text-[10px] text-slate-500 font-mono">Linked Incidents:</span>
                              {c.related_incident_ids.map((incId) => (
                                <button
                                  key={incId}
                                  type="button"
                                  onClick={() => handleInspectIncident(incId)}
                                  className="group/inc inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 font-mono text-[10px] text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400 transition-all cursor-pointer shadow-sm"
                                  title="Inspect incident source IP, causing rules, and affected targets"
                                >
                                  <ShieldAlert size={11} className="text-cyan-400" />
                                  <span>{incId.slice(0, 8)}...</span>
                                  <span className="rounded bg-cyan-400/20 px-1 py-0.2 text-[9px] font-sans font-semibold text-cyan-200 group-hover/inc:bg-cyan-400/35">
                                    View Source &amp; Cause
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Status Select & Actions */}
                        <div className="flex flex-wrap sm:flex-col items-end gap-2 shrink-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-500 font-mono">Status:</span>
                            <select
                              value={c.status}
                              onChange={(e) => handleUpdateStatus(c.id, e.target.value)}
                              className={`rounded-xl border px-3 py-1.5 text-xs font-semibold focus:outline-none cursor-pointer transition-colors ${statInfo.bg} ${statInfo.text} ${statInfo.border} bg-slate-900`}
                            >
                              {STATUSES.map((s) => (
                                <option key={s} value={s} className="bg-slate-900 text-slate-200">
                                  {STATUS_BADGE[s]?.label || s}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                            <Clock size={11} />
                            <span>Updated {new Date(c.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: CORRELATED INCIDENTS EXPLORER (SOURCE & ROOT CAUSE DIRECTORY) */}
        {/* ========================================================================= */}
        {activeTab === "incidents" && (
          <div className="space-y-4">
            {/* Guide Banner */}
            <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/20 via-slate-900/60 to-slate-900/30 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
                  <ShieldAlert size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Correlated Incidents Directory
                  </h3>
                  <p className="text-xs text-slate-400">
                    Explore active threat clusters, identify attacking IP sources, and analyze triggering detection rules.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <span className="font-mono text-xs text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-1 rounded-xl">
                  {filteredIncidents.length} Detected Incidents
                </span>
              </div>
            </div>

            {/* Incidents List */}
            {filteredIncidents.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-[#070c18] p-12 text-center text-slate-400">
                <ShieldAlert size={36} className="mb-3 text-slate-600" />
                <h3 className="text-sm font-semibold text-slate-200">No Correlated Incidents Match</h3>
                <p className="mt-1 text-xs text-slate-500 max-w-sm">
                  Start dataset ingestion on the Dashboard to simulate real enterprise attacks and generate correlated threat clusters.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3.5">
                {filteredIncidents.map((inc) => {
                  const sevInfo = SEVERITY_BADGE[inc.severity.toLowerCase()] || SEVERITY_BADGE.medium;
                  return (
                    <motion.div
                      key={inc.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="group rounded-2xl border border-slate-800/80 bg-[#070c18]/90 p-4.5 backdrop-blur-md transition-all hover:border-cyan-500/40 hover:shadow-[0_10px_30px_-10px_rgba(6,182,212,0.15)] space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <span
                              className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${sevInfo.bg} ${sevInfo.text} ${sevInfo.border}`}
                            >
                              {inc.severity}
                            </span>

                            <h3 className="text-sm font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                              {inc.title}
                            </h3>

                            {inc.risk_score !== null && (
                              <span className="rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-red-300">
                                Risk {inc.risk_score}/100
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-1">
                            <span className="font-mono text-[11px] text-slate-500">
                              UUID: <span className="text-slate-300">{inc.id}</span>
                            </span>
                            <span className="flex items-center gap-1 font-mono text-[11px] text-slate-400">
                              <Layers size={12} className="text-cyan-400" />
                              <span>{inc.alert_count} correlated alert events</span>
                            </span>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleInspectIncident(inc.id)}
                            className="flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/15 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/25 active:scale-95 transition-all cursor-pointer shadow-sm"
                          >
                            <Search size={13} />
                            <span>Inspect Source &amp; Cause</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setReportTargetIncidentId(inc.id);
                              setShowReportModal(true);
                            }}
                            className="flex items-center gap-1.5 rounded-xl border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-xs font-semibold text-purple-300 hover:bg-purple-500/20 active:scale-95 transition-all cursor-pointer"
                          >
                            <Sparkles size={13} />
                            <span>AI Report</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: REPORTS TAB */}
        {/* ========================================================================= */}
        {activeTab === "reports" && (
          <div className="space-y-4">
            {/* Quick Generator Panel */}
            <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-950/25 via-slate-900/50 to-slate-900/25 p-4 sm:p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-purple-300 text-xs font-bold uppercase tracking-wider">
                  <Sparkles size={14} className="text-purple-400" />
                  <span>AI Executive Report Generator</span>
                </div>
                <p className="text-xs text-slate-400">
                  Select any active security incident to compile a structured executive summary via configured LLM provider.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <select
                  value={reportTargetIncidentId}
                  onChange={(e) => setReportTargetIncidentId(e.target.value)}
                  className="rounded-xl border border-slate-700 bg-slate-900/90 px-3.5 py-2 text-xs text-slate-200 focus:border-purple-400 focus:outline-none min-w-[200px]"
                >
                  {incidents.map((inc) => (
                    <option key={inc.id} value={inc.id}>
                      [{inc.severity.toUpperCase()}] {inc.title}
                    </option>
                  ))}
                  {incidents.length === 0 && <option value="">No active incidents found</option>}
                </select>

                <button
                  type="button"
                  onClick={() => handleGenerateReport()}
                  disabled={generatingReport || (!reportTargetIncidentId && !customIncidentInput)}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-[0_0_15px_rgba(168,85,247,0.35)] hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {generatingReport ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Drafting with AI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={13} />
                      <span>Generate Now</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Reports List */}
            {filteredReports.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800/80 bg-[#070c18] p-12 text-center text-slate-400">
                <FileText size={36} className="mb-3 text-slate-600" />
                <h3 className="text-sm font-semibold text-slate-200">No Reports Generated Yet</h3>
                <p className="mt-1 text-xs text-slate-500 max-w-sm">
                  Generate your first executive report above or trigger one from any investigation case.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredReports.map((r) => (
                  <motion.div
                    key={r.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border border-slate-800/80 bg-[#070c18]/90 p-5 backdrop-blur-md transition-all hover:border-slate-700 hover:shadow-xl space-y-3"
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/60 pb-3">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => handleInspectIncident(r.incident_id)}
                          className="flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 font-mono text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 transition-colors cursor-pointer"
                          title="Inspect incident source and causing detection rules"
                        >
                          <ShieldAlert size={12} />
                          <span>Incident {r.incident_id}</span>
                          <span className="text-[10px] text-cyan-400 underline ml-1">Inspect Cause</span>
                        </button>

                        {r.executive_summary_provider && (
                          <span className="flex items-center gap-1 rounded-lg border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 font-mono text-[10px] text-purple-300">
                            <Sparkles size={10} />
                            <span>Drafted via {r.executive_summary_provider}</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                          <Clock size={11} />
                          {new Date(r.generated_at).toLocaleString()}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleCopySummary(r.id, r.executive_summary)}
                          className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          {copiedId === r.id ? (
                            <>
                              <Check size={12} className="text-emerald-400" />
                              <span className="text-emerald-400">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy size={12} />
                              <span>Copy Summary</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Executive Summary Body */}
                    <div className="rounded-xl border border-slate-800/60 bg-black/30 p-4 text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-wrap">
                      {r.executive_summary}
                    </div>

                    {/* Facts snapshot */}
                    {r.facts && Object.keys(r.facts).length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-mono text-slate-400">
                        <span className="text-slate-500">Fact snapshot:</span>
                        {Object.entries(r.facts).slice(0, 4).map(([k, v]) => (
                          <span key={k} className="rounded bg-slate-900 px-2 py-0.5 border border-slate-800 text-slate-300">
                            {k}: {String(v)}
                          </span>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 4: UNIFIED DUAL WORKSPACE TAB (Side-by-Side) */}
        {/* ========================================================================= */}
        {activeTab === "unified" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Left Column: Active Cases */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <Briefcase size={15} className="text-blue-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Analyst Cases ({filteredCases.length})
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={12} /> New
                </button>
              </div>

              <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
                {filteredCases.map((c) => {
                  const statInfo = STATUS_BADGE[c.status.toLowerCase()] || STATUS_BADGE.open;
                  const sevInfo = SEVERITY_BADGE[c.severity.toLowerCase()] || SEVERITY_BADGE.medium;
                  return (
                    <div
                      key={c.id}
                      className="rounded-xl border border-slate-800/80 bg-[#070c18] p-3.5 space-y-2 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className={`rounded px-1.5 py-0.2 text-[9px] font-bold uppercase ${sevInfo.bg} ${sevInfo.text}`}>
                            {c.severity}
                          </span>
                          <span className="text-xs font-bold text-slate-200">{c.title}</span>
                        </div>
                        <select
                          value={c.status}
                          onChange={(e) => handleUpdateStatus(c.id, e.target.value)}
                          className={`rounded-lg border px-2 py-0.5 text-[10px] font-semibold ${statInfo.bg} ${statInfo.text} ${statInfo.border} bg-slate-900`}
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>{STATUS_BADGE[s]?.label || s}</option>
                          ))}
                        </select>
                      </div>
                      {c.description && <p className="text-[11px] text-slate-400 line-clamp-2">{c.description}</p>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Generated Reports */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <FileText size={15} className="text-purple-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Incident Reports ({filteredReports.length})
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowReportModal(true)}
                  className="text-[11px] font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles size={12} /> Generate
                </button>
              </div>

              <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
                {filteredReports.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-xl border border-slate-800/80 bg-[#070c18] p-3.5 space-y-2 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-cyan-300 font-bold">Incident {r.incident_id}</span>
                      <button
                        type="button"
                        onClick={() => handleCopySummary(r.id, r.executive_summary)}
                        className="text-[11px] text-slate-400 hover:text-white cursor-pointer"
                      >
                        {copiedId === r.id ? "Copied!" : "Copy"}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed line-clamp-3">
                      {r.executive_summary}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL: INCIDENT SOURCE & ROOT CAUSE INSPECTION MODAL */}
        {/* ========================================================================= */}
        <AnimatePresence>
          {inspectedIncidentId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setInspectedIncidentId(null)}
                className="fixed inset-0 bg-black/80 backdrop-blur-md"
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 16 }}
                className="relative z-10 w-full max-w-3xl overflow-hidden rounded-[26px] border border-cyan-500/30 bg-[#070c18] p-6 shadow-2xl max-h-[90vh] flex flex-col"
              >
                {/* Modal Header */}
                <div className="flex items-start justify-between border-b border-slate-800/80 pb-4 shrink-0">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-cyan-500/15 border border-cyan-500/30 px-2.5 py-0.5 text-[10px] font-mono text-cyan-300 font-bold">
                        Incident Source &amp; Cause Intel
                      </span>
                      {incidentDetail?.incident.severity && (
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${
                            SEVERITY_BADGE[incidentDetail.incident.severity]?.bg || ""
                          } ${SEVERITY_BADGE[incidentDetail.incident.severity]?.text || ""} ${
                            SEVERITY_BADGE[incidentDetail.incident.severity]?.border || ""
                          }`}
                        >
                          {incidentDetail.incident.severity}
                        </span>
                      )}
                      {incidentDetail?.incident.risk_score !== null && incidentDetail?.incident.risk_score !== undefined && (
                        <span className="rounded-full bg-red-500/10 border border-red-500/30 px-2 py-0.5 text-[10px] font-mono text-red-300 font-semibold">
                          Risk {incidentDetail.incident.risk_score}/100
                        </span>
                      )}
                    </div>
                    <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                      {incidentDetail?.incident.title || `Incident ${inspectedIncidentId}`}
                    </h2>
                    <p className="text-[11px] font-mono text-slate-400">
                      UUID: {inspectedIncidentId}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setInspectedIncidentId(null)}
                    className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
                  {loadingIncidentDetail ? (
                    <div className="flex h-64 flex-col items-center justify-center gap-3">
                      <div className="h-9 w-9 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
                      <p className="text-xs text-slate-400 font-mono">Analyzing incident telemetry, sources, and root causes...</p>
                    </div>
                  ) : incidentDetailError ? (
                    <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-300">
                      {incidentDetailError}
                    </div>
                  ) : incidentDetail ? (
                    <>
                      {/* Section 1: Source & Origin + Targets */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {/* What is the Source? */}
                        <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/30 to-slate-900/50 p-4 space-y-2">
                          <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold uppercase tracking-wider">
                            <Server size={14} className="text-cyan-400" />
                            <span>1. What is the Source?</span>
                          </div>
                          <p className="text-[11px] text-slate-400">
                            Originating attacker host or ingress socket generating telemetry:
                          </p>
                          <div className="space-y-1.5 pt-1">
                            {incidentDetail.alerts.some((a) => a.source_ip) ? (
                              Array.from(new Set(incidentDetail.alerts.map((a) => a.source_ip).filter(Boolean))).map((srcIp) => (
                                <div
                                  key={srcIp}
                                  className="flex items-center justify-between rounded-xl bg-slate-900/90 border border-slate-800 px-3 py-1.5 text-xs"
                                >
                                  <div className="flex items-center gap-2">
                                    <Globe size={13} className="text-cyan-400" />
                                    <span className="font-mono font-bold text-white">{srcIp}</span>
                                  </div>
                                  <span className="rounded bg-cyan-500/20 px-1.5 py-0.2 text-[9px] font-mono text-cyan-300">
                                    Attacking IP
                                  </span>
                                </div>
                              ))
                            ) : (
                              <div className="text-xs font-mono text-slate-500">Source IP parsed from raw packet telemetry</div>
                            )}
                          </div>
                        </div>

                        {/* What is it Causing / Root Cause */}
                        <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-950/30 to-slate-900/50 p-4 space-y-2">
                          <div className="flex items-center gap-2 text-purple-300 text-xs font-bold uppercase tracking-wider">
                            <Target size={14} className="text-purple-400" />
                            <span>2. What is it Causing?</span>
                          </div>
                          <p className="text-[11px] text-slate-400">
                            Detection rules triggered &amp; attack techniques identified:
                          </p>
                          <div className="space-y-1.5 pt-1">
                            {incidentDetail.alerts.map((a, i) => (
                              <div
                                key={a.id || i}
                                className="flex flex-col gap-0.5 rounded-xl bg-slate-900/90 border border-slate-800 p-2 text-xs"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-slate-200">{a.rule_name}</span>
                                  <span className="font-mono text-[9px] text-purple-300 uppercase">{a.severity}</span>
                                </div>
                                {a.mitre_technique && (
                                  <span className="text-[10px] text-purple-400 font-mono">
                                    ATT&amp;CK: {a.mitre_technique}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Section 2: Targeted Assets & Impact */}
                      {incidentDetail.affected_assets.ips.length > 0 && (
                        <div className="rounded-2xl border border-slate-800 bg-[#090e1a] p-4 space-y-2">
                          <div className="flex items-center gap-2 text-slate-300 text-xs font-bold uppercase tracking-wider">
                            <Activity size={14} className="text-amber-400" />
                            <span>Impacted Network Endpoints &amp; Target Assets</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {incidentDetail.affected_assets.ips.map((ip) => (
                              <span
                                key={ip}
                                className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 font-mono text-xs text-slate-200"
                              >
                                {ip}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Section 3: Chronological Alerts Timeline */}
                      <div className="rounded-2xl border border-slate-800 bg-[#090e1a] p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-slate-300 text-xs font-bold uppercase tracking-wider">
                            <Clock size={14} className="text-blue-400" />
                            <span>Incident Event Timeline ({incidentDetail.alerts.length} Events)</span>
                          </div>
                        </div>

                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                          {incidentDetail.alerts.map((al, idx) => (
                            <div
                              key={al.id || idx}
                              className="flex items-start justify-between gap-3 rounded-xl border border-slate-800/60 bg-black/30 p-2.5 text-xs"
                            >
                              <div className="space-y-0.5">
                                <div className="font-semibold text-slate-200 flex items-center gap-2">
                                  <span>{al.rule_name}</span>
                                  {al.mitre_technique && (
                                    <span className="rounded bg-slate-800 px-1.5 py-0.2 font-mono text-[9px] text-slate-400">
                                      {al.mitre_technique}
                                    </span>
                                  )}
                                </div>
                                <div className="font-mono text-[11px] text-slate-400">
                                  <span>Src: {al.source_ip || "unknown"}</span>
                                  <span className="mx-1.5 text-slate-600">→</span>
                                  <span>Dst: {al.destination_ip || "internal"}</span>
                                </div>
                              </div>
                              <span className="text-[10px] font-mono text-slate-500 whitespace-nowrap">
                                {new Date(al.created_at).toLocaleTimeString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : null}
                </div>

                {/* Modal Footer Actions */}
                {incidentDetail && (
                  <div className="border-t border-slate-800/80 pt-3.5 shrink-0 flex flex-wrap items-center justify-between gap-2.5">
                    <span className="text-[11px] text-slate-500 font-mono">
                      Correlated in Real Time via SentinelX Detection Engine
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCreateCaseFromIncident(incidentDetail.incident)}
                        className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md hover:bg-blue-500 active:scale-95 transition-all cursor-pointer"
                      >
                        <Briefcase size={13} />
                        <span>Create Case</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          handleGenerateReportFromIncident(incidentDetail.incident.id);
                        }}
                        className="flex items-center gap-1.5 rounded-xl border border-purple-500/40 bg-purple-500/15 px-3.5 py-2 text-xs font-semibold text-purple-300 hover:bg-purple-500/25 active:scale-95 transition-all cursor-pointer"
                      >
                        <Sparkles size={13} />
                        <span>Generate AI Report</span>
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ========================================================================= */}
        {/* MODAL 1: CREATE CASE */}
        {/* ========================================================================= */}
        <AnimatePresence>
          {showCreateModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowCreateModal(false)}
                className="fixed inset-0 bg-black/80 backdrop-blur-md"
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 16 }}
                className="relative z-10 w-full max-w-lg overflow-hidden rounded-[24px] border border-slate-700 bg-[#090e1a] p-6 shadow-2xl"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Briefcase size={18} className="text-blue-400" />
                    <h3 className="text-base font-bold text-white">Create New Investigation Case</h3>
                  </div>
                  <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                    <X size={18} />
                  </button>
                </div>

                {caseError && (
                  <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                    {caseError}
                  </div>
                )}

                <form onSubmit={handleCreateCase} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Case Title *</label>
                    <input
                      required
                      placeholder="e.g., Suspicious PowerShell Detonation on DC-01"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-black/40 px-3.5 py-2 text-xs text-slate-100 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Severity</label>
                      <select
                        value={newSeverity}
                        onChange={(e) => setNewSeverity(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-black/40 px-3 py-2 text-xs text-slate-100 focus:border-blue-500 focus:outline-none capitalize"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Link Incident (optional)</label>
                      <select
                        value={newIncidentId}
                        onChange={(e) => setNewIncidentId(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-black/40 px-3 py-2 text-xs text-slate-100 focus:border-blue-500 focus:outline-none"
                      >
                        <option value="">-- None --</option>
                        {incidents.map((inc) => (
                          <option key={inc.id} value={inc.id}>
                            [{inc.severity.toUpperCase()}] {inc.title.slice(0, 26)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Description &amp; Analyst Notes</label>
                    <textarea
                      rows={3}
                      placeholder="Detailed context, host artifacts, or immediate containment steps..."
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-black/40 px-3.5 py-2 text-xs text-slate-100 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={creatingCase}
                      className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-lg hover:bg-blue-500 disabled:opacity-50 cursor-pointer"
                    >
                      {creatingCase ? "Creating..." : "Create Case"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ========================================================================= */}
        {/* MODAL 2: GENERATE REPORT */}
        {/* ========================================================================= */}
        <AnimatePresence>
          {showReportModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowReportModal(false)}
                className="fixed inset-0 bg-black/80 backdrop-blur-md"
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 16 }}
                className="relative z-10 w-full max-w-lg overflow-hidden rounded-[24px] border border-purple-500/30 bg-[#090e1a] p-6 shadow-2xl"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles size={18} className="text-purple-400" />
                    <h3 className="text-base font-bold text-white">Generate Executive Incident Report</h3>
                  </div>
                  <button onClick={() => setShowReportModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                    <X size={18} />
                  </button>
                </div>

                {reportError && (
                  <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                    {reportError}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Choose Correlated Incident
                    </label>
                    <select
                      value={reportTargetIncidentId}
                      onChange={(e) => {
                        setReportTargetIncidentId(e.target.value);
                        setCustomIncidentInput("");
                      }}
                      className="w-full rounded-xl border border-slate-700 bg-black/40 px-3.5 py-2 text-xs text-slate-100 focus:border-purple-400 focus:outline-none"
                    >
                      {incidents.map((inc) => (
                        <option key={inc.id} value={inc.id}>
                          [{inc.severity.toUpperCase()}] {inc.title} ({inc.id.slice(0, 8)}...)
                        </option>
                      ))}
                      {incidents.length === 0 && <option value="">No incidents available</option>}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Or Enter Custom Incident UUID
                    </label>
                    <input
                      placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                      value={customIncidentInput}
                      onChange={(e) => setCustomIncidentInput(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-black/40 px-3.5 py-2 text-xs text-slate-100 focus:border-purple-400 focus:outline-none font-mono"
                    />
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    The report pulls facts directly from the database (alerts, affected assets, MITRE techniques).
                    The executive summary is drafted via configured LLM provider.
                  </p>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowReportModal(false)}
                      className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGenerateReport()}
                      disabled={generatingReport || (!reportTargetIncidentId && !customIncidentInput)}
                      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg hover:brightness-110 disabled:opacity-50 cursor-pointer"
                    >
                      {generatingReport ? (
                        <>
                          <RefreshCw size={13} className="animate-spin" />
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={13} />
                          <span>Generate Report</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </DashboardShell>
  );
}
