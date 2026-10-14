import { useEffect, useState, useRef } from "react";
import { Laptop, Globe, ChevronDown, Check, MonitorCheck, Radio } from "lucide-react";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { usePermissionStore } from "../../store/permissionStore";

export function ScopeSwitcher() {
  const { scope, setScope, selectedHost, setSelectedHost, endpoints, fetchEndpoints } = useWorkspaceStore();
  const agentDetails = usePermissionStore((s) => s.agentDetails);
  const agentOnline = usePermissionStore((s) => s.agentOnline);

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchEndpoints();
    const interval = setInterval(fetchEndpoints, 10000);
    return () => clearInterval(interval);
  }, [fetchEndpoints]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeHostName = agentDetails?.hostname || "Local Device";

  return (
    <div className="relative flex items-center gap-1.5" ref={dropdownRef}>
      {/* Scope Segmented Switcher */}
      <div className="flex items-center rounded-lg border border-slate-700/60 bg-slate-900/80 p-0.5 text-xs shadow-inner backdrop-blur-md">
        <button
          onClick={() => {
            setScope("personal");
            setSelectedHost(null);
          }}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-all duration-150 ${
            scope === "personal"
              ? "bg-cyan-500/20 text-cyan-300 shadow-sm border border-cyan-500/30"
              : "text-slate-400 hover:text-slate-200"
          }`}
          title="Filter alerts & telemetry strictly to your enrolled machine"
        >
          <Laptop className="h-3.5 w-3.5" />
          <span>My Device</span>
          {agentOnline && (
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => setScope("fleet")}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-all duration-150 ${
            scope === "fleet"
              ? "bg-indigo-500/20 text-indigo-300 shadow-sm border border-indigo-500/30"
              : "text-slate-400 hover:text-slate-200"
          }`}
          title="View telemetry across the entire team fleet"
        >
          <Globe className="h-3.5 w-3.5" />
          <span>Fleet SOC</span>
          {endpoints.length > 0 && (
            <span className="rounded-full bg-slate-800 px-1.5 py-0.2 text-[10px] text-slate-300 font-semibold">
              {endpoints.length}
            </span>
          )}
        </button>
      </div>

      {/* Endpoint Selector Dropdown */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 rounded-lg border border-slate-700/50 bg-slate-800/50 px-2 py-1 text-xs text-slate-300 hover:border-slate-600 hover:bg-slate-800 transition-colors"
        title="Select specific enrolled host"
      >
        <Radio className={`h-3 w-3 ${agentOnline ? "text-emerald-400" : "text-amber-400"}`} />
        <span className="max-w-[110px] truncate font-mono text-[11px]">
          {selectedHost || (scope === "personal" ? activeHostName : "All Fleet Hosts")}
        </span>
        <ChevronDown className="h-3 w-3 text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-slate-700/80 bg-slate-900/95 p-2 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
            Enrolled Endpoints
          </div>

          <div className="mt-1 space-y-1 max-h-56 overflow-y-auto">
            {/* Option for All Hosts (in Fleet mode) */}
            {scope === "fleet" && (
              <button
                onClick={() => {
                  setSelectedHost(null);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs transition-colors ${
                  selectedHost === null
                    ? "bg-indigo-500/20 text-indigo-300 font-medium"
                    : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5 text-indigo-400" />
                  <span>All Fleet Hosts</span>
                </div>
                {selectedHost === null && <Check className="h-3.5 w-3.5 text-indigo-400" />}
              </button>
            )}

            {/* Current user's machine */}
            <button
              onClick={() => {
                setSelectedHost(agentDetails?.hostname || null);
                setIsOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs transition-colors ${
                selectedHost === agentDetails?.hostname
                  ? "bg-cyan-500/20 text-cyan-300 font-medium"
                  : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <Laptop className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                <div className="text-left truncate">
                  <div className="truncate font-mono">{activeHostName}</div>
                  <div className="text-[10px] text-slate-500">Your Machine</div>
                </div>
              </div>
              <span className={`h-2 w-2 rounded-full shrink-0 ${agentOnline ? "bg-emerald-400" : "bg-slate-600"}`} />
            </button>

            {/* Other fleet endpoints */}
            {endpoints
              .filter((ep) => ep.hostname !== agentDetails?.hostname)
              .map((ep) => (
                <button
                  key={`${ep.user_id}-${ep.hostname}`}
                  onClick={() => {
                    setSelectedHost(ep.hostname);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs transition-colors ${
                    selectedHost === ep.hostname
                      ? "bg-indigo-500/20 text-indigo-300 font-medium"
                      : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <MonitorCheck className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <div className="text-left truncate">
                      <div className="truncate font-mono">{ep.hostname}</div>
                      <div className="text-[10px] text-slate-500 truncate">{ep.user_email || "Teammate"}</div>
                    </div>
                  </div>
                  <span className={`h-2 w-2 rounded-full shrink-0 ${ep.online ? "bg-emerald-400" : "bg-slate-600"}`} />
                </button>
              ))}
          </div>

          <div className="mt-2 pt-1 border-t border-slate-800/80 px-2 text-[10px] text-slate-500 flex justify-between">
            <span>Mode: {scope === "personal" ? "Private Isolated" : "Team Shared"}</span>
            <span className="text-cyan-400">{agentOnline ? "Online" : "Offline"}</span>
          </div>
        </div>
      )}
    </div>
  );
}
