import { useEffect, useState } from "react";
import { Sun, Moon, Bell, ShieldCheck, LogOut, Radio, Play, Pause, Database } from "lucide-react";
import { AppLauncher } from "./AppLauncher";
import { useTheme } from "../../theme/ThemeProvider";
import { useAuthStore } from "../../store/authStore";
import { useStreamStore } from "../../store/streamStore";
import { Link, useNavigate } from "react-router-dom";

export function TopBar() {
  const { theme, toggleTheme } = useTheme();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const streamStatus = useStreamStore((s) => s.status);

  const mode = streamStatus?.active_mode || "OFFLINE";
  const isStreaming = streamStatus?.is_running && !streamStatus?.is_paused;
  const isPaused = streamStatus?.is_running && streamStatus?.is_paused;

  return (
    <header className="glass-panel sticky top-0 z-40 mx-4 mt-4 flex h-14 items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <AppLauncher />
        <Link
          to="/"
          aria-label="Go to SentinelX home"
          className="flex items-center gap-2 rounded-lg transition-opacity hover:opacity-80"
        >
          <ShieldCheck className="text-sx-blue" size={18} />
          <span className="text-sm font-semibold tracking-wide text-slate-100">SentinelX</span>
        </Link>
      </div>

      <div className="flex items-center gap-3">
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
              onClick={() => {
                logout();
                navigate("/login");
              }}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}