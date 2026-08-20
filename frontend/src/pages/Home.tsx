import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, Sun, Moon, Radar, GitBranch, MessageSquareText, ArrowRight } from "lucide-react";
import { useTheme } from "../theme/ThemeProvider";

// Public landing page — the first thing anyone sees, before Login/Register.
// Kept intentionally lightweight (no TopBar/AppLauncher — those are for the
// authenticated app shell) but reuses the same visual language established
// in Dashboard.tsx so the transition into the product feels seamless.

const FEATURES = [
    { icon: Radar, title: "Real-time detection", description: "Sigma-inspired rules + Isolation Forest, running on real ingested telemetry." },
    { icon: GitBranch, title: "Zero-day research", description: "GraphSAGE vs. Random Forest, XGBoost, CNN, and LSTM on held-out attack classes." },
    { icon: MessageSquareText, title: "AI-assisted investigation", description: "A context-grounded SOC assistant that never invents facts about your incidents." },
];

export function Home() {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === "dark";

    const bg = isDark ? "#040810" : "#FAF9FF";
    const gradient = isDark
        ? "linear-gradient(180deg,#050b18 0%,#040810 45%,#020509 100%)"
        : "linear-gradient(180deg,#FDFCFF 0%,#FAF9FF 55%,#F5F3FF 100%)";
    const blob = isDark ? "rgba(58,160,255,0.16)" : "rgba(124,58,237,0.10)";
    const text = isDark ? "#f8fafc" : "#18181B";
    const textSecondary = isDark ? "#94a3b8" : "#71717A";
    const border = isDark ? "rgba(255,255,255,0.07)" : "#E9E7F2";
    const surface = isDark ? "rgba(255,255,255,0.025)" : "#FFFFFF";
    const primary = isDark ? "#3aa0ff" : "#7C3AED";

    return (
        <div className="relative min-h-screen overflow-hidden" style={{ backgroundColor: bg }}>
            <div className="pointer-events-none fixed inset-0 -z-10">
                <div className="absolute inset-0" style={{ background: gradient }} />
                <div className="absolute -top-52 -left-40 h-[560px] w-[560px] rounded-full blur-[140px]" style={{ backgroundColor: blob }} />
                <div className="absolute top-1/3 -right-40 h-[480px] w-[480px] rounded-full blur-[150px]" style={{ backgroundColor: blob }} />
            </div>

            <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
                <div className="flex items-center gap-2">
                    <ShieldCheck size={20} style={{ color: primary }} />
                    <span className="text-sm font-semibold tracking-wide" style={{ color: text }}>SentinelX</span>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        aria-label="Toggle theme"
                        onClick={toggleTheme}
                        className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
                        style={{ color: textSecondary }}
                    >
                        {isDark ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                    <Link
                        to="/login"
                        className="rounded-lg border px-4 py-2 text-xs font-medium transition-colors"
                        style={{ borderColor: border, color: text }}
                    >
                        Sign in
                    </Link>
                    <Link
                        to="/register"
                        className="rounded-lg px-4 py-2 text-xs font-medium text-black transition-opacity hover:opacity-90"
                        style={{ backgroundColor: primary }}
                    >
                        Create account
                    </Link>
                </div>
            </header>

            <main className="mx-auto max-w-4xl px-6 pt-20 text-center sm:pt-28">
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div
                        className="mb-6 inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em]"
                        style={{ borderColor: border, color: primary }}
                    >
                        AI-Assisted SOC Platform
                    </div>
                    <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl" style={{ color: text }}>
                        Ingest. Detect. Correlate.
                        <br />
                        Investigate — for real.
                    </h1>
                    <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed sm:text-base" style={{ color: textSecondary }}>
                        SentinelX is a real-time security operations platform. No fabricated alerts,
                        no placeholder metrics — every number comes from data you actually ingested.
                    </p>

                    <div className="mt-8 flex items-center justify-center gap-3">
                        <Link
                            to="/register"
                            className="flex items-center gap-1.5 rounded-lg px-5 py-2.5 text-sm font-medium text-black transition-opacity hover:opacity-90"
                            style={{ backgroundColor: primary }}
                        >
                            Get started <ArrowRight size={15} />
                        </Link>
                        <Link
                            to="/login"
                            className="rounded-lg border px-5 py-2.5 text-sm font-medium transition-colors"
                            style={{ borderColor: border, color: text }}
                        >
                            Sign in
                        </Link>
                    </div>
                </motion.div>

                <motion.div
                    initial="hidden"
                    animate="show"
                    variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } } }}
                    className="mt-20 grid grid-cols-1 gap-4 text-left sm:grid-cols-3"
                >
                    {FEATURES.map((f) => (
                        <motion.div
                            key={f.title}
                            variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
                            className="rounded-2xl border p-5 backdrop-blur-xl"
                            style={{ borderColor: border, backgroundColor: surface }}
                        >
                            <f.icon size={18} style={{ color: primary }} />
                            <h3 className="mt-3 text-sm font-medium" style={{ color: text }}>{f.title}</h3>
                            <p className="mt-1 text-xs leading-relaxed" style={{ color: textSecondary }}>{f.description}</p>
                        </motion.div>
                    ))}
                </motion.div>
            </main>
        </div>
    );
}