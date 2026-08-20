import { Sun, Moon, Bell, ShieldCheck, LogOut } from "lucide-react";
import { AppLauncher } from "./AppLauncher";
import { useTheme } from "../../theme/ThemeProvider";
import { useAuthStore } from "../../store/authStore";
import { Link, useNavigate } from "react-router-dom";

export function TopBar() {
  const { theme, toggleTheme } = useTheme();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  return (
    <header className="glass-panel sticky top-0 z-40 mx-4 mt-4 flex h-14 items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <AppLauncher />
        <Link
          to="/"
          aria-label="Go to SentinelX home"
          className="flex items-center gap-2 rounded-lg transition-opacity hover:opacity-80"
        >
          {/* Swap this icon for a real logo image whenever you have one, e.g.:
              <img src="/logo.svg" alt="SentinelX" className="h-5 w-5" /> */}
          <ShieldCheck className="text-sx-blue" size={18} />
          <span className="text-sm font-semibold tracking-wide text-slate-100">SentinelX</span>
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <span className="hidden items-center gap-1.5 rounded-full border border-slate-700/60 px-2.5 py-1 text-[11px] font-medium text-slate-400 sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
          OFFLINE MODE
        </span>

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