import { useEffect, useMemo, useRef, useState, type ReactNode, type ComponentType, type CSSProperties } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import {
  UploadCloud,
  FileText,
  TreeDeciduous,
  Layers,
  Grid3x3,
  Waves,
  Share2,
  BrainCircuit,
  X,
  ChevronRight,
  ChevronDown,
  Trophy,
  Clock,
  Database as DatabaseIcon,
  History as HistoryIcon,
  Search,
  Filter,
  User as UserIcon,
  Tag,
  RotateCcw,
} from "lucide-react";
import { DashboardShell } from "../components/layout/DashboardShell";
import { apiClient } from "../api/client";
import { useTheme } from "../theme/ThemeProvider";
import type { Experiment, ExperimentResult } from "../types/api";

// ---------------------------------------------------------------------------
// Same design tokens as Dashboard.tsx — kept local so this page stays
// self-contained, matching the pattern established across the app.
// ---------------------------------------------------------------------------
const DARK_PALETTE = {
  pageBg: "#040810",
  gradientOverlay: "linear-gradient(180deg,#050b18 0%,#040810 45%,#020509 100%)",
  blob1: "rgba(58,160,255,0.16)",
  blob2: "rgba(37,99,235,0.10)",
  blob3: "rgba(99,102,241,0.07)",
  radarColor: "#3aa0ff",
  radarOpacity: 0.14,
  text: "#f8fafc",
  textSecondary: "#94a3b8",
  textMuted: "#64748b",
  surface: "rgba(255,255,255,0.025)",
  surfaceHover: "rgba(255,255,255,0.045)",
  border: "rgba(255,255,255,0.08)",
  borderHover: "rgba(58,160,255,0.32)",
  primary: "#3aa0ff",
  primaryGlow: "#5fc2ff",
  onPrimary: "#04101f",
  hairline: "rgba(255,255,255,0.18)",
  shadowGlow: "rgba(58,160,255,0.20)",
  panelShadow: "rgba(0,0,0,0.75)",
  errorBg: "rgba(239,68,68,0.10)",
  errorBorder: "rgba(239,68,68,0.30)",
  errorText: "#fca5a5",
  successText: "#34d399",
};

const LIGHT_PALETTE = {
  pageBg: "#FAF9FF",
  gradientOverlay: "linear-gradient(180deg,#FDFCFF 0%,#FAF9FF 55%,#F5F3FF 100%)",
  blob1: "rgba(124,58,237,0.10)",
  blob2: "rgba(167,139,250,0.12)",
  blob3: "rgba(196,181,253,0.20)",
  radarColor: "#7C3AED",
  radarOpacity: 0.07,
  text: "#18181B",
  textSecondary: "#71717A",
  textMuted: "#A1A1AA",
  surface: "#FFFFFF",
  surfaceHover: "#FCFAFF",
  border: "#E9E7F2",
  borderHover: "rgba(124,58,237,0.35)",
  primary: "#7C3AED",
  primaryGlow: "#A78BFA",
  onPrimary: "#FFFFFF",
  hairline: "rgba(124,58,237,0.14)",
  shadowGlow: "rgba(124,58,237,0.18)",
  panelShadow: "rgba(124,58,237,0.12)",
  errorBg: "rgba(244,63,94,0.08)",
  errorBorder: "rgba(244,63,94,0.30)",
  errorText: "#E11D48",
  successText: "#16A34A",
};

type Palette = typeof DARK_PALETTE;

// ---------------------------------------------------------------------------
// Model metadata — one color/icon per model, reused across selection cards,
// the 3D training visualization, and the results cards so a model is always
// visually identifiable the same way throughout the page.
// ---------------------------------------------------------------------------
const MODEL_META: Record<string, { label: string; icon: ComponentType<any>; color: string; description: string }> = {
  random_forest: { label: "Random Forest", icon: TreeDeciduous, color: "#38bdf8", description: "Ensemble of decision trees — the classic, reliable baseline." },
  xgboost: { label: "XGBoost", icon: Layers, color: "#818cf8", description: "Gradient-boosted trees — usually the strongest tabular baseline." },
  cnn: { label: "CNN", icon: Grid3x3, color: "#2dd4bf", description: "1D convolution over the flow's feature vector." },
  lstm: { label: "LSTM", icon: Waves, color: "#f472b6", description: "Recurrent model, applied to each flow's feature vector." },
  graphsage: { label: "GraphSAGE", icon: Share2, color: "", description: "Graph neural network — the research centerpiece of this module." },
};
const MODEL_ORDER = ["random_forest", "xgboost", "cnn", "lstm", "graphsage"];

function modelColor(modelId: string, palette: Palette): string {
  return MODEL_META[modelId]?.color || palette.primary;
}

function modelLabel(modelId: string): string {
  return MODEL_META[modelId]?.label || modelId.replace(/_/g, " ");
}

// Cycles through while a run is in flight — cosmetic status text only, never
// implies a real progress percentage we don't actually have.
function buildStatusMessages(selected: string[]): string[] {
  const messages = ["Validating dataset…", "Cleaning & normalizing rows…"];
  if (selected.length) messages.push("Holding out the selected attack class…");
  selected.forEach((m) => messages.push(`Training ${modelLabel(m)}…`));
  messages.push("Computing precision, recall, F1, ROC-AUC…", "Assembling results…");
  return messages;
}

function interpretResult(r: ExperimentResult): string {
  const label = modelLabel(r.model);
  if (r.error) return `${label} failed to train: ${r.error}`;
  const f1 = r.f1_score ?? 0;
  let verdict = "did not generalize well";
  if (f1 >= 0.9) verdict = "generalized very well";
  else if (f1 >= 0.75) verdict = "generalized reasonably well";
  else if (f1 >= 0.5) verdict = "showed mixed generalization";
  const heldOutNote = r.held_out_class ? `, even though "${r.held_out_class}" was never present in training` : "";
  const sampleNote = r.n_test_samples ? ` across ${r.n_test_samples} test samples` : "";
  return `${label} scored an F1 of ${f1.toFixed(2)}${sampleNote}${heldOutNote} — it ${verdict}.`;
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } },
};
const staggerContainer = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };

// ---------------------------------------------------------------------------
// TiltCard — an immersive, mouse-reactive card: subtle 3D tilt following the
// cursor plus a radial spotlight glow, used for dataset upload + model
// selection so that panel feels alive without a WebGL/three.js dependency.
// ---------------------------------------------------------------------------
function TiltCard({
  children,
  onClick,
  glowColor,
  className = "",
  style,
}: {
  children: ReactNode;
  onClick?: () => void;
  glowColor: string;
  className?: string;
  style?: CSSProperties;
}) {
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springX = useSpring(rotateX, { stiffness: 220, damping: 22 });
  const springY = useSpring(rotateY, { stiffness: 220, damping: 22 });
  const [spot, setSpot] = useState({ x: 50, y: 50 });
  const [hovering, setHovering] = useState(false);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    rotateY.set((px - 0.5) * 12);
    rotateX.set((0.5 - py) * 12);
    setSpot({ x: px * 100, y: py * 100 });
  }
  function handleMouseLeave() {
    rotateX.set(0);
    rotateY.set(0);
    setHovering(false);
  }

  return (
    <div style={{ perspective: 900 }}>
      <motion.div
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={handleMouseLeave}
        onClick={onClick}
        style={{ rotateX: springX, rotateY: springY, transformStyle: "preserve-3d", ...style }}
        className={`relative overflow-hidden ${className}`}
      >
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-300"
          style={{
            opacity: hovering ? 1 : 0,
            background: `radial-gradient(circle at ${spot.x}% ${spot.y}%, ${glowColor}26, transparent 62%)`,
          }}
        />
        <div className="relative" style={{ transform: "translateZ(24px)" }}>
          {children}
        </div>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3D training visualization — a real perspective/rotateY/translateZ orbit
// (not a canvas illusion), with the selected models orbiting a pulsing core.
// ---------------------------------------------------------------------------
function TrainingVisualization({ selectedModels, palette }: { selectedModels: string[]; palette: Palette }) {
  const [messageIdx, setMessageIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const messages = useMemo(() => buildStatusMessages(selectedModels), [selectedModels]);

  useEffect(() => {
    const msgTimer = setInterval(() => setMessageIdx((i) => (i + 1) % messages.length), 1500);
    const clock = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => {
      clearInterval(msgTimer);
      clearInterval(clock);
    };
  }, [messages.length]);

  const radius = 110;

  return (
    <div className="flex flex-col items-center justify-center py-14">
      <div style={{ perspective: 1000 }}>
        <div
          className="sx-orbit-stage relative"
          style={{ width: radius * 2 + 60, height: radius * 2 + 60, transformStyle: "preserve-3d" }}
        >
          <style>{`
            @keyframes sx-orbit-spin { from { transform: rotateY(0deg); } to { transform: rotateY(360deg); } }
            .sx-orbit-stage { animation: sx-orbit-spin 9s linear infinite; transform-style: preserve-3d; }
            @keyframes sx-core-pulse { 0%, 100% { transform: scale(1); opacity: 0.9; } 50% { transform: scale(1.18); opacity: 1; } }
            .sx-core-pulse { animation: sx-core-pulse 1.7s ease-in-out infinite; }
          `}</style>
          {selectedModels.map((modelId, idx) => {
            const angle = (360 / selectedModels.length) * idx;
            const meta = MODEL_META[modelId];
            const color = modelColor(modelId, palette);
            const Icon = meta?.icon || BrainCircuit;
            return (
              <div
                key={modelId}
                className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-1 rounded-2xl border backdrop-blur-xl"
                style={{
                  transform: `rotateY(${angle}deg) translateZ(${radius}px)`,
                  borderColor: `${color}55`,
                  backgroundColor: palette.surface,
                  boxShadow: `0 0 24px -6px ${color}88`,
                }}
              >
                <Icon size={18} style={{ color }} />
                <span className="text-[8px] font-medium uppercase tracking-wide" style={{ color: palette.textSecondary }}>
                  {meta?.label.split(" ")[0] || modelId}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div
        className="sx-core-pulse relative -mt-[130px] flex h-16 w-16 items-center justify-center rounded-full"
        style={{ backgroundColor: `${palette.primary}22`, boxShadow: `0 0 40px 10px ${palette.primary}44` }}
      >
        <BrainCircuit size={26} style={{ color: palette.primary }} />
      </div>

      <div className="mt-16 text-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={messageIdx}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="font-mono text-xs"
            style={{ color: palette.textSecondary }}
          >
            {messages[messageIdx]}
          </motion.p>
        </AnimatePresence>
        <p className="mt-2 font-mono text-[10px]" style={{ color: palette.textMuted }}>
          Elapsed: {elapsed}s — real training is running server-side, this isn't a fixed-length animation.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Confusion matrix heatmap — small, descriptive, color-scaled by the model's
// assigned color.
// ---------------------------------------------------------------------------
function ConfusionMatrix({ matrix, color, palette }: { matrix: number[][]; color: string; palette: Palette }) {
  const max = Math.max(1, ...matrix.flat());
  return (
    <div className="inline-grid gap-1" style={{ gridTemplateColumns: `repeat(${matrix.length}, minmax(0, 1fr))` }}>
      {matrix.flat().map((v, idx) => (
        <div
          key={idx}
          className="flex h-9 w-9 items-center justify-center rounded-md font-mono text-[10px]"
          style={{ backgroundColor: `${color}${Math.round((v / max) * 70 + 10).toString(16).padStart(2, "0")}`, color: v / max > 0.5 ? palette.onPrimary : palette.text }}
        >
          {v}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Model result card — same component renders both the compact grid tile and
// the expanded detail view, sharing a layoutId so clicking morphs smoothly
// (the technique used for the App Launcher).
// ---------------------------------------------------------------------------
function ModelResultCard({
  result,
  expanded,
  onToggle,
  palette,
}: {
  result: ExperimentResult;
  expanded: boolean;
  onToggle: () => void;
  palette: Palette;
}) {
  const meta = MODEL_META[result.model];
  const color = modelColor(result.model, palette);
  const Icon = meta?.icon || BrainCircuit;

  if (result.error) {
    return (
      <motion.div
        layoutId={`sx-model-${result.model}`}
        layout
        onClick={onToggle}
        className="cursor-pointer rounded-[24px] border p-5"
        style={{ borderColor: palette.errorBorder, backgroundColor: palette.errorBg }}
      >
        <div className="flex items-center gap-2">
          <Icon size={16} style={{ color: palette.errorText }} />
          <span className="text-sm font-medium" style={{ color: palette.errorText }}>{modelLabel(result.model)}</span>
        </div>
        <p className="mt-2 text-xs" style={{ color: palette.errorText }}>{result.error}</p>
      </motion.div>
    );
  }

  if (!expanded) {
    return (
      <motion.div
        layoutId={`sx-model-${result.model}`}
        layout
        onClick={onToggle}
        whileHover={{ y: -3 }}
        className="cursor-pointer rounded-[24px] border p-5 backdrop-blur-xl transition-colors"
        style={{ borderColor: palette.border, backgroundColor: palette.surface }}
      >
        <div className="flex items-center justify-between">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}1a` }}>
            <Icon size={16} style={{ color }} />
          </span>
          <ChevronRight size={14} style={{ color: palette.textMuted }} />
        </div>
        <h3 className="mt-3 text-sm font-medium" style={{ color: palette.text }}>{modelLabel(result.model)}</h3>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="font-mono text-2xl font-semibold" style={{ color }}>{(result.f1_score ?? 0).toFixed(2)}</span>
          <span className="text-[10px] uppercase tracking-wide" style={{ color: palette.textMuted }}>F1 score</span>
        </div>
        <p className="mt-1 text-[11px]" style={{ color: palette.textMuted }}>
          Accuracy {(result.accuracy ?? 0).toFixed(2)} · View details
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      layoutId={`sx-model-${result.model}`}
      layout
      className="rounded-[28px] border p-6 backdrop-blur-xl"
      style={{ borderColor: color, backgroundColor: palette.surface, boxShadow: `0 24px 70px -30px ${color}55` }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}1a` }}>
            <Icon size={20} style={{ color }} />
          </span>
          <div>
            <h3 className="text-lg font-semibold" style={{ color: palette.text }}>{modelLabel(result.model)}</h3>
            <p className="text-xs" style={{ color: palette.textMuted }}>{meta?.description}</p>
          </div>
        </div>
        <button onClick={onToggle} className="rounded-lg p-1.5 transition-colors" style={{ color: palette.textMuted }} aria-label="Collapse">
          <X size={16} />
        </button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {([
          ["Accuracy", result.accuracy],
          ["Precision", result.precision],
          ["Recall", result.recall],
          ["F1", result.f1_score],
          ["ROC-AUC", result.roc_auc],
        ] as const).map(([label, value]) => (
          <div key={label} className="rounded-xl border p-3" style={{ borderColor: palette.border }}>
            <div className="font-mono text-lg font-semibold" style={{ color: palette.text }}>
              {value === null || value === undefined ? "—" : value.toFixed(2)}
            </div>
            <div className="text-[10px] uppercase tracking-wide" style={{ color: palette.textMuted }}>{label}</div>
            {value !== null && value !== undefined && (
              <div className="mt-1.5 h-1 overflow-hidden rounded-full" style={{ backgroundColor: palette.border }}>
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, value * 100)}%`, backgroundColor: color }} />
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="mt-5 rounded-xl border p-3.5 text-sm leading-relaxed" style={{ borderColor: palette.border, color: palette.textSecondary }}>
        {interpretResult(result)}
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-6">
        {result.confusion_matrix && (
          <div>
            <div className="mb-2 text-[10px] uppercase tracking-wide" style={{ color: palette.textMuted }}>Confusion matrix</div>
            <ConfusionMatrix matrix={result.confusion_matrix} color={color} palette={palette} />
          </div>
        )}
        <div className="flex items-center gap-4 text-xs" style={{ color: palette.textMuted }}>
          {result.training_seconds !== undefined && (
            <span className="flex items-center gap-1.5"><Clock size={13} /> {result.training_seconds}s to train</span>
          )}
          {result.n_test_samples !== undefined && (
            <span className="flex items-center gap-1.5"><DatabaseIcon size={13} /> {result.n_test_samples} test samples</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------

export function ZeroDayDetection() {
  const { theme } = useTheme();
  const palette: Palette = useMemo(() => (theme === "dark" ? DARK_PALETTE : LIGHT_PALETTE), [theme]);

  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [heldOutClass, setHeldOutClass] = useState("");
  const [selectedModels, setSelectedModels] = useState<string[]>(MODEL_ORDER);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latest, setLatest] = useState<Experiment | null>(null);
  const [history, setHistory] = useState<Experiment[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [filterUser, setFilterUser] = useState<string>("all");
  const [filterHeldOut, setFilterHeldOut] = useState<string>("all");
  const [historySearch, setHistorySearch] = useState<string>("");
  const [focusedModel, setFocusedModel] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uniqueUsers = useMemo(() => {
    const set = new Set<string>();
    history.forEach((h) => {
      if (h.triggered_by) set.add(h.triggered_by);
    });
    return Array.from(set);
  }, [history]);

  const uniqueHeldOuts = useMemo(() => {
    const set = new Set<string>();
    history.forEach((h) => {
      if (h.held_out_class) set.add(h.held_out_class);
    });
    return Array.from(set);
  }, [history]);

  const filteredHistory = useMemo(() => {
    return history.filter((exp) => {
      if (filterUser !== "all" && exp.triggered_by !== filterUser) return false;
      if (filterHeldOut !== "all") {
        if (filterHeldOut === "standard_split" && exp.experiment_type !== "standard_split") return false;
        if (filterHeldOut !== "standard_split" && exp.held_out_class !== filterHeldOut) return false;
      }
      if (historySearch.trim()) {
        const q = historySearch.toLowerCase();
        const matchType = exp.experiment_type?.toLowerCase().includes(q);
        const matchHeld = exp.held_out_class?.toLowerCase().includes(q);
        const matchUser = exp.triggered_by?.toLowerCase().includes(q);
        const matchModel = exp.results?.some((r) => r.model.toLowerCase().includes(q));
        if (!matchType && !matchHeld && !matchUser && !matchModel) return false;
      }
      return true;
    });
  }, [history, filterUser, filterHeldOut, historySearch]);

  async function loadHistory() {
    try {
      const { data } = await apiClient.get("/api/experiments/history");
      setHistory(data.items);
    } catch {
      /* not authorized or backend unreachable — leave history empty */
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  function toggleModel(m: string) {
    setSelectedModels((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) setFile(dropped);
  }

  async function handleRun() {
    if (!file || selectedModels.length === 0) return;
    setRunning(true);
    setError(null);
    setFocusedModel(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (heldOutClass) formData.append("held_out_class", heldOutClass);
      formData.append("models", selectedModels.join(","));

      const { data } = await apiClient.post("/api/experiments/run", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 300000,
      });
      setLatest(data);
      await loadHistory();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Experiment failed. CNN/LSTM/GraphSAGE require torch + torch-geometric installed on the backend.");
    } finally {
      setRunning(false);
    }
  }

  const gridStyle: CSSProperties = { backgroundColor: palette.pageBg };

  return (
    <>
      {/* ---- Ambient background — same language as Dashboard.tsx ---- */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" style={gridStyle}>
        <div className="absolute inset-0" style={{ background: palette.gradientOverlay }} />
        <div className="absolute -top-52 -left-40 h-[560px] w-[560px] rounded-full blur-[140px]" style={{ backgroundColor: palette.blob1 }} />
        <div className="absolute top-1/4 -right-40 h-[520px] w-[520px] rounded-full blur-[160px]" style={{ backgroundColor: palette.blob2 }} />
        <div className="absolute bottom-[-20%] left-1/3 h-[480px] w-[480px] rounded-full blur-[150px]" style={{ backgroundColor: palette.blob3 }} />
        <div
          className="sx-radar-sweep absolute -top-72 -right-72 h-[900px] w-[900px] rounded-full"
          style={{ opacity: palette.radarOpacity, background: `conic-gradient(from 0deg, transparent 0deg, ${palette.radarColor} 6deg, transparent 46deg)` }}
        />
        <style>{`
          @keyframes sx-radar-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          .sx-radar-sweep { animation: sx-radar-spin 18s linear infinite; }
        `}</style>
      </div>

      <DashboardShell>
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-6">
          <div className="mb-1.5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: palette.primaryGlow }}>
            <BrainCircuit size={11} />
            SentinelX // Research Module
          </div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: palette.text }}>Zero-Day Detection</h1>
          <p className="mt-1 max-w-2xl text-sm" style={{ color: palette.textSecondary }}>
            Held-out-class evaluation: an entire attack class is hidden from training, then
            introduced only at test time — GraphSAGE vs. Random Forest, XGBoost, CNN, and LSTM.
          </p>
        </motion.div>

        {/* ---- Configuration panel ---- */}
        <motion.div initial="hidden" animate="show" variants={staggerContainer} className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Dataset upload — immersive tilt card */}
          <motion.div variants={fadeUp} className="lg:col-span-1">
            <TiltCard
              glowColor={palette.primary}
              className="flex h-full flex-col items-center justify-center rounded-[24px] border-2 border-dashed p-6 text-center"
              style={{ borderColor: file ? palette.primary : palette.border, backgroundColor: palette.surface }}
              onClick={() => fileInputRef.current?.click()}
            >
              <div onDrop={handleDrop} onDragOver={(e) => { e.preventDefault(); setDragActive(true); }} onDragLeave={() => setDragActive(false)}>
                <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                <span
                  className="mx-auto flex h-12 w-12 items-center justify-center rounded-full transition-transform"
                  style={{ backgroundColor: `${palette.primary}1a`, transform: dragActive ? "scale(1.1)" : "scale(1)" }}
                >
                  {file ? <FileText size={20} style={{ color: palette.primary }} /> : <UploadCloud size={20} style={{ color: palette.primary }} />}
                </span>
                <p className="mt-3 text-sm font-medium" style={{ color: palette.text }}>
                  {file ? file.name : "Drop a labeled CSV here"}
                </p>
                <p className="mt-1 text-xs" style={{ color: palette.textMuted }}>
                  {file ? "Click to choose a different file" : "CIC-IDS2017/CSE-CIC-IDS2018-style, needs a Label column"}
                </p>
              </div>
            </TiltCard>
          </motion.div>

          {/* Held-out class + run button */}
          <motion.div variants={fadeUp} className="lg:col-span-2">
            <div className="flex h-full flex-col justify-between gap-4 rounded-[24px] border p-6 backdrop-blur-xl" style={{ borderColor: palette.border, backgroundColor: palette.surface }}>
              <div>
                <label className="mb-1.5 block text-xs font-medium" style={{ color: palette.textSecondary }}>
                  Held-out class <span style={{ color: palette.textMuted }}>(leave blank for a standard random-split baseline)</span>
                </label>
                <input
                  value={heldOutClass}
                  onChange={(e) => setHeldOutClass(e.target.value)}
                  placeholder="e.g. WebAttack — must match a value in the Label column"
                  className="w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-colors"
                  style={{ borderColor: palette.border, backgroundColor: "transparent", color: palette.text }}
                />
              </div>

              {error && (
                <div className="rounded-xl border p-3 text-xs" style={{ backgroundColor: palette.errorBg, borderColor: palette.errorBorder, color: palette.errorText }}>
                  {error}
                </div>
              )}

              <button
                onClick={handleRun}
                disabled={running || !file || selectedModels.length === 0}
                className="flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-opacity disabled:opacity-40"
                style={{ backgroundColor: palette.primary, color: palette.onPrimary }}
              >
                {running ? "Training & evaluating…" : "Run Experiment"}
              </button>
            </div>
          </motion.div>
        </motion.div>

        {/* Model selection — immersive tilt cards */}
        <motion.div initial="hidden" animate="show" variants={staggerContainer} className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {MODEL_ORDER.map((modelId) => {
            const meta = MODEL_META[modelId];
            const color = modelColor(modelId, palette);
            const Icon = meta.icon;
            const isSelected = selectedModels.includes(modelId);
            return (
              <motion.div key={modelId} variants={fadeUp}>
                <TiltCard
                  glowColor={color}
                  onClick={() => toggleModel(modelId)}
                  className="cursor-pointer rounded-[20px] border p-4 backdrop-blur-xl transition-colors"
                  style={{
                    borderColor: isSelected ? color : palette.border,
                    backgroundColor: isSelected ? `${color}14` : palette.surface,
                    boxShadow: isSelected ? `0 0 24px -8px ${color}66` : undefined,
                  }}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}1f` }}>
                    <Icon size={16} style={{ color }} />
                  </span>
                  <h3 className="mt-2.5 text-xs font-semibold" style={{ color: palette.text }}>{meta.label}</h3>
                  <p className="mt-1 text-[10px] leading-snug" style={{ color: palette.textMuted }}>{meta.description}</p>
                </TiltCard>
              </motion.div>
            );
          })}
        </motion.div>

        {/* ---- Results area ---- */}
        <div className="mt-6">
          {running ? (
            <div className="rounded-[28px] border" style={{ borderColor: palette.border, backgroundColor: palette.surface }}>
              <TrainingVisualization selectedModels={selectedModels} palette={palette} />
            </div>
          ) : latest ? (
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <span className="rounded-full border px-3 py-1 text-[11px] font-medium" style={{ borderColor: palette.border, color: palette.textSecondary }}>
                  {latest.experiment_type === "zero_day" ? `Zero-day — held out "${latest.held_out_class}"` : "Standard random split"}
                </span>
                <span className="text-[11px]" style={{ color: palette.textMuted }}>
                  {latest.n_train} train / {latest.n_test} test samples
                </span>
                {latest.results.every((r) => !r.error) && latest.results.length > 0 && (
                  <span className="flex items-center gap-1.5 text-[11px]" style={{ color: palette.successText }}>
                    <Trophy size={12} />
                    Best F1: {modelLabel(latest.results.reduce((a, b) => ((b.f1_score ?? 0) > (a.f1_score ?? 0) ? b : a)).model)}
                  </span>
                )}
              </div>

              {focusedModel ? (
                <motion.div layout className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
                  <motion.div layout="position">
                    {latest.results.filter((r) => r.model === focusedModel).map((r) => (
                      <ModelResultCard key={r.model} result={r} expanded palette={palette} onToggle={() => setFocusedModel(null)} />
                    ))}
                  </motion.div>
                  <motion.div layout className="space-y-3">
                    {latest.results.filter((r) => r.model !== focusedModel).map((r) => (
                      <ModelResultCard key={r.model} result={r} expanded={false} palette={palette} onToggle={() => setFocusedModel(r.model)} />
                    ))}
                  </motion.div>
                </motion.div>
              ) : (
                <motion.div layout className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {latest.results.map((r) => (
                    <ModelResultCard key={r.model} result={r} expanded={false} palette={palette} onToggle={() => setFocusedModel(r.model)} />
                  ))}
                </motion.div>
              )}
            </div>
          ) : (
            <div className="rounded-[28px] border p-10 text-center" style={{ borderColor: palette.border, backgroundColor: palette.surface }}>
              <BrainCircuit size={24} className="mx-auto" style={{ color: palette.textMuted }} />
              <p className="mt-3 text-sm" style={{ color: palette.textMuted }}>
                Upload a dataset and run an experiment to see real results here — nothing is shown until a model has actually trained.
              </p>
            </div>
          )}
        </div>

        {/* ---- Experiment history (Card Button + Expandable Filterable Drawer) ---- */}
        <div className="mt-8">
          {/* Main Card Button trigger */}
          <motion.div
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.995 }}
            onClick={() => setHistoryOpen((prev) => !prev)}
            className="group relative cursor-pointer overflow-hidden rounded-[26px] border p-5 backdrop-blur-xl transition-all duration-300"
            style={{
              borderColor: historyOpen ? palette.borderHover : palette.border,
              backgroundColor: palette.surface,
              boxShadow: historyOpen ? `0 12px 36px -10px ${palette.shadowGlow}` : undefined,
            }}
          >
            {/* Ambient hover spotlight */}
            <div
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{
                background: `radial-gradient(circle at 50% 0%, ${palette.primary}18, transparent 70%)`,
              }}
            />

            <div className="relative flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border transition-transform duration-300 group-hover:scale-105"
                  style={{
                    backgroundColor: `${palette.primary}18`,
                    borderColor: `${palette.primary}33`,
                    boxShadow: `0 0 20px -5px ${palette.primary}55`,
                  }}
                >
                  <HistoryIcon size={20} style={{ color: palette.primary }} />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold tracking-tight" style={{ color: palette.text }}>
                      Experiment History & Audit Log
                    </h3>
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={{
                        backgroundColor: history.length > 0 ? `${palette.primary}20` : palette.border,
                        color: history.length > 0 ? palette.primary : palette.textMuted,
                      }}
                    >
                      {history.length} {history.length === 1 ? "run" : "runs"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs" style={{ color: palette.textSecondary }}>
                    {history.length === 0
                      ? "No previous runs recorded yet"
                      : `Click to ${historyOpen ? "collapse history" : "expand, filter by user & held-out attacks, or inspect past results"}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Active filters summary pill if filters are set */}
                {(filterUser !== "all" || filterHeldOut !== "all" || historySearch.trim() !== "") && (
                  <span
                    className="hidden rounded-full border px-2.5 py-1 text-[10px] font-medium sm:inline-flex items-center gap-1.5"
                    style={{
                      borderColor: palette.borderHover,
                      backgroundColor: `${palette.primary}12`,
                      color: palette.primary,
                    }}
                  >
                    <Filter size={10} />
                    Filtered ({filteredHistory.length})
                  </span>
                )}

                <div
                  className="flex h-9 w-9 items-center justify-center rounded-xl border transition-transform duration-300"
                  style={{
                    borderColor: palette.border,
                    backgroundColor: palette.surfaceHover,
                    color: palette.textSecondary,
                    transform: historyOpen ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                >
                  <ChevronDown size={16} />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Expandable History Drawer */}
          <AnimatePresence>
            {historyOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -8 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0, y: -8 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <div
                  className="mt-3 rounded-[26px] border p-5 sm:p-6 backdrop-blur-xl"
                  style={{ borderColor: palette.border, backgroundColor: palette.surface }}
                >
                  {/* Filter Toolbar */}
                  <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-4" style={{ borderColor: palette.border }}>
                    <div className="flex flex-1 flex-wrap items-center gap-2.5">
                      {/* Search Bar */}
                      <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: palette.textMuted }} />
                        <input
                          type="text"
                          value={historySearch}
                          onChange={(e) => setHistorySearch(e.target.value)}
                          placeholder="Search experiments..."
                          className="w-full rounded-xl border py-1.5 pl-8 pr-3 text-xs outline-none transition-colors"
                          style={{ borderColor: palette.border, backgroundColor: "transparent", color: palette.text }}
                        />
                        {historySearch && (
                          <button
                            onClick={() => setHistorySearch("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs"
                            style={{ color: palette.textMuted }}
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>

                      {/* User Filter */}
                      <div className="relative flex items-center">
                        <UserIcon size={12} className="pointer-events-none absolute left-3" style={{ color: palette.textMuted }} />
                        <select
                          value={filterUser}
                          onChange={(e) => setFilterUser(e.target.value)}
                          className="rounded-xl border py-1.5 pl-7 pr-8 text-xs outline-none transition-colors appearance-none cursor-pointer"
                          style={{ borderColor: palette.border, backgroundColor: palette.surfaceHover, color: palette.text }}
                        >
                          <option value="all">All Users ({uniqueUsers.length})</option>
                          {uniqueUsers.map((u) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                        <ChevronDown size={12} className="pointer-events-none absolute right-2.5" style={{ color: palette.textMuted }} />
                      </div>

                      {/* Held-out Class Filter */}
                      <div className="relative flex items-center">
                        <Tag size={12} className="pointer-events-none absolute left-3" style={{ color: palette.textMuted }} />
                        <select
                          value={filterHeldOut}
                          onChange={(e) => setFilterHeldOut(e.target.value)}
                          className="rounded-xl border py-1.5 pl-7 pr-8 text-xs outline-none transition-colors appearance-none cursor-pointer"
                          style={{ borderColor: palette.border, backgroundColor: palette.surfaceHover, color: palette.text }}
                        >
                          <option value="all">All Splits / Attacks</option>
                          <option value="standard_split">Standard Random Split</option>
                          {uniqueHeldOuts.map((h) => (
                            <option key={h} value={h}>Held-out: {h}</option>
                          ))}
                        </select>
                        <ChevronDown size={12} className="pointer-events-none absolute right-2.5" style={{ color: palette.textMuted }} />
                      </div>

                      {/* Reset Button if any filter active */}
                      {(filterUser !== "all" || filterHeldOut !== "all" || historySearch.trim() !== "") && (
                        <button
                          onClick={() => {
                            setFilterUser("all");
                            setFilterHeldOut("all");
                            setHistorySearch("");
                          }}
                          className="flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-[11px] font-medium transition-colors"
                          style={{ borderColor: palette.border, color: palette.textSecondary, backgroundColor: palette.surfaceHover }}
                        >
                          <RotateCcw size={11} />
                          Reset
                        </button>
                      )}
                    </div>

                    <div className="text-[11px] font-mono whitespace-nowrap" style={{ color: palette.textMuted }}>
                      Showing {filteredHistory.length} of {history.length} runs
                    </div>
                  </div>

                  {/* Experiments List / Grid */}
                  {filteredHistory.length === 0 ? (
                    <div className="py-10 text-center">
                      <HistoryIcon size={24} className="mx-auto" style={{ color: palette.textMuted }} />
                      <p className="mt-2 text-xs font-medium" style={{ color: palette.textSecondary }}>
                        {history.length === 0 ? "No experiments recorded yet" : "No experiments match the selected filters"}
                      </p>
                      {history.length > 0 && (
                        <button
                          onClick={() => {
                            setFilterUser("all");
                            setFilterHeldOut("all");
                            setHistorySearch("");
                          }}
                          className="mt-3 rounded-lg border px-3 py-1.5 text-[11px] font-medium"
                          style={{ borderColor: palette.border, color: palette.primary }}
                        >
                          Clear Filters
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
                      {filteredHistory.map((exp) => {
                        const isZeroDay = exp.experiment_type === "zero_day";
                        const bestModel = exp.results?.length
                          ? exp.results.reduce((prev, curr) => ((curr.f1_score ?? 0) > (prev.f1_score ?? 0) ? curr : prev))
                          : null;

                        return (
                          <motion.div
                            key={exp.id}
                            whileHover={{ y: -2 }}
                            className="group relative flex flex-col justify-between rounded-[20px] border p-4.5 backdrop-blur-md transition-all"
                            style={{
                              borderColor: palette.border,
                              backgroundColor: palette.surfaceHover,
                            }}
                          >
                            <div>
                              {/* Header */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span
                                    className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide"
                                    style={{
                                      borderColor: isZeroDay ? `${palette.primary}44` : palette.border,
                                      backgroundColor: isZeroDay ? `${palette.primary}18` : palette.surface,
                                      color: isZeroDay ? palette.primary : palette.textSecondary,
                                    }}
                                  >
                                    <span
                                      className="h-1.5 w-1.5 rounded-full"
                                      style={{ backgroundColor: isZeroDay ? palette.primary : palette.textMuted }}
                                    />
                                    {isZeroDay ? `Zero-Day (${exp.held_out_class})` : "Standard Random Split"}
                                  </span>

                                  <span className="text-[10px] font-mono" style={{ color: palette.textMuted }}>
                                    {exp.n_train || 0} train / {exp.n_test || 0} test
                                  </span>
                                </div>

                                <span className="flex items-center gap-1 text-[11px] font-mono" style={{ color: palette.textMuted }}>
                                  <UserIcon size={11} />
                                  {exp.triggered_by}
                                </span>
                              </div>

                              {/* Models summary badges */}
                              <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
                                {exp.results?.map((r) => {
                                  const meta = MODEL_META[r.model];
                                  const color = modelColor(r.model, palette);
                                  const Icon = meta?.icon || BrainCircuit;
                                  return (
                                    <span
                                      key={r.model}
                                      className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-medium"
                                      style={{
                                        borderColor: `${color}33`,
                                        backgroundColor: `${color}0f`,
                                        color: r.error ? palette.errorText : color,
                                      }}
                                    >
                                      <Icon size={10} />
                                      {meta?.label || r.model}: {r.error ? "Failed" : `F1 ${(r.f1_score ?? 0).toFixed(2)}`}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Footer / Action */}
                            <div className="mt-4 flex items-center justify-between border-t pt-2.5 text-xs" style={{ borderColor: palette.border }}>
                              {bestModel && !bestModel.error ? (
                                <span className="flex items-center gap-1 text-[11px] font-medium" style={{ color: palette.successText }}>
                                  <Trophy size={11} />
                                  Top: {modelLabel(bestModel.model)} (F1 {(bestModel.f1_score ?? 0).toFixed(2)})
                                </span>
                              ) : (
                                <span className="text-[11px]" style={{ color: palette.textMuted }}>
                                  {exp.results?.length || 0} models trained
                                </span>
                              )}

                              <button
                                onClick={() => {
                                  setLatest(exp);
                                  setFocusedModel(null);
                                  window.scrollTo({ top: 0, behavior: "smooth" });
                                }}
                                className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer hover:opacity-90"
                                style={{
                                  backgroundColor: `${palette.primary}18`,
                                  color: palette.primary,
                                }}
                              >
                                View Results
                                <ChevronRight size={11} />
                              </button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DashboardShell>
    </>
  );
}