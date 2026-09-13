import { useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
    ShieldCheck,
    Sun,
    Moon,
    X,
    ArrowRight,
    Radar,
    GitBranch,
    MessageSquareText,
    ShieldAlert,
    Search,
    Fingerprint,
    CheckCircle2,
    FileText,
    BookOpen,
    Lock,
    Github,
    Linkedin,
} from "lucide-react";
import { useTheme } from "../theme/ThemeProvider";

// ---------------------------------------------------------------------------
// HERO BACKGROUND IMAGE — swap this any time.
// Drop your file into `frontend/public/` (e.g. `hero-bg.jpg`) and point this
// at it, e.g. HERO_BACKGROUND_IMAGE = "/hero-bg.jpg". Leave it empty ("") to
// keep the generated ambient gradient. Whatever you set, a readable overlay
// is applied automatically so hero text stays legible over any image.
// ---------------------------------------------------------------------------
const HERO_BACKGROUND_IMAGE = "Home.jpg";

// ---------------------------------------------------------------------------
// Same design tokens as Dashboard.tsx, trimmed to what this page needs, so
// the public site and the authenticated app feel like one product.
// ---------------------------------------------------------------------------
const DARK = {
    bg: "#040810",
    gradient: "linear-gradient(180deg,#050b18 0%,#040810 45%,#020509 100%)",
    blob1: "rgba(58,160,255,0.16)",
    blob2: "rgba(99,102,241,0.10)",
    text: "#f8fafc",
    textSecondary: "#94a3b8",
    textMuted: "#64748b",
    surface: "rgba(255,255,255,0.025)",
    surfaceStrong: "rgba(255,255,255,0.04)",
    border: "rgba(255,255,255,0.08)",
    primary: "#3aa0ff",
    primaryGlow: "#5fc2ff",
    onPrimary: "#04101f",
    heroOverlay: "rgba(4,8,16,0.78)",
};

const LIGHT = {
    bg: "#FAF9FF",
    gradient: "linear-gradient(180deg,#FDFCFF 0%,#FAF9FF 55%,#F5F3FF 100%)",
    blob1: "rgba(124,58,237,0.10)",
    blob2: "rgba(196,181,253,0.20)",
    text: "#18181B",
    textSecondary: "#71717A",
    textMuted: "#A1A1AA",
    surface: "#FFFFFF",
    surfaceStrong: "#FCFAFF",
    border: "#E9E7F2",
    primary: "#7C3AED",
    primaryGlow: "#A78BFA",
    onPrimary: "#FFFFFF",
    heroOverlay: "rgba(250,249,255,0.85)",
};

type Palette = typeof DARK;

// ---------------------------------------------------------------------------
// Content — all original to SentinelX. Structure mirrors a standard
// enterprise-security marketing page (announcement bar → hero → promo pair →
// two pillars → trust strip → stat highlights → resource grid → research
// foundations → closing CTA row → footer).
// ---------------------------------------------------------------------------

const PROMO_CARDS = [
    {
        icon: GitBranch,
        eyebrow: "RESEARCH",
        title: "Zero-day detection, evaluated honestly",
        description: "GraphSAGE vs. Random Forest, XGBoost, CNN, and LSTM — with an entire attack class held out of training, not just a random split.",
    },
    {
        icon: MessageSquareText,
        eyebrow: "AI ASSISTANT",
        title: "Context-grounded, not a generic chatbot",
        description: "Groq-backed investigation support that only reasons over your real incident data — with a local fallback if Groq isn't configured.",
    },
];

const PILLARS = [
    {
        icon: Radar,
        title: "Detect & correlate",
        description: "A Sigma-inspired rule engine and Isolation Forest anomaly detection run against real ingested telemetry — not simulated traffic.",
        bullets: ["Rule-based detection with MITRE ATT&CK mapping", "Isolation Forest anomaly scoring", "Graph-aware alert correlation into incidents"],
        cta: "Explore detection",
        to: "/register",
    },
    {
        icon: Search,
        title: "Investigate & report",
        description: "A full investigation workspace and AI-assisted reporting pipeline, built so every fact traces back to real data.",
        bullets: ["Incident timeline & affected-asset mapping", "Case management with analyst assignment", "AI-drafted summaries, facts always sourced from your DB"],
        cta: "Explore investigation",
        to: "/register",
    },
];

const TRUST_STRIP = ["CIC-IDS2017", "CSE-CIC-IDS2018", "MITRE ATT&CK", "PyTorch Geometric", "Sigma Rule Format"];

const STATS = [
    { value: "5", label: "ML models compared per zero-day experiment" },
    { value: "3", label: "purpose-built databases (Postgres, Mongo, Redis)" },
    { value: "0%", label: "fabricated data — every number is real or honestly zero" },
    { value: "4", label: "RBAC roles with server-enforced permissions" },
];

const RESOURCE_CARDS = [
    { icon: GitBranch, tag: "AI & Research", title: "Zero-day detection methodology", description: "How the held-out-class evaluation works, and why a random split isn't enough." },
    { icon: ShieldAlert, tag: "Architecture", title: "The event pipeline, end to end", description: "Ingestion → Redis Streams → detection worker → risk scoring → realtime WebSocket push." },
    { icon: Fingerprint, tag: "Threat Intelligence", description: "Local-first IOC matching with graceful fallback to external enrichment.", title: "How IOC enrichment stays resilient" },
    { icon: Lock, tag: "Security", title: "RBAC, OTP, and audit logging", description: "Every security-sensitive action is attributable and append-only." },
];

const FOUNDATIONS = [
    { name: "GraphSAGE", citation: "Hamilton, Ying & Leskovec — NeurIPS 2017", description: "Inductive representation learning is what lets the zero-day model generalize to attack patterns it never trained on." },
    { name: "Isolation Forest", citation: "Liu, Ting & Zhou — ICDM 2008", description: "Anomaly detection without needing labeled malicious examples — well suited to catching the unknown." },
    { name: "Retrieval-Augmented Generation", citation: "Lewis et al. — NeurIPS 2020", description: "The pattern behind the AI Assistant only answering from real, retrieved incident and knowledge-base facts." },
];

function useThemePalette(): { palette: Palette; isDark: boolean } {
    const { theme } = useTheme();
    const isDark = theme === "dark";
    return { palette: isDark ? DARK : LIGHT, isDark };
}

const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
};

const staggerContainer = {
    hidden: {},
    show: { transition: { staggerChildren: 0.08 } },
};

export function Home() {
    const { theme, toggleTheme } = useTheme();
    const { palette: p, isDark } = useThemePalette();
    const [announcementVisible, setAnnouncementVisible] = useState(true);

    const heroBackgroundStyle: CSSProperties = HERO_BACKGROUND_IMAGE
        ? {
            backgroundImage: `linear-gradient(180deg, ${p.heroOverlay} 0%, ${p.bg} 92%), url(${HERO_BACKGROUND_IMAGE})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
        }
        : { background: p.gradient };

    return (
        <div className="min-h-screen" style={{ backgroundColor: p.bg, color: p.text }}>
            {/* ---- Announcement bar ---- */}
            {announcementVisible && (
                <div
                    className="flex items-center justify-center gap-3 px-4 py-2 text-center text-xs"
                    style={{ backgroundColor: p.surfaceStrong, borderBottom: `1px solid ${p.border}`, color: p.textSecondary }}
                >
                    <span>
                        <strong style={{ color: p.primaryGlow }}>New:</strong> GraphSAGE zero-day research module — compare 5 ML models on held-out attack classes.
                    </span>
                    <a href="#research" className="font-medium underline underline-offset-2" style={{ color: p.primary }}>
                        See how
                    </a>
                    <button
                        aria-label="Dismiss announcement"
                        onClick={() => setAnnouncementVisible(false)}
                        className="ml-2 opacity-60 transition-opacity hover:opacity-100"
                    >
                        <X size={13} />
                    </button>
                </div>
            )}

            {/* ---- Nav ---- */}
            <header className="sticky top-0 z-30 backdrop-blur-xl" style={{ backgroundColor: `${p.bg}cc`, borderBottom: `1px solid ${p.border}` }}>
                <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
                    <Link to="/" className="flex items-center gap-2">
                        <ShieldCheck size={20} style={{ color: p.primary }} />
                        <span className="text-sm font-semibold tracking-wide">SentinelX</span>
                    </Link>

                    <nav className="hidden items-center gap-8 text-sm md:flex" style={{ color: p.textSecondary }}>
                        <a href="#platform" className="transition-colors hover:opacity-80">Platform</a>
                        <a href="#research" className="transition-colors hover:opacity-80">Research</a>
                        <a href="#resources" className="transition-colors hover:opacity-80">Resources</a>
                    </nav>

                    <div className="flex items-center gap-2">
                        <button
                            aria-label="Toggle theme"
                            onClick={toggleTheme}
                            className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
                            style={{ color: p.textSecondary }}
                        >
                            {isDark ? <Sun size={17} /> : <Moon size={17} />}
                        </button>
                        <Link to="/login" className="rounded-lg px-3.5 py-2 text-sm font-medium transition-colors" style={{ color: p.text }}>
                            Sign in
                        </Link>
                        <Link
                            to="/register"
                            className="rounded-lg px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90"
                            style={{ backgroundColor: p.primary, color: p.onPrimary }}
                        >
                            Get started
                        </Link>
                    </div>
                </div>
            </header>

            {/* ---- Hero ---- */}
            <section className="relative overflow-hidden" style={heroBackgroundStyle}>
                {!HERO_BACKGROUND_IMAGE && (
                    <div className="pointer-events-none absolute inset-0">
                        <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full blur-[140px]" style={{ backgroundColor: p.blob1 }} />
                        <div className="absolute top-1/3 -right-32 h-[460px] w-[460px] rounded-full blur-[150px]" style={{ backgroundColor: p.blob2 }} />
                    </div>
                )}

                <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-6 py-24 lg:grid-cols-2 lg:py-32">
                    <motion.div initial="hidden" animate="show" variants={staggerContainer}>
                        <motion.div
                            variants={fadeUp}
                            className="mb-6 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium"
                            style={{ borderColor: p.border, color: p.primaryGlow }}
                        >
                            AI-Assisted SOC Platform
                        </motion.div>
                        <motion.h1 variants={fadeUp} className="text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
                            SentinelX secures your network.
                            <br />
                            And explains why.
                        </motion.h1>
                        <motion.p variants={fadeUp} className="mt-6 max-w-lg text-base leading-relaxed" style={{ color: p.textSecondary }}>
                            Real telemetry, real detection, real correlation — a security operations platform
                            that never fabricates a number to look busy. Built for genuine incident
                            investigation, not a static dashboard demo.
                        </motion.p>
                        <motion.div variants={fadeUp} className="mt-8 flex flex-wrap items-center gap-3">
                            <Link
                                to="/register"
                                className="flex items-center gap-1.5 rounded-lg px-5 py-3 text-sm font-medium transition-opacity hover:opacity-90"
                                style={{ backgroundColor: p.primary, color: p.onPrimary }}
                            >
                                Get started <ArrowRight size={15} />
                            </Link>
                            <a
                                href="#platform"
                                className="rounded-lg border px-5 py-3 text-sm font-medium transition-colors"
                                style={{ borderColor: p.border, color: p.text }}
                            >
                                See how it works
                            </a>
                        </motion.div>
                    </motion.div>

                    {/* hero visual — a simplified mockup of the real dashboard, not a stock image */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="relative hidden lg:block"
                    >
                        <div
                            className="rounded-[28px] border p-6 backdrop-blur-xl"
                            style={{ borderColor: p.border, backgroundColor: p.surface, boxShadow: `0 30px 80px -30px ${isDark ? "rgba(0,0,0,0.8)" : "rgba(124,58,237,0.18)"}` }}
                        >
                            <div className="mb-4 flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#f87171" }} />
                                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#fbbf24" }} />
                                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#34d399" }} />
                            </div>
                            <div className="space-y-2.5">
                                {["POSTGRESQL", "MONGODB", "REDIS", "DETECTION ENGINE"].map((row, idx) => (
                                    <div
                                        key={row}
                                        className="flex items-center justify-between rounded-xl border px-3 py-2"
                                        style={{ borderColor: p.border }}
                                    >
                                        <span className="font-mono text-[10px] tracking-wide" style={{ color: p.textSecondary }}>{row}</span>
                                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: idx % 3 === 1 ? "#f87171" : "#34d399" }} />
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 rounded-xl border p-3" style={{ borderColor: p.border }}>
                                <div className="font-mono text-3xl font-semibold">0</div>
                                <div className="text-[11px]" style={{ color: p.textMuted }}>active incidents</div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* ---- Promo pair ---- */}
            <section className="mx-auto max-w-7xl px-6 py-16">
                <motion.div
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, margin: "-80px" }}
                    variants={staggerContainer}
                    className="grid grid-cols-1 gap-4 md:grid-cols-2"
                >
                    {PROMO_CARDS.map((card) => (
                        <motion.div
                            key={card.title}
                            variants={fadeUp}
                            className="rounded-[24px] border p-6"
                            style={{ borderColor: p.border, backgroundColor: p.surface }}
                        >
                            <card.icon size={20} style={{ color: p.primary }} />
                            <div className="mt-4 text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: p.textMuted }}>
                                {card.eyebrow}
                            </div>
                            <h3 className="mt-1.5 text-lg font-semibold">{card.title}</h3>
                            <p className="mt-2 text-sm leading-relaxed" style={{ color: p.textSecondary }}>{card.description}</p>
                        </motion.div>
                    ))}
                </motion.div>
            </section>

            {/* ---- Two pillars ---- */}
            <section id="platform" className="mx-auto max-w-7xl px-6 py-16">
                <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={staggerContainer} className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {PILLARS.map((pillar) => (
                        <motion.div
                            key={pillar.title}
                            variants={fadeUp}
                            className="rounded-[28px] border p-8"
                            style={{ borderColor: p.border, backgroundColor: p.surface }}
                        >
                            <span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: `${p.primary}1a` }}>
                                <pillar.icon size={20} style={{ color: p.primary }} />
                            </span>
                            <h3 className="mt-5 text-xl font-semibold">{pillar.title}</h3>
                            <p className="mt-2 text-sm leading-relaxed" style={{ color: p.textSecondary }}>{pillar.description}</p>
                            <ul className="mt-5 space-y-2.5">
                                {pillar.bullets.map((b) => (
                                    <li key={b} className="flex items-start gap-2.5 text-sm" style={{ color: p.text }}>
                                        <CheckCircle2 size={16} className="mt-0.5 shrink-0" style={{ color: p.primary }} />
                                        {b}
                                    </li>
                                ))}
                            </ul>
                            <Link to={pillar.to} className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: p.primary }}>
                                {pillar.cta} <ArrowRight size={14} />
                            </Link>
                        </motion.div>
                    ))}
                </motion.div>
            </section>

            {/* ---- Trust strip ---- */}
            <section className="mx-auto max-w-7xl px-6 py-14 text-center">
                <p className="mb-6 text-xs font-medium uppercase tracking-[0.14em]" style={{ color: p.textMuted }}>
                    Grounded in real-world research &amp; data
                </p>
                <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
                    {TRUST_STRIP.map((name) => (
                        <span key={name} className="font-mono text-sm" style={{ color: p.textSecondary }}>
                            {name}
                        </span>
                    ))}
                </div>
            </section>

            {/* ---- Stat highlights ---- */}
            <section className="mx-auto max-w-7xl px-6 py-16">
                <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={staggerContainer} className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    {STATS.map((stat) => (
                        <motion.div key={stat.label} variants={fadeUp} className="rounded-[24px] border p-6" style={{ borderColor: p.border, backgroundColor: p.surface }}>
                            <div className="font-mono text-3xl font-semibold" style={{ color: p.primary }}>{stat.value}</div>
                            <div className="mt-2 text-xs leading-relaxed" style={{ color: p.textSecondary }}>{stat.label}</div>
                        </motion.div>
                    ))}
                </motion.div>
            </section>

            {/* ---- Resource grid ---- */}
            <section id="resources" className="mx-auto max-w-7xl px-6 py-16">
                <h2 className="mb-8 text-2xl font-semibold">Explore the research</h2>
                <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={staggerContainer} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {RESOURCE_CARDS.map((card) => (
                        <motion.div key={card.title} variants={fadeUp} className="rounded-[20px] border p-5" style={{ borderColor: p.border, backgroundColor: p.surface }}>
                            <card.icon size={18} style={{ color: p.primary }} />
                            <div className="mt-3 text-[10px] font-semibold uppercase tracking-wide" style={{ color: p.textMuted }}>{card.tag}</div>
                            <h3 className="mt-1.5 text-sm font-medium">{card.title}</h3>
                            <p className="mt-1.5 text-xs leading-relaxed" style={{ color: p.textSecondary }}>{card.description}</p>
                        </motion.div>
                    ))}
                </motion.div>
            </section>

            {/* ---- Research foundations ---- */}
            <section id="research" className="mx-auto max-w-7xl px-6 py-16">
                <h2 className="mb-2 text-2xl font-semibold">Built on proven foundations</h2>
                <p className="mb-8 max-w-2xl text-sm" style={{ color: p.textSecondary }}>
                    The zero-day research module and AI assistant aren't built from scratch — they apply
                    established, peer-reviewed techniques to a real security pipeline.
                </p>
                <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={staggerContainer} className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {FOUNDATIONS.map((f) => (
                        <motion.div key={f.name} variants={fadeUp} className="rounded-[20px] border p-5" style={{ borderColor: p.border, backgroundColor: p.surface }}>
                            <h3 className="text-sm font-semibold">{f.name}</h3>
                            <p className="mt-0.5 font-mono text-[11px]" style={{ color: p.primaryGlow }}>{f.citation}</p>
                            <p className="mt-3 text-xs leading-relaxed" style={{ color: p.textSecondary }}>{f.description}</p>
                        </motion.div>
                    ))}
                </motion.div>
            </section>

            {/* ---- Closing CTA row ---- */}
            <section className="mx-auto max-w-7xl px-6 py-16">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {[
                        { icon: ShieldCheck, title: "Create an account", description: "Register and verify to get a real, working session.", to: "/register" },
                        { icon: FileText, title: "Read the architecture", description: "See the full event pipeline, phase by phase.", to: "/register" },
                        { icon: BookOpen, title: "Explore the API", description: "Every endpoint documented at /docs once you're running.", to: "/register" },
                    ].map((item) => (
                        <Link
                            key={item.title}
                            to={item.to}
                            className="group rounded-[20px] border p-5 transition-colors"
                            style={{ borderColor: p.border, backgroundColor: p.surface }}
                        >
                            <item.icon size={18} style={{ color: p.primary }} />
                            <h3 className="mt-3 text-sm font-medium">{item.title}</h3>
                            <p className="mt-1.5 text-xs leading-relaxed" style={{ color: p.textSecondary }}>{item.description}</p>
                            <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium transition-transform group-hover:translate-x-0.5" style={{ color: p.primary }}>
                                Go <ArrowRight size={12} />
                            </span>
                        </Link>
                    ))}
                </div>
            </section>

            {/* ---- Footer ---- */}
            <footer style={{ borderTop: `1px solid ${p.border}` }}>
                <div className="mx-auto max-w-7xl px-6 py-12">
                    <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <ShieldCheck size={16} style={{ color: p.primary }} />
                                <span className="text-sm font-semibold">SentinelX</span>
                            </div>
                            <p className="mt-3 text-xs leading-relaxed" style={{ color: p.textMuted }}>
                                AI-assisted SOC platform. No fabricated data, ever.
                            </p>
                        </div>
                        <div>
                            <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: p.textMuted }}>Platform</div>
                            <ul className="mt-3 space-y-2 text-xs" style={{ color: p.textSecondary }}>
                                <li><a href="#platform" className="hover:opacity-80">Detection</a></li>
                                <li><a href="#research" className="hover:opacity-80">Zero-day research</a></li>
                                <li><Link to="/register" className="hover:opacity-80">Get started</Link></li>
                            </ul>
                        </div>
                        <div>
                            <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: p.textMuted }}>Account</div>
                            <ul className="mt-3 space-y-2 text-xs" style={{ color: p.textSecondary }}>
                                <li><Link to="/login" className="hover:opacity-80">Sign in</Link></li>
                                <li><Link to="/register" className="hover:opacity-80">Create account</Link></li>
                            </ul>
                        </div>
                        <div>
                            <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: p.textMuted }}>Connect</div>
                            <div className="mt-3 flex gap-3" style={{ color: p.textSecondary }}>
                                <Github size={16} />
                                <Linkedin size={16} />
                            </div>
                        </div>
                    </div>
                    <div
                        className="mt-10 flex flex-col items-center justify-between gap-3 pt-6 text-xs sm:flex-row"
                        style={{ borderTop: `1px solid ${p.border}`, color: p.textMuted }}
                    >
                        <span>© {new Date().getFullYear()} SentinelX. A student capstone project — not a commercial product.</span>
                        <span>No mock data. No fabricated metrics. Ever.</span>
                    </div>
                </div>
            </footer>
        </div>
    );
}