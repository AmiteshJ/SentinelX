import type { ReactNode } from "react";
import { TopBar } from "./TopBar";

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-4 mt-4 pb-8">{children}</main>
    </div>
  );
}
