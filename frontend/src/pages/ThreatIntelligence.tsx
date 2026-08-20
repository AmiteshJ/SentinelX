import { useEffect, useState, type FormEvent } from "react";
import { DashboardShell } from "../components/layout/DashboardShell";
import { BentoCard } from "../components/ui/BentoCard";
import { apiClient } from "../api/client";
import type { MaliciousUrl, ThreatIntelOverview } from "../types/api";

export function ThreatIntelligence() {
  const [overview, setOverview] = useState<ThreatIntelOverview | null>(null);
  const [urls, setUrls] = useState<MaliciousUrl[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formUrl, setFormUrl] = useState("");
  const [threatType, setThreatType] = useState("phishing");
  const [severity, setSeverity] = useState("medium");
  const [confidence, setConfidence] = useState(70);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const [ov, list] = await Promise.all([
        apiClient.get("/api/threat-intelligence/overview"),
        apiClient.get("/api/threat-intelligence/urls"),
      ]);
      setOverview(ov.data);
      setUrls(list.data.items);
    } catch {
      setError("Could not reach the SentinelX backend.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAddUrl(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.post("/api/threat-intelligence/urls", {
        url: formUrl,
        threat_type: threatType,
        severity,
        confidence,
        tags: [],
      });
      setFormUrl("");
      setShowForm(false);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Could not add IOC. Admin/SOC analyst role required.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardShell>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Threat Intelligence &amp; Risk</h1>
          <p className="text-sm text-slate-500">
            Custom IOC database + optional external enrichment (AbuseIPDB, URLhaus — local-first, graceful fallback).
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-sx-blue/90 px-3 py-1.5 text-xs font-medium text-black hover:bg-sx-blue"
        >
          + Add Malicious URL
        </button>
      </div>

      {error && <div className="glass-panel mb-4 border-red-500/30 p-4 text-sm text-red-300">{error}</div>}

      {showForm && (
        <form onSubmit={handleAddUrl} className="glass-panel mb-4 grid grid-cols-2 gap-3 p-4 sm:grid-cols-5">
          <input
            required
            placeholder="https://malicious-domain.example/path"
            value={formUrl}
            onChange={(e) => setFormUrl(e.target.value)}
            className="col-span-2 rounded-lg border border-slate-700 bg-black/20 px-3 py-2 text-xs text-slate-100"
          />
          <select value={threatType} onChange={(e) => setThreatType(e.target.value)} className="rounded-lg border border-slate-700 bg-black/20 px-3 py-2 text-xs text-slate-100">
            <option value="phishing">Phishing</option>
            <option value="malware">Malware</option>
            <option value="c2">C2</option>
            <option value="spam">Spam</option>
            <option value="other">Other</option>
          </select>
          <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="rounded-lg border border-slate-700 bg-black/20 px-3 py-2 text-xs text-slate-100">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          <input
            type="number"
            min={0}
            max={100}
            value={confidence}
            onChange={(e) => setConfidence(Number(e.target.value))}
            className="rounded-lg border border-slate-700 bg-black/20 px-3 py-2 text-xs text-slate-100"
          />
          <button
            type="submit"
            disabled={submitting}
            className="col-span-2 rounded-lg bg-sx-blue/90 py-2 text-xs font-medium text-black hover:bg-sx-blue disabled:opacity-50 sm:col-span-5"
          >
            {submitting ? "Adding…" : "Add to Threat Intelligence Database"}
          </button>
        </form>
      )}

      {overview && (
        <div className="mb-4 grid grid-cols-3 gap-4">
          <BentoCard title="Malicious URLs">
            <div className="text-2xl font-semibold text-slate-100">{overview.malicious_urls}</div>
          </BentoCard>
          <BentoCard title="Malicious IPs">
            <div className="text-2xl font-semibold text-slate-100">{overview.malicious_ips}</div>
          </BentoCard>
          <BentoCard title="Pending Verification">
            <div className="text-2xl font-semibold text-slate-100">{overview.pending_verification}</div>
          </BentoCard>
        </div>
      )}

      <div className="glass-panel p-5">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Malicious URL Database ({urls.length})
        </h3>
        {urls.length === 0 ? (
          <p className="text-xs text-slate-500">No custom IOCs added yet.</p>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="text-slate-500">
              <tr>
                <th className="pb-2 font-medium">URL</th>
                <th className="pb-2 font-medium">Domain</th>
                <th className="pb-2 font-medium">Type</th>
                <th className="pb-2 font-medium">Severity</th>
                <th className="pb-2 font-medium">Confidence</th>
                <th className="pb-2 font-medium">Source</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              {urls.map((u) => (
                <tr key={u.id} className="border-t border-slate-800/60">
                  <td className="max-w-xs truncate py-2">{u.url}</td>
                  <td className="py-2">{u.domain}</td>
                  <td className="py-2 capitalize">{u.threat_type}</td>
                  <td className="py-2 capitalize">{u.severity}</td>
                  <td className="py-2">{u.confidence}%</td>
                  <td className="py-2">{u.source}</td>
                  <td className="py-2">{u.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </DashboardShell>
  );
}
