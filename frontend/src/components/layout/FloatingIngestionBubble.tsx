import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  Square,
  Activity,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Layers,
  Sparkles,
  Sliders,
  Zap,
} from "lucide-react";
import { useStreamStore } from "../../store/streamStore";

function formatName(filename?: string | null): string {
  if (!filename) return "Dataset Traffic Replay";
  if (filename.includes("Friday-WorkingHours-Afternoon-PortScan")) return "Friday — PortScan Attack";
  if (filename.includes("Wednesday-workingHours")) return "Wednesday — DoS / Slowloris";
  if (filename.includes("Thursday-WorkingHours-Morning-WebAttacks")) return "Thursday — Web Attacks";
  if (filename.includes("Thursday-WorkingHours-Afternoon-Infilteration")) return "Thursday — Infiltration";
  if (filename.includes("Tuesday-WorkingHours")) return "Tuesday — Brute Force";
  if (filename.includes("combinenew")) return "CIC-IDS Mixed Traffic";
  return filename.replace(".csv", "");
}

export function FloatingIngestionBubble() {
  const status = useStreamStore((s) => s.status);
  const isLoading = useStreamStore((s) => s.isLoading);
  const pauseStream = useStreamStore((s) => s.pauseStream);
  const resumeStream = useStreamStore((s) => s.resumeStream);
  const stopStream = useStreamStore((s) => s.stopStream);
  const setSpeed = useStreamStore((s) => s.setSpeed);
  const location = useLocation();

  const [minimized, setMinimized] = useState(false);

  // Only display the floating bubble if streaming is running or paused
  if (!status?.is_running) {
    return null;
  }

  const isStreaming = status.is_running && !status.is_paused;
  const isPaused = status.is_running && status.is_paused;
  const isOnDashboard = location.pathname === "/dashboard" || location.pathname === "/";

  return (
    <div className="fixed bottom-5 right-5 z-50 pointer-events-auto">
      <AnimatePresence mode="wait">
        {minimized ? (
          /* Compact Glowing Orb / Pill */
          <motion.button
            key="minimized"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={() => setMinimized(false)}
            aria-label="Expand dataset ingestion player"
            className="flex items-center gap-3 rounded-full border px-4 py-2.5 shadow-2xl backdrop-blur-2xl transition-all duration-200 hover:scale-105 active:scale-95"
            style={{
              borderColor: isStreaming ? "rgba(58,160,255,0.6)" : "rgba(245,158,11,0.6)",
              backgroundColor: "rgba(10,15,28,0.92)",
              boxShadow: isStreaming
                ? "0 10px 30px -5px rgba(0,0,0,0.8), 0 0 20px rgba(58,160,255,0.35)"
                : "0 10px 30px -5px rgba(0,0,0,0.8), 0 0 20px rgba(245,158,11,0.25)",
            }}
          >
            <span className="relative flex h-3 w-3">
              {isStreaming && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
              )}
              <span
                className={`relative inline-flex h-3 w-3 rounded-full ${
                  isStreaming ? "bg-cyan-400" : "bg-amber-400"
                }`}
              />
            </span>
            <div className="flex flex-col text-left">
              <span className="font-mono text-[11px] font-semibold text-white">
                {isStreaming ? "INGESTING" : "PAUSED"} • {status.events_ingested} pkts
              </span>
              <span className="text-[9px] font-medium text-slate-400 truncate max-w-[140px]">
                {formatName(status.current_filename)}
              </span>
            </div>
            <ChevronUp size={14} className="text-slate-400 ml-1" />
          </motion.button>
        ) : (
          /* Full Floating Control Island */
          <motion.div
            key="expanded"
            initial={{ scale: 0.9, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 15 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="w-[340px] sm:w-[380px] rounded-3xl border p-4 shadow-2xl backdrop-blur-2xl transition-colors duration-300"
            style={{
              borderColor: isStreaming ? "rgba(58,160,255,0.4)" : "rgba(245,158,11,0.4)",
              backgroundColor: "rgba(8,14,26,0.94)",
              boxShadow: isStreaming
                ? "0 20px 50px -10px rgba(0,0,0,0.9), 0 0 30px rgba(58,160,255,0.25)"
                : "0 20px 50px -10px rgba(0,0,0,0.9), 0 0 25px rgba(245,158,11,0.2)",
            }}
          >
            {/* Header / Info Row */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  {isStreaming && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                  )}
                  <span
                    className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                      isStreaming ? "bg-cyan-400" : "bg-amber-400"
                    }`}
                  />
                </span>
                <span className="font-mono text-xs font-semibold tracking-wide text-slate-100">
                  {isStreaming ? "DATASET INGESTION" : "INGESTION PAUSED"}
                </span>
                <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0.5 font-mono text-[10px] text-cyan-300">
                  {status.speed_eps} EPS
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {!isOnDashboard && (
                  <Link
                    to="/dashboard"
                    title="Open SOC Command Deck"
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <ExternalLink size={13} />
                  </Link>
                )}
                <button
                  onClick={() => setMinimized(true)}
                  title="Minimize"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <ChevronDown size={14} />
                </button>
              </div>
            </div>

            {/* Metrics & Current Packet */}
            <div className="my-3 grid grid-cols-2 gap-2">
              {/* Ingested Counter */}
              <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-black/40 px-3 py-2">
                <Layers size={14} className="text-sx-blue shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400">Ingested</span>
                  <span className="font-mono text-sm font-semibold text-white tabular-nums">
                    {status.events_ingested.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Active Classification */}
              <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-black/40 px-3 py-2">
                <Sparkles size={14} className="text-indigo-400 shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400">Packet</span>
                  <span className="font-mono text-xs font-semibold text-slate-200 truncate">
                    {status.current_label || "Traffic Stream"}
                  </span>
                </div>
              </div>
            </div>

            {/* Dataset filename */}
            <div className="mb-3 text-[11px] text-slate-400 flex items-center justify-between px-1">
              <span className="truncate max-w-[240px]">{formatName(status.current_filename)}</span>
              <span className="font-mono text-[10px] text-slate-500">CIC-IDS 2017</span>
            </div>

            {/* Controls Bar */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
              {/* Speed Buttons */}
              <div className="flex items-center gap-1">
                {[2, 10, 25, 50].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => setSpeed(spd)}
                    className={`rounded-lg px-2 py-1 font-mono text-[10px] transition-all ${
                      status.speed_eps === spd
                        ? "bg-sx-blue text-white font-semibold shadow-[0_0_8px_rgba(58,160,255,0.4)]"
                        : "border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white"
                    }`}
                  >
                    {spd === 2 ? "1x" : spd === 10 ? "5x" : spd === 25 ? "12x" : "25x"}
                  </button>
                ))}
              </div>

              {/* Playback Actions */}
              <div className="flex items-center gap-1.5">
                {isPaused ? (
                  <button
                    onClick={resumeStream}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md hover:brightness-110 active:scale-95 transition-all"
                  >
                    <Play size={12} className="fill-white" />
                    Resume
                  </button>
                ) : (
                  <button
                    onClick={pauseStream}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md hover:brightness-110 active:scale-95 transition-all"
                  >
                    <Pause size={12} className="fill-white" />
                    Pause
                  </button>
                )}

                <button
                  onClick={stopStream}
                  disabled={isLoading}
                  title="Stop Ingestion"
                  className="flex h-7 w-7 items-center justify-center rounded-xl border border-red-500/40 bg-red-500/15 text-red-300 hover:bg-red-500/25 active:scale-95 transition-all"
                >
                  <Square size={11} className="fill-red-300" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
