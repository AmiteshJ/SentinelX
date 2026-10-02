import { useEffect, useState, useMemo, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Fingerprint,
  Globe,
  ShieldAlert,
  Trash2,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  ExternalLink,
  Shield,
  Activity,
  AlertTriangle,
  Radio,
  X,
} from "lucide-react";
import { DashboardShell } from "../components/layout/DashboardShell";
import { BentoCard } from "../components/ui/BentoCard";
import { apiClient } from "../api/client";
import type { MaliciousUrl, ThreatIntelOverview } from "../types/api";

const SEVERITY_BADGE: Record<string, string> = {
  critical: "bg-red-500/10 text-red-400 border-red-500/30",
  high: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  medium: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  low: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
};

export function ThreatIntelligence() {
  const [overview, setOverview] = useState<ThreatIntelOverview | null>(null);
  const [urls, setUrls] = useState<MaliciousUrl[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [threatFilter, setThreatFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);

  // Form State
  const [formUrl, setFormUrl] = useState("");
  const [threatType, setThreatType] = useState("malware");
  const [severity, setSeverity] = useState("high");
  const [confidence, setConfidence] = useState(85);
  const [submitting, setSubmitting] = useState(false);

  // Deletion / Status State
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  async function load() {
    try {
      const [ov, list] = await Promise.all([
        apiClient.get("/api/threat-intelligence/overview"),
        apiClient.get("/api/threat-intelligence/urls"),
      ]);
      setOverview(ov.data);
      setUrls(list.data.items || []);
    } catch {
      setFeedbackMsg({ text: "Could not reach the SentinelX backend.", type: "error" });
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAddUrl(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFeedbackMsg(null);
    try {
      await apiClient.post("/api/threat-intelligence/urls", {
        url: formUrl.trim(),
        threat_type: threatType,
        severity,
        confidence,
        tags: ["analyst-added"],
      });
      setFormUrl("");
      setShowForm(false);
      setFeedbackMsg({ text: "Indicator successfully added to Threat Intelligence DB!", type: "success" });
      await load();
    } catch (err: any) {
      setFeedbackMsg({
        text: err?.response?.data?.detail || "Could not add IOC. Admin/SOC analyst role required.",
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(urlId: string, urlStr: string) {
    setDeletingId(urlId);
    setFeedbackMsg(null);
    try {
      await apiClient.delete(`/api/threat-intelligence/urls/${urlId}`);
      setUrls((prev) => prev.filter((u) => u.id !== urlId));
      setFeedbackMsg({
        text: `Successfully deleted indicator: ${urlStr}`,
        type: "success",
      });
      // Refresh count overview in background
      apiClient.get("/api/threat-intelligence/overview").then((res) => setOverview(res.data)).catch(() => {});
    } catch (err: any) {
      setFeedbackMsg({
        text: err?.response?.data?.detail || "Failed to remove indicator from database.",
        type: "error",
      });
    } finally {
      setDeletingId(null);
    }
  }

  const filteredUrls = useMemo(() => {
    return urls.filter((u) => {
      const matchesSearch =
        u.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.domain && u.domain.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesType = threatFilter === "all" || u.threat_type.toLowerCase() === threatFilter.toLowerCase();
      return matchesSearch && matchesType;
    });
  }, [urls, searchQuery, threatFilter]);

  return (
    <>
      {/* ---- Exact Ambient Background as SentinelX Dashboard (Bluish top-left, Purple bottom-right) ---- */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#040810]">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#050b18_0%,#040810_45%,#020509_100%)]" />
        {/* Slight bluish glow at top left */}
        <div className="absolute -top-36 -left-36 h-[580px] w-[580px] rounded-full bg-[rgba(58,160,255,0.18)] blur-[140px]" />
        {/* Slight purple glow at bottom right */}
        <div className="absolute -bottom-36 -right-36 h-[580px] w-[580px] rounded-full bg-[rgba(168,85,247,0.14)] blur-[150px]" />
        <div className="absolute top-1/3 left-1/4 h-[420px] w-[420px] rounded-full bg-[rgba(99,102,241,0.07)] blur-[160px]" />
        {/* Subtle rotating radar sweep */}
        <div
          className="sx-radar-sweep pointer-events-none absolute -top-72 -right-72 h-[900px] w-[900px] rounded-full opacity-[0.12]"
          style={{
            background: "conic-gradient(from 0deg, transparent 0deg, #3aa0ff 6deg, transparent 46deg)",
          }}
        />
        <style>{`
          @keyframes sx-radar-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          .sx-radar-sweep { animation: sx-radar-spin 18s linear infinite; }
        `}</style>
      </div>

      <DashboardShell>
        {/* Header matching SentinelX Command Deck */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee]" />
              <h1 className="text-xl font-bold tracking-tight text-slate-100 sm:text-2xl">
                Threat Intelligence &amp; Risk Repository
              </h1>
            </div>
            <p className="mt-1 text-xs text-slate-400 sm:text-sm">
              Custom indicator management, URLhaus &amp; AbuseIPDB live enrichment, and sub-millisecond Redis detection sync.
            </p>
          </div>

          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 rounded-xl bg-cyan-400/90 py-2 px-4 text-xs font-bold text-black transition-all hover:bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.25)]"
          >
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? "Cancel" : "Add Custom Indicator"}
          </button>
        </div>

        {/* Global Feedback Banner */}
        {feedbackMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-4 flex items-center justify-between rounded-xl border p-3.5 text-xs shadow-lg backdrop-blur-md ${
              feedbackMsg.type === "success"
                ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-300"
                : "border-red-500/30 bg-red-950/20 text-red-300"
            }`}
          >
            <div className="flex items-center gap-2">
              {feedbackMsg.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
              )}
              <span>{feedbackMsg.text}</span>
            </div>
            <button
              onClick={() => setFeedbackMsg(null)}
              className="text-slate-400 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}

        {/* Collapsible Add Indicator Glass Panel */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-6"
            >
              <form
                onSubmit={handleAddUrl}
                className="glass-panel relative rounded-2xl border border-cyan-500/30 bg-slate-900/70 p-6 shadow-2xl backdrop-blur-xl"
              >
                <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Add New Malicious Indicator (URL / Domain)
                  </h3>
                  <span className="text-[11px] text-slate-500">Auto-synced into MongoDB &amp; Redis detection cache</span>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
                      URL or Host Target
                    </label>
                    <input
                      required
                      placeholder="https://malicious-domain.example/beacon"
                      value={formUrl}
                      onChange={(e) => setFormUrl(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-black/50 px-3.5 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
                      Threat Classification
                    </label>
                    <select
                      value={threatType}
                      onChange={(e) => setThreatType(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-black/50 px-3.5 py-2 text-xs text-slate-100 focus:border-cyan-400 focus:outline-none"
                    >
                      <option value="malware">Malware</option>
                      <option value="c2">Command &amp; Control (C2)</option>
                      <option value="phishing">Phishing</option>
                      <option value="spam">Spam</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
                      Severity Level
                    </label>
                    <select
                      value={severity}
                      onChange={(e) => setSeverity(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-black/50 px-3.5 py-2 text-xs text-slate-100 focus:border-cyan-400 focus:outline-none"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>

                  <div className="sm:col-span-4 flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="rounded-xl bg-cyan-400 py-2 px-5 text-xs font-bold text-black transition-all hover:bg-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.2)] disabled:opacity-50"
                    >
                      {submitting ? "Persisting Indicator..." : "Confirm &amp; Sync Indicator"}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Overview Statistics Cards */}
        {overview && (
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="glass-panel relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 shadow-xl backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Tracked Malicious URLs
                </span>
                <Globe className="h-4 w-4 text-cyan-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-100">{overview.malicious_urls}</span>
                <span className="text-[11px] text-cyan-400 font-mono">In Database</span>
              </div>
            </div>

            <div className="glass-panel relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 shadow-xl backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Active Malicious IPs
                </span>
                <Radio className="h-4 w-4 text-sky-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-100">{overview.malicious_ips}</span>
                <span className="text-[11px] text-sky-400 font-mono">Blocked Endpoints</span>
              </div>
            </div>

            <div className="glass-panel relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 shadow-xl backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Verification Status
                </span>
                <Shield className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-100">{overview.pending_verification}</span>
                <span className="text-[11px] text-emerald-400 font-mono">Pending Review</span>
              </div>
            </div>
          </div>
        )}

        {/* Indicators Repository Table */}
        <div className="glass-panel relative rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6 shadow-xl backdrop-blur-xl">
          {/* Filter & Search Bar */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
            <div className="flex items-center gap-2">
              <Fingerprint className="h-4 w-4 text-cyan-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Active IOC Indicators ({filteredUrls.length})
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter URL or domain..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-xl border border-slate-800 bg-black/40 pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none"
                />
              </div>

              {/* Threat Filter Dropdown */}
              <select
                value={threatFilter}
                onChange={(e) => setThreatFilter(e.target.value)}
                className="rounded-xl border border-slate-800 bg-black/40 px-3 py-1.5 text-xs text-slate-300 focus:border-cyan-400 focus:outline-none"
              >
                <option value="all">All Types</option>
                <option value="malware">Malware</option>
                <option value="c2">C2</option>
                <option value="phishing">Phishing</option>
                <option value="spam">Spam</option>
              </select>
            </div>
          </div>

          {/* Table */}
          {filteredUrls.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              <Globe className="h-8 w-8 text-slate-600 mx-auto mb-2 opacity-50" />
              No indicators found matching your filter criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800/80 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    <th className="pb-3 pl-1">Indicator URL / Endpoint</th>
                    <th className="pb-3">Domain</th>
                    <th className="pb-3">Threat</th>
                    <th className="pb-3">Severity</th>
                    <th className="pb-3">Confidence</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right pr-2">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-slate-300">
                  {filteredUrls.map((u) => {
                    const sevCls = SEVERITY_BADGE[u.severity.toLowerCase()] || SEVERITY_BADGE.medium;
                    const isDeleting = deletingId === u.id;

                    return (
                      <tr key={u.id} className="transition-colors hover:bg-slate-800/30">
                        {/* URL */}
                        <td className="max-w-xs py-3 pl-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-slate-200 truncate">{u.url}</span>
                          </div>
                          {u.tags && u.tags.length > 0 && (
                            <div className="mt-0.5 flex flex-wrap gap-1">
                              {u.tags.map((tag, tIdx) => (
                                <span
                                  key={tIdx}
                                  className="rounded bg-slate-800 px-1.5 py-0.2 text-[9px] text-slate-400"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>

                        {/* Domain */}
                        <td className="py-3 font-mono text-slate-400">{u.domain || "—"}</td>

                        {/* Type */}
                        <td className="py-3">
                          <span className="rounded-full border border-slate-700 bg-slate-800/60 px-2.5 py-0.5 text-[10px] font-medium uppercase text-slate-300">
                            {u.threat_type}
                          </span>
                        </td>

                        {/* Severity */}
                        <td className="py-3">
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${sevCls}`}>
                            {u.severity}
                          </span>
                        </td>

                        {/* Confidence */}
                        <td className="py-3">
                          <div className="flex items-center gap-1.5">
                            <div className="h-1.5 w-12 rounded-full bg-slate-800 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-cyan-400"
                                style={{ width: `${u.confidence}%` }}
                              />
                            </div>
                            <span className="font-mono text-[10px] text-slate-400">{u.confidence}%</span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3">
                          <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            {u.status || "ACTIVE"}
                          </span>
                        </td>

                        {/* Delete Action Button */}
                        <td className="py-3 text-right pr-2">
                          <button
                            disabled={isDeleting}
                            onClick={() => handleDelete(u.id, u.url)}
                            title="Remove indicator from database and Redis cache"
                            className="inline-flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-[11px] font-medium text-red-400 hover:bg-red-500/20 hover:border-red-500/40 transition-all disabled:opacity-40"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            {isDeleting ? "Deleting..." : "Delete"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DashboardShell>
    </>
  );
}
