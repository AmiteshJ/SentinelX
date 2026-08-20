import { useEffect, useState } from "react";
import { DashboardShell } from "../components/layout/DashboardShell";
import { apiClient } from "../api/client";
import type { AuditLogEntry } from "../types/api";

export function AuditLogs() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get("/api/audit/logs")
      .then((res) => setLogs(res.data))
      .catch((err) => setError(err?.response?.data?.detail || "Admin role required to view audit logs."));
  }, []);

  return (
    <DashboardShell>
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-slate-100">Audit Logs</h1>
        <p className="text-sm text-slate-500">Append-only record of security-sensitive actions. Admin-only.</p>
      </div>

      {error && <div className="glass-panel mb-4 border-red-500/30 p-4 text-sm text-red-300">{error}</div>}

      <div className="glass-panel p-5">
        {logs.length === 0 ? (
          <p className="text-xs text-slate-500">No audit entries yet.</p>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="text-slate-500">
              <tr>
                <th className="pb-2 font-medium">Action</th>
                <th className="pb-2 font-medium">Resource</th>
                <th className="pb-2 font-medium">User</th>
                <th className="pb-2 font-medium">Time</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              {logs.map((log) => (
                <tr key={log.id} className="border-t border-slate-800/60">
                  <td className="py-2">{log.action}</td>
                  <td className="py-2">{log.resource_type ? `${log.resource_type}:${log.resource_id}` : "—"}</td>
                  <td className="py-2">{log.user_id || "—"}</td>
                  <td className="py-2 text-slate-500">{new Date(log.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </DashboardShell>
  );
}
