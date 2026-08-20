import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutGrid,
  ShieldAlert,
  Radar,
  ShieldQuestion,
  Fingerprint,
  Search as SearchIcon,
  MessageSquareText,
  FileText,
  Briefcase,
  BookOpen,
  Settings,
  ScrollText,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";

interface AppEntry {
  label: string;
  path: string;
  icon: ComponentType<any>;
  description: string;
}

const APPS: AppEntry[] = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutGrid, description: "SOC overview" },
  { label: "Security Operations", path: "/security-operations", icon: ShieldAlert, description: "Alerts & incidents" },
  { label: "Threat Detection", path: "/threat-detection", icon: Radar, description: "Detection engine" },
  { label: "Zero-Day Detection", path: "/zero-day", icon: ShieldQuestion, description: "GraphSAGE research" },
  { label: "Threat Intelligence & Risk", path: "/threat-intelligence", icon: Fingerprint, description: "IOCs & risk" },
  { label: "Investigation", path: "/investigation", icon: SearchIcon, description: "Case workspace" },
  { label: "AI SOC Assistant", path: "/ai-assistant", icon: MessageSquareText, description: "Groq-powered analysis" },
  { label: "Reports", path: "/reports", icon: FileText, description: "Incident reporting" },
  { label: "Case Management", path: "/cases", icon: Briefcase, description: "Analyst cases" },
  { label: "Knowledge Base", path: "/knowledge-base", icon: BookOpen, description: "RAG knowledge" },
  { label: "Settings", path: "/settings", icon: Settings, description: "System configuration" },
  { label: "Audit Logs", path: "/audit-logs", icon: ScrollText, description: "Security-sensitive actions" },
];

const gridVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.035, delayChildren: 0.1 } },
};

const tileVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } },
};

export function AppLauncher() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      const t = setTimeout(() => searchRef.current?.focus(), 150);
      return () => {
        clearTimeout(t);
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const filteredApps = useMemo(
    () => APPS.filter((app) => app.label.toLowerCase().includes(query.toLowerCase())),
    [query]
  );

  function handleSelect(path: string) {
    setOpen(false);
    navigate(path);
  }

  return (
    <>
      <button
        type="button"
        aria-label="Open application launcher"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-sx-blue cursor-pointer"
      >
        <LayoutGrid size={20} />
      </button>

      {createPortal(
        <AnimatePresence>
          {open && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-8">
              {/* backdrop */}
              <motion.div
                className="absolute inset-0 bg-black/80 backdrop-blur-xl"
                onClick={() => setOpen(false)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />

              {/* full panel container */}
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-label="Application launcher"
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-10 flex h-full max-h-[850px] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-white/15 bg-[#060b16]/98 shadow-[0_40px_120px_-24px_rgba(0,0,0,0.9)]"
              >
                {/* ambient glow */}
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                  <div className="absolute -top-40 -left-32 h-[420px] w-[420px] rounded-full bg-sx-blue/[0.14] blur-[130px]" />
                  <div className="absolute -bottom-40 -right-24 h-[420px] w-[420px] rounded-full bg-indigo-500/[0.10] blur-[140px]" />
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                </div>

                {/* header */}
                <div className="relative flex items-center gap-4 border-b border-white/[0.08] px-6 py-5 sm:px-8">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sx-blue/10 text-sx-blue">
                      <LayoutGrid size={16} />
                    </span>
                    <div>
                      <h2 className="text-sm font-semibold text-slate-100">Applications</h2>
                      <p className="text-[11px] text-slate-500">{filteredApps.length} of {APPS.length} modules</p>
                    </div>
                  </div>

                  <div className="relative ml-2 flex-1 max-w-sm">
                    <SearchIcon size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      ref={searchRef}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search applications…"
                      className="w-full rounded-lg border border-white/10 bg-white/[0.04] py-2 pl-8 pr-3 text-xs text-slate-200 placeholder:text-slate-500 focus:border-sx-blue/40 focus:outline-none"
                    />
                  </div>

                  <button
                    aria-label="Close launcher"
                    onClick={() => setOpen(false)}
                    className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* app grid */}
                <div className="relative flex-1 overflow-y-auto px-6 py-6 sm:px-8">
                  {filteredApps.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm text-slate-500">
                      No applications match "{query}"
                    </div>
                  ) : (
                    <motion.div
                      variants={gridVariants}
                      initial="hidden"
                      animate="show"
                      className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
                    >
                      {filteredApps.map((app) => {
                        const Icon = app.icon;
                        return (
                          <motion.button
                            key={app.path}
                            variants={tileVariants}
                            whileHover={{ y: -3 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => handleSelect(app.path)}
                            className="group flex flex-col items-start gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 text-left transition-colors duration-200 hover:border-sx-blue/40 hover:bg-white/[0.07] focus-visible:outline focus-visible:outline-2 focus-visible:outline-sx-blue cursor-pointer"
                          >
                            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sx-blue/10 text-sx-blue transition-all duration-200 group-hover:bg-sx-blue/20 group-hover:shadow-[0_0_20px_-2px_rgba(58,160,255,0.5)]">
                              <Icon size={20} />
                            </span>
                            <div>
                              <div className="text-[13px] font-medium text-slate-100">{app.label}</div>
                              <div className="mt-0.5 text-[11px] leading-snug text-slate-400">{app.description}</div>
                            </div>
                          </motion.button>
                        );
                      })}
                    </motion.div>
                  )}
                </div>

                {/* footer hint */}
                <div className="relative border-t border-white/[0.08] px-6 py-3 text-[10px] text-slate-500 sm:px-8">
                  Press <kbd className="rounded border border-white/10 px-1 py-0.5 text-slate-400">Esc</kbd> to close
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
