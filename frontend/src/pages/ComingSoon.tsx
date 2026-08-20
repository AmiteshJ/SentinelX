import { DashboardShell } from "../components/layout/DashboardShell";

/**
 * Honest placeholder for applications not yet implemented in this phase
 * (Security Operations, Threat Detection, Zero-Day Detection, Threat
 * Intelligence & Risk, Investigation, AI SOC Assistant, Reports, Case
 * Management, Knowledge Base, Settings, Audit Logs UI).
 *
 * These land in Phases 4-19 per docs/architecture.md. This screen exists so
 * the App Launcher never routes to a broken page, and so it's clear that
 * nothing here is faked — the backend contract simply doesn't exist yet.
 */
export function ComingSoon({ title, phase }: { title: string; phase: string }) {
  return (
    <DashboardShell>
      <div className="glass-panel flex min-h-[50vh] flex-col items-center justify-center gap-2 p-8 text-center">
        <h1 className="text-lg font-semibold text-slate-100">{title}</h1>
        <p className="max-w-md text-sm text-slate-500">
          This module is scoped for {phase}. The backend contract and data model exist in the
          architecture plan but haven't been implemented yet — nothing here is placeholder data.
        </p>
      </div>
    </DashboardShell>
  );
}
