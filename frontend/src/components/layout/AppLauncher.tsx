import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutGrid,
  ShieldAlert,
  ShieldQuestion,
  Fingerprint,
  Search as SearchIcon,
  MessageSquareText,
  Briefcase,
  BookOpen,
  Settings,
  ScrollText,
  X,
  Target,
  CodeXml,
  Compass,
  Bug,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";

interface TileApp {
  id: string;
  label: string;
  path: string;
  icon: ComponentType<any>;
  description: string;
  size: "square" | "wide";
  accentColor: string; // refined theme accent (e.g. sx-blue, cyan, emerald, purple)
  accentBg: string;
  badge?: string;
}

const APPS: TileApp[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    path: "/dashboard",
    icon: LayoutGrid,
    description: "Real-time SOC telemetry & event replay",
    size: "wide",
    accentColor: "text-sky-400",
    accentBg: "bg-sky-500/10 border-sky-500/20",
    badge: "LIVE",
  },
  {
    id: "security-operations",
    label: "Security Operations",
    path: "/security-operations",
    icon: ShieldAlert,
    description: "Alert correlation & triage",
    size: "square",
    accentColor: "text-rose-400",
    accentBg: "bg-rose-500/10 border-rose-500/20",
  },
  {
    id: "investigation",
    label: "Investigation",
    path: "/investigation",
    icon: SearchIcon,
    description: "Deep incident workspace",
    size: "square",
    accentColor: "text-amber-400",
    accentBg: "bg-amber-500/10 border-amber-500/20",
  },
  {
    id: "cases-reports",
    label: "Cases & Reports",
    path: "/cases",
    icon: Briefcase,
    description: "Lifecycle tracking & automated AI reporting",
    size: "wide",
    accentColor: "text-indigo-400",
    accentBg: "bg-indigo-500/10 border-indigo-500/20",
    badge: "UNIFIED",
  },
  {
    id: "mitre-matrix",
    label: "MITRE ATT&CK",
    path: "/mitre-matrix",
    icon: Compass,
    description: "Adversary tactic heatmap",
    size: "square",
    accentColor: "text-teal-400",
    accentBg: "bg-teal-500/10 border-teal-500/20",
  },
  {
    id: "threat-hunting",
    label: "Threat Hunting",
    path: "/hunting",
    icon: Target,
    description: "Raw telemetry & IOC query",
    size: "square",
    accentColor: "text-emerald-400",
    accentBg: "bg-emerald-500/10 border-emerald-500/20",
  },
  {
    id: "ai-assistant",
    label: "AI SOC Assistant",
    path: "/ai-assistant",
    icon: MessageSquareText,
    description: "Groq LLaMA 3.3 automated cybersecurity copilot",
    size: "wide",
    accentColor: "text-fuchsia-400",
    accentBg: "bg-fuchsia-500/10 border-fuchsia-500/20",
    badge: "GROQ AI",
  },
  {
    id: "threat-intelligence",
    label: "Threat Intelligence",
    path: "/threat-intelligence",
    icon: Fingerprint,
    description: "Autonomous threat feeds & reputation scoring",
    size: "wide",
    accentColor: "text-purple-400",
    accentBg: "bg-purple-500/10 border-purple-500/20",
    badge: "FEEDS",
  },
  {
    id: "zero-day",
    label: "Zero-Day Detection",
    path: "/zero-day",
    icon: ShieldQuestion,
    description: "GraphSAGE inductive learning",
    size: "square",
    accentColor: "text-cyan-400",
    accentBg: "bg-cyan-500/10 border-cyan-500/20",
  },
  {
    id: "malware-analysis",
    label: "Malware Sandbox",
    path: "/malware-analysis",
    icon: Bug,
    description: "Detonation & static analysis",
    size: "square",
    accentColor: "text-red-400",
    accentBg: "bg-red-500/10 border-red-500/20",
  },
  {
    id: "detection",
    label: "Detection Rules",
    path: "/detection",
    icon: CodeXml,
    description: "Sigma rules & engine state",
    size: "square",
    accentColor: "text-blue-400",
    accentBg: "bg-blue-500/10 border-blue-500/20",
  },
  {
    id: "knowledge-base",
    label: "Knowledge Base",
    path: "/knowledge-base",
    icon: BookOpen,
    description: "NIST standards & RAG vectors",
    size: "square",
    accentColor: "text-sky-400",
    accentBg: "bg-sky-500/10 border-sky-500/20",
  },
  {
    id: "settings",
    label: "Settings",
    path: "/settings",
    icon: Settings,
    description: "System & API keys configuration",
    size: "wide",
    accentColor: "text-slate-300",
    accentBg: "bg-slate-500/10 border-slate-500/20",
  },
  {
    id: "audit-logs",
    label: "Audit Logs",
    path: "/audit-logs",
    icon: ScrollText,
    description: "Immutable compliance & analyst actions",
    size: "wide",
    accentColor: "text-slate-300",
    accentBg: "bg-slate-500/10 border-slate-500/20",
    badge: "AUDIT",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.025,
      delayChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14, scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.22,
      ease: [0.16, 1, 0.3, 1],
    },
  },
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
      const t = setTimeout(() => searchRef.current?.focus(), 120);
      return () => {
        clearTimeout(t);
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const filteredApps = useMemo(() => {
    if (!query.trim()) return APPS;
    const q = query.toLowerCase();
    return APPS.filter(
      (app) =>
        app.label.toLowerCase().includes(q) ||
        app.description.toLowerCase().includes(q) ||
        (app.badge && app.badge.toLowerCase().includes(q))
    );
  }, [query]);

  function handleSelect(path: string) {
    setOpen(false);
    navigate(path);
  }

  return (
    <>
      {/* Trigger Button in Header */}
      <button
        type="button"
        aria-label="Open application launcher"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-sx-blue cursor-pointer"
        title="Application Launcher"
      >
        <LayoutGrid size={20} />
      </button>

      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Applications"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[9999] h-screen w-screen overflow-y-auto bg-[#040814]/90 backdrop-blur-2xl text-white flex flex-col items-center justify-start sm:justify-center p-4 sm:p-8 md:p-12 select-none"
            >
              {/* Subtle ambient lighting */}
              <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <div className="absolute top-1/4 left-1/3 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-sky-500/[0.06] blur-[150px]" />
                <div className="absolute bottom-1/4 right-1/3 h-[500px] w-[500px] rounded-full bg-indigo-500/[0.05] blur-[160px]" />
              </div>

              {/* Floating Close Button (Top-Right) */}
              <button
                type="button"
                aria-label="Close launcher"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                }}
                className="fixed top-6 right-6 sm:top-8 sm:right-8 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-400 hover:border-white/20 hover:bg-white/[0.08] hover:text-white transition-all cursor-pointer backdrop-blur-md"
              >
                <X size={18} />
              </button>

              {/* Centered Main Content Wrapper */}
              <div
                onClick={(e) => e.stopPropagation()}
                className="relative z-10 w-full max-w-5xl flex flex-col items-center my-auto py-6"
              >
                {/* Minimal Header with Search */}
                <div className="w-full max-w-md mb-8 flex flex-col items-center text-center">
                  <div className="relative w-full">
                    <SearchIcon
                      size={15}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      ref={searchRef}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search applications..."
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.04] py-3 pl-11 pr-10 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 backdrop-blur-xl focus:border-sky-400/50 focus:bg-white/[0.07] focus:outline-none transition-all shadow-[0_8px_30px_rgb(0,0,0,0.12)]"
                    />
                    {query && (
                      <button
                        type="button"
                        onClick={() => setQuery("")}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Symmetrical Window Glass Tiles Grid */}
                {filteredApps.length === 0 ? (
                  <div className="flex h-56 flex-col items-center justify-center text-center text-slate-400">
                    <LayoutGrid size={36} className="mb-2 text-slate-600" />
                    <p className="text-sm font-medium text-slate-300">No applications match "{query}"</p>
                    <p className="text-xs text-slate-500 mt-1">Press Esc to exit or try a different term</p>
                  </div>
                ) : (
                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="grid w-full grid-cols-2 sm:grid-cols-4 gap-3.5"
                  >
                    {filteredApps.map((app) => (
                      <GlassTile
                        key={app.id}
                        app={app}
                        onSelect={handleSelect}
                      />
                    ))}
                  </motion.div>
                )}

                {/* Minimalist Keycap hint */}
                <div className="mt-8 text-center text-[11px] font-mono text-slate-500">
                  Press <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-slate-400">Esc</kbd> or click outside to dismiss
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Window Glass Tile with Dynamic Mouse Hover Maximize
// ---------------------------------------------------------------------------
function GlassTile({
  app,
  onSelect,
}: {
  app: TileApp;
  onSelect: (path: string) => void;
}) {
  const Icon = app.icon;
  const isWide = app.size === "wide";

  return (
    <motion.button
      type="button"
      variants={itemVariants}
      whileHover={{
        scale: 1.045,
        y: -4,
        zIndex: 30,
        boxShadow: "0 20px 40px -12px rgba(0, 0, 0, 0.7), 0 0 25px 2px rgba(56, 189, 248, 0.16)",
      }}
      whileTap={{ scale: 0.97 }}
      transition={{
        type: "spring",
        stiffness: 420,
        damping: 24,
      }}
      onClick={() => onSelect(app.path)}
      className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 text-left backdrop-blur-xl transition-[border-color,background-color] duration-200 hover:border-sky-400/40 hover:bg-white/[0.06] cursor-pointer ${
        isWide ? "col-span-2 h-[115px]" : "col-span-1 h-[115px]"
      }`}
    >
      {/* Specular glass reflection sheen */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/[0.04] to-transparent" />

      {/* Top row: Icon and optional pill badge */}
      <div className="relative z-10 flex items-start justify-between">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl border ${app.accentBg} ${app.accentColor} transition-transform duration-200 group-hover:scale-110 shadow-sm`}
        >
          <Icon size={19} />
        </div>

        {app.badge && (
          <span className="rounded-md border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-slate-300">
            {app.badge}
          </span>
        )}
      </div>

      {/* Bottom row: Title & Description */}
      <div className="relative z-10 space-y-0.5">
        <div className="text-[13px] font-semibold text-slate-100 group-hover:text-white transition-colors truncate">
          {app.label}
        </div>
        <div className="text-[11px] text-slate-400 group-hover:text-slate-300 transition-colors truncate">
          {app.description}
        </div>
      </div>
    </motion.button>
  );
}
