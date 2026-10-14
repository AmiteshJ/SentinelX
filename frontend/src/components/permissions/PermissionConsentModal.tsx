import { useState, useEffect } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Activity,
  Flame,
  Skull,
  Bot,
  Check,
  X,
  Copy,
  Laptop,
  Terminal,
  ChevronRight,
  ExternalLink,
  Sparkles
} from "lucide-react";
import { usePermissionStore, type AgentPermissions } from "../../store/permissionStore";

export function PermissionConsentModal() {
  const isModalOpen = usePermissionStore((s) => s.isModalOpen);
  const permissions = usePermissionStore((s) => s.permissions);
  const giveConsentAndActivate = usePermissionStore((s) => s.giveConsentAndActivate);
  const closeModal = usePermissionStore((s) => s.closeModal);
  const isLoading = usePermissionStore((s) => s.isLoading);
  const enrollment = usePermissionStore((s) => s.enrollment);
  const fetchEnrollment = usePermissionStore((s) => s.fetchEnrollment);

  const [activeTab, setActiveTab] = useState<"local" | "remote">("local");
  const [formPerms, setFormPerms] = useState<AgentPermissions>(permissions);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setFormPerms(permissions);
    if (isModalOpen) {
      fetchEnrollment();
    }
  }, [permissions, isModalOpen, fetchEnrollment]);

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

  const handleCopyCommand = () => {
    if (!enrollment?.command_windows) return;
    navigator.clipboard.writeText(enrollment.command_windows);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl border border-cyan-500/30 bg-slate-950/95 p-6 shadow-2xl shadow-cyan-500/10 backdrop-blur-2xl">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-500/40 bg-cyan-500/10 text-cyan-400">
              <ShieldAlert className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Host EDR Protection & Automatic Pairing</h2>
              <p className="text-xs text-slate-400">
                Zero manual configuration. Connect your local PC or enroll a teammate's device in 1 click.
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

        {/* Tab Switcher: Local Machine vs Remote Teammate Machine */}
        <div className="mt-4 flex rounded-xl border border-slate-800 bg-slate-900/60 p-1 text-xs">
          <button
            onClick={() => setActiveTab("local")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-1.5 font-medium transition-all ${
              activeTab === "local"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sparkles size={14} className="text-cyan-400" />
            <span>This Machine (1-Click Auto Launch)</span>
          </button>
          <button
            onClick={() => setActiveTab("remote")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-1.5 font-medium transition-all ${
              activeTab === "remote"
                ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Laptop size={14} className="text-indigo-400" />
            <span>Remote Device / Teammate's Laptop</span>
          </button>
        </div>

        {activeTab === "local" ? (
          <>
            {/* Permission items list */}
            <div className="mt-4 space-y-2.5">
              {/* 1. Live Telemetry */}
              <div
                onClick={() => toggle("telemetry_enabled")}
                className={`flex cursor-pointer items-center justify-between rounded-xl border p-2.5 transition-all ${
                  formPerms.telemetry_enabled
                    ? "border-emerald-500/40 bg-emerald-950/20"
                    : "border-slate-800 bg-slate-900/40 opacity-70"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Activity className={formPerms.telemetry_enabled ? "text-emerald-400" : "text-slate-500"} size={18} />
                  <div>
                    <div className="text-xs font-semibold text-slate-200">Live Host Telemetry Streaming</div>
                    <div className="text-[11px] text-slate-400">
                      Collects active network sockets and outbound communication.
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
                className={`flex cursor-pointer items-center justify-between rounded-xl border p-2.5 transition-all ${
                  formPerms.firewall_enabled
                    ? "border-red-500/40 bg-red-950/20"
                    : "border-slate-800 bg-slate-900/40 opacity-70"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Flame className={formPerms.firewall_enabled ? "text-red-400" : "text-slate-500"} size={18} />
                  <div>
                    <div className="text-xs font-semibold text-slate-200">OS Firewall Isolation (SOAR)</div>
                    <div className="text-[11px] text-slate-400">
                      Drops malicious IP connections automatically via OS firewall.
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
                className={`flex cursor-pointer items-center justify-between rounded-xl border p-2.5 transition-all ${
                  formPerms.kill_process_enabled
                    ? "border-amber-500/40 bg-amber-950/20"
                    : "border-slate-800 bg-slate-900/40 opacity-70"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Skull className={formPerms.kill_process_enabled ? "text-amber-400" : "text-slate-500"} size={18} />
                  <div>
                    <div className="text-xs font-semibold text-slate-200">Process Termination Remediation</div>
                    <div className="text-[11px] text-slate-400">
                      Terminates malicious processes instantly upon threat detection.
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
                className={`flex cursor-pointer items-center justify-between rounded-xl border p-2.5 transition-all ${
                  formPerms.ai_remediation_enabled
                    ? "border-purple-500/40 bg-purple-950/20"
                    : "border-slate-800 bg-slate-900/40 opacity-70"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Bot className={formPerms.ai_remediation_enabled ? "text-purple-400" : "text-slate-500"} size={18} />
                  <div>
                    <div className="text-xs font-semibold text-slate-200">Autonomous AI Copilot Actions</div>
                    <div className="text-[11px] text-slate-400">
                      Allows SentinelX AI agent to propose containment actions.
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
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleSaveCustom}
                disabled={isLoading}
                className="rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2.5 text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                Save Selected
              </button>
              <button
                type="button"
                onClick={handleAuthorizeAll}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-2.5 text-xs font-bold text-black shadow-lg shadow-cyan-400/20 hover:bg-cyan-300 transition-all disabled:opacity-50"
              >
                <ShieldCheck size={16} />
                {isLoading ? "Auto-Pairing & Launching..." : "1-Click Auto Connect & Launch"}
              </button>
            </div>
          </>
        ) : (
          /* Remote Enrollment Tab */
          <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300">
                <Terminal size={15} />
                <span>Zero-Config Enrollment for Remote Laptops</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
                Want to monitor your friend’s laptop or a secondary device? No need to fill out any <code className="text-cyan-300">.env</code> files! Just copy the command below and paste it into PowerShell in the <code className="text-cyan-300">agent/</code> directory on their computer.
              </p>

              <div className="mt-3 relative">
                <div className="rounded-lg border border-slate-800 bg-slate-900/90 p-3 font-mono text-xs text-emerald-400 overflow-x-auto select-all pr-24">
                  {enrollment?.command_windows || ".\\run.bat --token <generating...>"}
                </div>
                <button
                  onClick={handleCopyCommand}
                  className="absolute right-2 top-2 flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-indigo-500 transition-all shadow"
                >
                  {copied ? <Check size={13} className="text-emerald-300" /> : <Copy size={13} />}
                  <span>{copied ? "Copied!" : "Copy"}</span>
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-3 text-[11px] text-slate-400 space-y-1.5">
              <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Check size={14} className="text-emerald-400" />
                <span>What happens automatically?</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
                <li>Pairs securely with your account using an encrypted token.</li>
                <li>Device hostname will appear live in your <strong>"Fleet Endpoints"</strong> topbar dropdown.</li>
                <li>Attacks originating on their PC will be isolated to their device telemetry.</li>
              </ul>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl bg-slate-800 px-5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
