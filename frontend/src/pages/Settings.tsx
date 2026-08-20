import { useState } from "react";
import { DashboardShell } from "../components/layout/DashboardShell";
import { useTheme } from "../theme/ThemeProvider";

export function Settings() {
  const { theme, toggleTheme } = useTheme();
  const [showConsent, setShowConsent] = useState(false);
  const [monitoringEnabled, setMonitoringEnabled] = useState(false);

  function handleAllow() {
    setMonitoringEnabled(true);
    setShowConsent(false);
    // NOTE: no SentinelX Agent exists yet (Phase 5) — this only records
    // consent locally. There is nothing on the other end actually collecting
    // telemetry, and the UI must not imply there is.
  }

  return (
    <DashboardShell>
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-slate-100">Settings</h1>
        <p className="text-sm text-slate-500">Appearance and live monitoring consent.</p>
      </div>

      <div className="glass-panel mb-4 p-5">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Appearance</h3>
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-300">Theme</span>
          <button
            onClick={toggleTheme}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs capitalize text-slate-300 hover:text-white"
          >
            {theme}
          </button>
        </div>
      </div>

      <div className="glass-panel p-5">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Live Network Monitoring</h3>
        <p className="mb-3 text-xs text-slate-500">
          Live monitoring requires the SentinelX Agent (Phase 5 — not yet implemented in this
          build). This toggle demonstrates the required consent flow (spec §6) but has nothing on
          the other end collecting real telemetry yet.
        </p>
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-300">
            Status: <span className={monitoringEnabled ? "text-emerald-400" : "text-slate-500"}>{monitoringEnabled ? "Consent granted (no agent connected)" : "Disabled"}</span>
          </span>
          {monitoringEnabled ? (
            <button onClick={() => setMonitoringEnabled(false)} className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/10">
              Stop Monitoring
            </button>
          ) : (
            <button onClick={() => setShowConsent(true)} className="rounded-lg bg-sx-blue/90 px-3 py-1.5 text-xs font-medium text-black hover:bg-sx-blue">
              Enable Monitoring
            </button>
          )}
        </div>
      </div>

      {showConsent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="glass-panel-strong w-full max-w-md p-6">
            <h2 className="mb-3 text-sm font-semibold text-slate-100">Live Monitoring Permission</h2>
            <p className="mb-3 text-xs text-slate-400">SentinelX may collect:</p>
            <ul className="mb-3 list-disc space-y-1 pl-5 text-xs text-slate-300">
              <li>Destination IP addresses</li>
              <li>DNS metadata</li>
              <li>Ports and protocols</li>
              <li>Connection timestamps</li>
              <li>Traffic volume</li>
              <li>Security-relevant connection metadata</li>
            </ul>
            <p className="mb-3 text-xs text-slate-400">SentinelX does NOT collect:</p>
            <ul className="mb-4 list-disc space-y-1 pl-5 text-xs text-slate-300">
              <li>Passwords</li>
              <li>Private messages</li>
              <li>Cookies</li>
              <li>Form data</li>
              <li>Page contents</li>
            </ul>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowConsent(false)} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:text-white">
                Cancel
              </button>
              <button onClick={handleAllow} className="rounded-lg bg-sx-blue/90 px-3 py-1.5 text-xs font-medium text-black hover:bg-sx-blue">
                Allow Monitoring
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
