import { useEffect, useState, useRef } from "react";
import {
  Sun,
  Moon,
  Bell,
  ShieldCheck,
  ShieldAlert,
  LogOut,
  Activity,
  Flame,
  Skull,
  Bot,
  Play,
  Check,
  ChevronDown,
  AlertTriangle,
  X,
} from "lucide-react";
import { AppLauncher } from "./AppLauncher";
import { useTheme } from "../../theme/ThemeProvider";
import { useAuthStore } from "../../store/authStore";
import { useStreamStore } from "../../store/streamStore";
import { usePermissionStore } from "../../store/permissionStore";
import { Link, useNavigate } from "react-router-dom";

export function TopBar() {
  const { theme, toggleTheme } = useTheme();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const streamStatus = useStreamStore((s) => s.status);

  // Permissions & Agent State
  const permissions = usePermissionStore((s) => s.permissions);
  const updatePermissions = usePermissionStore((s) => s.updatePermissions);
  const fetchPermissions = usePermissionStore((s) => s.fetchPermissions);
  const agentOnline = usePermissionStore((s) => s.agentOnline);
  const agentDetails = usePermissionStore((s) => s.agentDetails);
  const fetchAgentStatus = usePermissionStore((s) => s.fetchAgentStatus);
  const startAgent = usePermissionStore((s) => s.startAgent);
  const openConsentModal = usePermissionStore((s) => s.openModal);

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isStartingAgent, setIsStartingAgent] = useState(false);
  const [startMessage, setStartMessage] = useState<string | null>(null);

  const popoverRef = useRef<HTMLDivElement>(null);

  // Poll agent status & fetch permissions on mount
  useEffect(() => {
    fetchPermissions();
    fetchAgentStatus();
    const interval = setInterval(() => {
      fetchAgentStatus();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Close popover on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsPopoverOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleStartAgent = async () => {
    setIsStartingAgent(true);
    setStartMessage(null);
    const res = await startAgent();
    setIsStartingAgent(false);
    if (res.status === "already_running") {
      setStartMessage("Agent is already actively connected.");
    } else if (res.status === "started") {
      setStartMessage("Agent background process launched successfully!");
    } else {
      setStartMessage(res.message || "Manual start recommended: run agent/run.bat");
    }
    setTimeout(() => setStartMessage(null), 4000);
  };

  const mode = streamStatus?.active_mode || "OFFLINE";
  const isStreaming = streamStatus?.is_running && !streamStatus?.is_paused;
  const isPaused = streamStatus?.is_running && streamStatus?.is_paused;

  return (
    <>
      <header className="glass-panel sticky top-0 z-40 mx-4 mt-4 flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <AppLauncher />
          {/* Logo routes to /dashboard for authenticated users to avoid accidental logout */}
          <Link
            to={user ? "/dashboard" : "/"}
            aria-label="Go to SentinelX dashboard"
            className="flex items-center gap-2 rounded-lg transition-opacity hover:opacity-80"
          >
            <ShieldCheck className="text-sx-blue" size={18} />
            <span className="text-sm font-semibold tracking-wide text-slate-100">SentinelX</span>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {/* EDR Host Shield & Permissions Controller */}
          <div className="relative" ref={popoverRef}>
            <button
              onClick={() => setIsPopoverOpen(!isPopoverOpen)}
              className={`flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium transition-all ${
                agentOnline
                  ? "border-emerald-500/40 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-950/50"
                  : "border-amber-500/40 bg-amber-950/30 text-amber-300 hover:bg-amber-950/50"
              }`}
            >
              <span className="relative flex h-2 w-2">
                {agentOnline && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />}
                <span className={`relative inline-flex h-2 w-2 rounded-full ${agentOnline ? "bg-emerald-400" : "bg-amber-400"}`} />
              </span>
              <span className="hidden sm:inline font-mono">
                {agentOnline ? `EDR: LIVE (${agentDetails?.hostname || "Host"})` : "EDR: OFFLINE"}
              </span>
              <span className="sm:hidden">EDR</span>
              <ChevronDown size={12} className="opacity-70" />
            </button>

            {/* Dropdown Popover */}
            {isPopoverOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-700 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 z-50">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="text-sx-blue" size={16} />
                    <span className="text-xs font-semibold text-slate-100">Host EDR Permissions</span>
                  </div>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[9px] font-mono uppercase ${
                      agentOnline ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
                    }`}
                  >
                    {agentOnline ? "Agent Connected" : "Agent Standby"}
                  </span>
                </div>

                {agentDetails && (
                  <div className="my-2.5 rounded-lg bg-slate-900/60 p-2 text-[11px] text-slate-400 space-y-0.5">
                    <div><span className="text-slate-500">Host:</span> {agentDetails.hostname}</div>
                    <div><span className="text-slate-500">Platform:</span> {agentDetails.os}</div>
                    <div><span className="text-slate-500">Live Sockets:</span> {agentDetails.connections_count ?? 0} active</div>
                  </div>
                )}

                {/* Granular Permission Toggles */}
                <div className="my-3 space-y-2">
                  <label className="flex cursor-pointer items-center justify-between rounded-lg p-1.5 hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-2">
                      <Activity size={14} className={permissions.telemetry_enabled ? "text-emerald-400" : "text-slate-500"} />
                      <span className="text-xs text-slate-200">Live Telemetry Ingestion</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={permissions.telemetry_enabled}
                      onChange={(e) => updatePermissions({ telemetry_enabled: e.target.checked })}
                      className="accent-emerald-500 h-3.5 w-3.5 cursor-pointer"
                    />
                  </label>

                  <label className="flex cursor-pointer items-center justify-between rounded-lg p-1.5 hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-2">
                      <Flame size={14} className={permissions.firewall_enabled ? "text-red-400" : "text-slate-500"} />
                      <span className="text-xs text-slate-200">Firewall SOAR Containment</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={permissions.firewall_enabled}
                      onChange={(e) => updatePermissions({ firewall_enabled: e.target.checked })}
                      className="accent-red-500 h-3.5 w-3.5 cursor-pointer"
                    />
                  </label>

                  <label className="flex cursor-pointer items-center justify-between rounded-lg p-1.5 hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-2">
                      <Skull size={14} className={permissions.kill_process_enabled ? "text-amber-400" : "text-slate-500"} />
                      <span className="text-xs text-slate-200">Process Kill Remediation</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={permissions.kill_process_enabled}
                      onChange={(e) => updatePermissions({ kill_process_enabled: e.target.checked })}
                      className="accent-amber-500 h-3.5 w-3.5 cursor-pointer"
                    />
                  </label>

                  <label className="flex cursor-pointer items-center justify-between rounded-lg p-1.5 hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-2">
                      <Bot size={14} className={permissions.ai_remediation_enabled ? "text-purple-400" : "text-slate-500"} />
                      <span className="text-xs text-slate-200">Autonomous AI Assistant</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={permissions.ai_remediation_enabled}
                      onChange={(e) => updatePermissions({ ai_remediation_enabled: e.target.checked })}
                      className="accent-purple-500 h-3.5 w-3.5 cursor-pointer"
                    />
                  </label>
                </div>

                {startMessage && (
                  <div className="mb-2 rounded bg-slate-900 p-2 text-[10px] text-cyan-300 border border-cyan-500/30">
                    {startMessage}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800 gap-2">
                  {!agentOnline ? (
                    <button
                      onClick={handleStartAgent}
                      disabled={isStartingAgent}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
                    >
                      <Play size={12} />
                      {isStartingAgent ? "Starting..." : "Auto-Start Agent"}
                    </button>
                  ) : (
                    <button
                      onClick={() => openConsentModal()}
                      className="text-[11px] text-sx-blue hover:underline"
                    >
                      Configure All Permissions
                    </button>
                  )}
                  <button
                    onClick={() => openConsentModal()}
                    className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-800"
                  >
                    Manage
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Live Ingestion Indicator */}
          {mode === "LIVE" ? (
            <Link
              to="/dashboard"
              className="hidden items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-mono font-medium text-emerald-400 sm:flex transition-colors hover:bg-emerald-500/20"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              ONLINE // LIVE
            </Link>
          ) : isStreaming ? (
            <Link
              to="/dashboard"
              className="hidden items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-[11px] font-mono font-medium text-cyan-300 sm:flex transition-colors hover:bg-cyan-500/20"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
              </span>
              STREAMING ({streamStatus?.speed_eps} EPS)
            </Link>
          ) : isPaused ? (
            <Link
              to="/dashboard"
              className="hidden items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-mono font-medium text-amber-300 sm:flex transition-colors hover:bg-amber-500/20"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              INGESTION PAUSED
            </Link>
          ) : (
            <Link
              to="/dashboard"
              className="hidden items-center gap-1.5 rounded-full border border-slate-700/60 bg-slate-800/40 px-2.5 py-1 text-[11px] font-medium text-slate-400 sm:flex transition-colors hover:border-slate-600 hover:text-slate-300"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
              OFFLINE MODE
            </Link>
          )}

          <button
            aria-label="Notifications"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-sx-blue"
          >
            <Bell size={18} />
          </button>

          <button
            aria-label="Toggle theme"
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-sx-blue"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {user && (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-700/60">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-medium text-slate-200">{user.full_name}</div>
                <div className="text-[10px] text-slate-500 capitalize">{user.role?.replace("_", " ")}</div>
              </div>
              <button
                aria-label="Log out"
                onClick={() => setIsLogoutModalOpen(true)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Logout Confirmation Modal to protect active monitoring sessions */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-amber-500/30 bg-slate-950 p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">Confirm Analyst Logout</h3>
                <p className="text-xs text-slate-400">Active SentinelX SOC Session</p>
              </div>
            </div>

            <p className="mt-3 text-xs leading-relaxed text-slate-300">
              Your SentinelX live agent and defenses will continue running in the background, but your real-time analyst dashboard session will be disconnected.
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsLogoutModalOpen(false)}
                className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
              >
                Cancel & Stay Connected
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsLogoutModalOpen(false);
                  logout();
                  navigate("/login");
                }}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500 shadow-lg shadow-red-600/20"
              >
                Confirm Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}