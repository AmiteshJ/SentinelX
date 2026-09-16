import { useState, useEffect } from "react";
import { ShieldAlert, ShieldCheck, Activity, Flame, Skull, Bot, Check, X, Play } from "lucide-react";
import { usePermissionStore, type AgentPermissions } from "../../store/permissionStore";

export function PermissionConsentModal() {
  const isModalOpen = usePermissionStore((s) => s.isModalOpen);
  const permissions = usePermissionStore((s) => s.permissions);
  const giveConsentAndActivate = usePermissionStore((s) => s.giveConsentAndActivate);
  const closeModal = usePermissionStore((s) => s.closeModal);
  const isLoading = usePermissionStore((s) => s.isLoading);

  const [formPerms, setFormPerms] = useState<AgentPermissions>(permissions);

  useEffect(() => {
    setFormPerms(permissions);
  }, [permissions]);

  if (!isModalOpen) return null;

  const toggle = (key: keyof AgentPermissions) => {
    setFormPerms((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAuthorizeAll = async () => {
    const allEnabled: AgentPermissions = {
      telemetry_enabled: true,
      firewall_enabled: true,
      kill_process_enabled: true,
      ai_remediation_enabled: true,
    };
    await giveConsentAndActivate(allEnabled);
  };

  const handleSaveCustom = async () => {
    await giveConsentAndActivate(formPerms);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl border border-sx-blue/30 bg-slate-950/90 p-6 shadow-2xl shadow-sx-blue/10">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-sx-blue/40 bg-sx-blue/10 text-sx-blue">
              <ShieldAlert className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Host EDR & SOC Protection Authorization</h2>
              <p className="text-xs text-slate-400">
                Grant SentinelX permissions to monitor host network traffic and execute defensive actions.
              </p>
            </div>
          </div>
          <button
            onClick={closeModal}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Permission items list */}
        <div className="mt-5 space-y-3">
          {/* 1. Live Telemetry */}
          <div
            onClick={() => toggle("telemetry_enabled")}
            className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition-all ${
              formPerms.telemetry_enabled
                ? "border-emerald-500/40 bg-emerald-950/15"
                : "border-slate-800 bg-slate-900/40 opacity-70"
            }`}
          >
            <div className="flex items-center gap-3">
              <Activity className={formPerms.telemetry_enabled ? "text-emerald-400" : "text-slate-500"} size={20} />
              <div>
                <div className="text-xs font-semibold text-slate-200">Live Network Telemetry Streaming</div>
                <div className="text-[11px] text-slate-400">
                  Allows the SentinelX Agent to collect open socket connections and inspect outbound traffic.
                </div>
              </div>
            </div>
            <div
              className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                formPerms.telemetry_enabled ? "border-emerald-400 bg-emerald-500 text-black" : "border-slate-700 bg-slate-800"
              }`}
            >
              {formPerms.telemetry_enabled && <Check size={14} className="stroke-[3]" />}
            </div>
          </div>

          {/* 2. Firewall Containment */}
          <div
            onClick={() => toggle("firewall_enabled")}
            className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition-all ${
              formPerms.firewall_enabled
                ? "border-red-500/40 bg-red-950/15"
                : "border-slate-800 bg-slate-900/40 opacity-70"
            }`}
          >
            <div className="flex items-center gap-3">
              <Flame className={formPerms.firewall_enabled ? "text-red-400" : "text-slate-500"} size={20} />
              <div>
                <div className="text-xs font-semibold text-slate-200">OS Firewall Host Containment (SOAR)</div>
                <div className="text-[11px] text-slate-400">
                  Allows analysts and automated playbooks to drop malicious IP connections via Windows Firewall (`netsh`).
                </div>
              </div>
            </div>
            <div
              className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                formPerms.firewall_enabled ? "border-red-400 bg-red-500 text-black" : "border-slate-700 bg-slate-800"
              }`}
            >
              {formPerms.firewall_enabled && <Check size={14} className="stroke-[3]" />}
            </div>
          </div>

          {/* 3. Process Termination */}
          <div
            onClick={() => toggle("kill_process_enabled")}
            className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition-all ${
              formPerms.kill_process_enabled
                ? "border-amber-500/40 bg-amber-950/15"
                : "border-slate-800 bg-slate-900/40 opacity-70"
            }`}
          >
            <div className="flex items-center gap-3">
              <Skull className={formPerms.kill_process_enabled ? "text-amber-400" : "text-slate-500"} size={20} />
              <div>
                <div className="text-xs font-semibold text-slate-200">Process Kill & Host Remediation</div>
                <div className="text-[11px] text-slate-400">
                  Allows instant termination of compromised or malicious processes (`taskkill`).
                </div>
              </div>
            </div>
            <div
              className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                formPerms.kill_process_enabled ? "border-amber-400 bg-amber-500 text-black" : "border-slate-700 bg-slate-800"
              }`}
            >
              {formPerms.kill_process_enabled && <Check size={14} className="stroke-[3]" />}
            </div>
          </div>

          {/* 4. AI Remediation */}
          <div
            onClick={() => toggle("ai_remediation_enabled")}
            className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition-all ${
              formPerms.ai_remediation_enabled
                ? "border-purple-500/40 bg-purple-950/15"
                : "border-slate-800 bg-slate-900/40 opacity-70"
            }`}
          >
            <div className="flex items-center gap-3">
              <Bot className={formPerms.ai_remediation_enabled ? "text-purple-400" : "text-slate-500"} size={20} />
              <div>
                <div className="text-xs font-semibold text-slate-200">Autonomous AI Assistant Actions</div>
                <div className="text-[11px] text-slate-400">
                  Enables SentinelX AI copilot to propose and execute containment playbooks upon approval.
                </div>
              </div>
            </div>
            <div
              className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                formPerms.ai_remediation_enabled ? "border-purple-400 bg-purple-500 text-black" : "border-slate-700 bg-slate-800"
              }`}
            >
              {formPerms.ai_remediation_enabled && <Check size={14} className="stroke-[3]" />}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleSaveCustom}
            disabled={isLoading}
            className="rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2.5 text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            Save Selected & Start
          </button>
          <button
            type="button"
            onClick={handleAuthorizeAll}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 rounded-xl bg-sx-blue px-5 py-2.5 text-xs font-semibold text-black shadow-lg shadow-sx-blue/20 hover:bg-cyan-300 transition-colors disabled:opacity-50"
          >
            <ShieldCheck size={16} />
            {isLoading ? "Activating Agent..." : "Authorize Full Protection & Auto-Start Agent"}
          </button>
        </div>
      </div>
    </div>
  );
}
