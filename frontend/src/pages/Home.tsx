import { useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { motion, type Variants } from "framer-motion";
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
import { ExpandableCard } from "../components/ui/ExpandableCard";

// ============================================================================
// 🖼️ HERO BACKGROUND WALLPAPER CONFIGURATION
// Type your image filename or web URL below to change the page wallpaper!
// Supported options:
// 1. File in `frontend/public/` (e.g. "wallpaper.jpg", "/wallpaper.jpg")
// 2. File in `frontend/src/assets/` (e.g. "fluid_cube_dark.jpg", "fluid_cube.jpg")
// 3. Remote web image URL (e.g. "https://assets.watermelon.sh/bg-hero-37.avif")
// 4. Leave empty "" to use the dynamic glowing ambient mesh instead.
// ============================================================================
export const HERO_BACKGROUND_WALLPAPER = "Rays.png";

// ============================================================================
// ⚡ FOOTER MATRIX STRIPS / BACKGROUND CONFIGURATION
// Leave empty "" to display the built-in dynamic Cyber Matrix Strips visual!
// Or enter an image filename or URL to use an external matrix wallpaper image.
// ============================================================================
export const FOOTER_MATRIX_IMAGE = "";

// ---------------------------------------------------------------------------
// Local asset bundle resolver — allows typing local image filenames directly
// ---------------------------------------------------------------------------
const localAssets = import.meta.glob<{ default: string }>("../assets/*.{jpg,jpeg,png,webp,avif,svg,gif}", { eager: true });

export function resolveImageUrl(inputPathOrName?: string): string {
    if (!inputPathOrName || !inputPathOrName.trim()) return "";
    const clean = inputPathOrName.trim();

    // 1. Direct web URL or Base64 data URI
    if (clean.startsWith("http://") || clean.startsWith("https://") || clean.startsWith("data:")) {
        return clean;
    }

    // 2. Search local asset bundle in frontend/src/assets/
    const filename = clean.replace(/^.*[\\/]/, "").toLowerCase();
    for (const [assetPath, module] of Object.entries(localAssets)) {
        const assetFile = assetPath.replace(/^.*[\\/]/, "").toLowerCase();
        if (assetFile === filename) {
            return module.default;
        }
    }

    // 3. Public folder files (e.g. "wallpaper.jpg" -> "/wallpaper.jpg")
    if (clean.startsWith("/")) {
        return clean;
    }
    return `/${clean}`;
}

// Pre-computed telemetry matrix strips for the footer cyber horizon
const MATRIX_TELEMETRY_STRIPS = [
    { x: 15, h: 65, color: "cyan" as const, glow: true, char: "01" },
    { x: 37, h: 95, color: "indigo" as const, glow: false, char: "" },
    { x: 59, h: 140, color: "cyan" as const, glow: true, char: "10" },
    { x: 81, h: 75, color: "emerald" as const, glow: false, char: "" },
    { x: 103, h: 115, color: "blue" as const, glow: true, char: "FF" },
    { x: 125, h: 160, color: "cyan" as const, glow: true, char: "" },
    { x: 147, h: 80, color: "indigo" as const, glow: false, char: "00" },
    { x: 169, h: 125, color: "emerald" as const, glow: true, char: "" },
    { x: 191, h: 175, color: "cyan" as const, glow: true, char: "7A" },
    { x: 213, h: 90, color: "blue" as const, glow: false, char: "" },
    { x: 235, h: 145, color: "cyan" as const, glow: true, char: "A1" },
    { x: 257, h: 70, color: "emerald" as const, glow: false, char: "" },
    { x: 279, h: 130, color: "indigo" as const, glow: true, char: "X1" },
    { x: 301, h: 185, color: "cyan" as const, glow: true, char: "" },
    { x: 323, h: 105, color: "blue" as const, glow: false, char: "09" },
    { x: 345, h: 150, color: "emerald" as const, glow: true, char: "" },
    { x: 367, h: 85, color: "cyan" as const, glow: false, char: "4B" },
    { x: 389, h: 165, color: "indigo" as const, glow: true, char: "" },
    { x: 411, h: 110, color: "cyan" as const, glow: false, char: "11" },
    { x: 433, h: 190, color: "cyan" as const, glow: true, char: "" },
    { x: 455, h: 95, color: "emerald" as const, glow: false, char: "C3" },
    { x: 477, h: 140, color: "blue" as const, glow: true, char: "" },
    { x: 499, h: 80, color: "indigo" as const, glow: false, char: "01" },
    { x: 521, h: 170, color: "cyan" as const, glow: true, char: "" },
    { x: 543, h: 125, color: "emerald" as const, glow: false, char: "9D" },
    { x: 565, h: 195, color: "cyan" as const, glow: true, char: "" },
    { x: 587, h: 100, color: "blue" as const, glow: false, char: "E8" },
    { x: 609, h: 155, color: "indigo" as const, glow: true, char: "" },
    { x: 631, h: 85, color: "cyan" as const, glow: false, char: "00" },
    { x: 653, h: 180, color: "cyan" as const, glow: true, char: "" },
    { x: 675, h: 115, color: "emerald" as const, glow: true, char: "5F" },
    { x: 697, h: 165, color: "blue" as const, glow: true, char: "" },
    { x: 719, h: 75, color: "indigo" as const, glow: false, char: "2A" },
    { x: 741, h: 140, color: "cyan" as const, glow: true, char: "" },
    { x: 763, h: 190, color: "cyan" as const, glow: true, char: "B4" },
    { x: 785, h: 95, color: "emerald" as const, glow: false, char: "" },
    { x: 807, h: 150, color: "blue" as const, glow: true, char: "01" },
    { x: 829, h: 70, color: "indigo" as const, glow: false, char: "" },
    { x: 851, h: 175, color: "cyan" as const, glow: true, char: "88" },
    { x: 873, h: 120, color: "emerald" as const, glow: false, char: "" },
    { x: 895, h: 160, color: "cyan" as const, glow: true, char: "3C" },
    { x: 917, h: 85, color: "blue" as const, glow: false, char: "" },
    { x: 939, h: 145, color: "indigo" as const, glow: true, char: "F0" },
    { x: 961, h: 185, color: "cyan" as const, glow: true, char: "" },
    { x: 983, h: 105, color: "emerald" as const, glow: false, char: "10" },
    { x: 1005, h: 160, color: "cyan" as const, glow: true, char: "" },
    { x: 1027, h: 75, color: "blue" as const, glow: false, char: "7E" },
    { x: 1049, h: 135, color: "indigo" as const, glow: true, char: "" },
    { x: 1071, h: 180, color: "cyan" as const, glow: true, char: "01" },
    { x: 1093, h: 90, color: "emerald" as const, glow: false, char: "" },
    { x: 1115, h: 140, color: "cyan" as const, glow: true, char: "D2" },
    { x: 1137, h: 65, color: "blue" as const, glow: false, char: "" },
    { x: 1159, h: 120, color: "indigo" as const, glow: true, char: "99" },
    { x: 1181, h: 80, color: "cyan" as const, glow: false, char: "" },
];

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
    bg: "#FFF5E6",
    gradient: "linear-gradient(180deg,#FEFBF4 0%,#FFF5E6 55%,#FDF3E3 100%)",
    blob1: "rgba(250,135,117,0.24)",
    blob2: "rgba(157,133,242,0.18)",
    text: "#282937",
    textSecondary: "#4A4B5E",
    textMuted: "#58565E",
    surface: "#FFFFFF",
    surfaceStrong: "#FEFBF4",
    border: "#E2D9CC",
    primary: "#282937",
    primaryGlow: "#FA8775",
    onPrimary: "#FFF5E6",
    heroOverlay: "rgba(255,245,230,0.88)",
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

// ---------------------------------------------------------------------------
// Animation Variants for Hero37
// ---------------------------------------------------------------------------
const navVariants: Variants = {
    hidden: { opacity: 0, y: -20, filter: "blur(8px)" },
    show: {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        transition: { type: "spring", damping: 22, stiffness: 180, delay: 0.05 },
    },
};

const bgGlowVariants: Variants = {
    hidden: { opacity: 0, scale: 1.06 },
    show: {
        opacity: 1,
        scale: 1,
        transition: { duration: 1.8, ease: [0.22, 1, 0.36, 1], delay: 0 },
    },
};

const headlineContainerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.16, delayChildren: 0.35 },
    },
};

const headlineLineVariants: Variants = {
    hidden: { opacity: 0, y: 52, filter: "blur(18px)" },
    show: {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        transition: { type: "spring", damping: 28, stiffness: 78, mass: 1.3 },
    },
};

const subtitleVariants: Variants = {
    hidden: { opacity: 0, y: 20, filter: "blur(6px)" },
    show: {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        transition: { type: "spring", damping: 26, stiffness: 105, delay: 0.95 },
    },
};

const ctaVariants: Variants = {
    hidden: { opacity: 0, y: 16, scale: 0.93 },
    show: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { type: "spring", damping: 22, stiffness: 120, delay: 1.18 },
    },
};

const statsContainerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.12, delayChildren: 1.4 },
    },
};

const statItemVariants: Variants = {
    hidden: { opacity: 0, y: 22, filter: "blur(7px)" },
    show: {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        transition: { type: "spring", damping: 24, stiffness: 100 },
    },
};

const taglineVariants: Variants = {
    hidden: { opacity: 0, x: 18, filter: "blur(5px)" },
    show: {
        opacity: 1,
        x: 0,
        filter: "blur(0px)",
        transition: { type: "spring", damping: 24, stiffness: 100, delay: 1.6 },
    },
};

// ---------------------------------------------------------------------------
// Animation Variants for Footer16
// ---------------------------------------------------------------------------
const footerSectionVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.08,
        },
    },
};

const footerWordmarkVariants: Variants = {
    hidden: { opacity: 0, y: 30, filter: "blur(10px)" },
    visible: {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        transition: { type: "spring", duration: 1.1, bounce: 0 },
    },
};

const footerRiseVariants: Variants = {
    hidden: { opacity: 0, y: 16, filter: "blur(6px)" },
    visible: {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        transition: { type: "spring", duration: 0.65, bounce: 0 },
    },
};

const footerListVariants: Variants = {
    hidden: {},
    visible: {
        transition: {
            staggerChildren: 0.045,
        },
    },
};

const footerLinkVariants: Variants = {
    hidden: { opacity: 0, y: 7 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { type: "spring", duration: 0.42, bounce: 0 },
    },
};

const FooterSocialIcons = {
    twitter: (props: React.SVGProps<SVGSVGElement>) => (
        <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" {...props}>
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
    ),
    linkedin: (props: React.SVGProps<SVGSVGElement>) => (
        <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" {...props}>
            <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.64 1.64 0 1 0 0-3.28 1.64 1.64 0 0 0 0 3.28m1.4 9.74v-8.37H5.06v8.37h2.8z" />
        </svg>
    ),
    github: (props: React.SVGProps<SVGSVGElement>) => (
        <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" {...props}>
            <path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.1-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z" />
        </svg>
    ),
    instagram: (props: React.SVGProps<SVGSVGElement>) => (
        <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" {...props}>
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
    ),
};

export function Home() {
    const { theme, toggleTheme } = useTheme();
    const { palette: p, isDark } = useThemePalette();

    return (
        <div
            className="relative min-h-screen w-full overflow-x-hidden antialiased selection:bg-white/20 selection:text-white"
            style={{ backgroundColor: isDark ? "#110d0a" : "#FFF5E6", color: isDark ? "#ffffff" : "#1e293b" }}
        >
            {/* Background glow & wallpaper: fixed so it stays over all the page when scrolling up and down */}
            <motion.div
                variants={bgGlowVariants}
                initial="hidden"
                animate="show"
                className="pointer-events-none fixed inset-0 z-0 will-change-transform select-none"
            >
                {resolveImageUrl(HERO_BACKGROUND_WALLPAPER) ? (
                    <>
                        <img
                            src={resolveImageUrl(HERO_BACKGROUND_WALLPAPER)}
                            alt="Dramatic atmospheric wallpaper"
                            className="h-full w-full object-cover"
                        />
                        {/* Theme-adaptive ambient overlay to ensure maximum contrast and legibility */}
                        <div
                            className="absolute inset-0"
                            style={{
                                background: isDark
                                    ? "radial-gradient(circle at 60% 30%, rgba(17,13,10,0.15) 0%, rgba(17,13,10,0.6) 50%, rgba(17,13,10,0.92) 100%)"
                                    : "radial-gradient(circle at 60% 30%, rgba(255,245,230,0.2) 0%, rgba(255,245,230,0.7) 50%, rgba(255,245,230,0.95) 100%)",
                            }}
                        />
                    </>
                ) : (
                    <div className="absolute inset-0" style={{ backgroundColor: isDark ? "#110d0a" : "#FFF5E6" }} />
                )}
            </motion.div>

            <div className="relative z-10 flex min-h-screen flex-col">
                {/* ---- Nav matching Hero37 ---- */}
                <motion.nav
                    variants={navVariants}
                    initial="hidden"
                    animate="show"
                    className="flex w-full items-center justify-between px-6 py-5 sm:px-8 md:px-12 lg:px-14 border-b backdrop-blur-sm"
                    style={{ borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }}
                >
                    {/* Logo — ShieldCheck icon + "SentinelX" wordmark */}
                    <Link to="/" className="flex items-center gap-2.5">
                        <ShieldCheck className="size-8" style={{ color: isDark ? "#ffffff" : "#09090b" }} />
                        <span className="text-lg font-semibold tracking-[-0.01em]" style={{ color: isDark ? "#ffffff" : "#09090b" }}>
                            SentinelX
                        </span>
                    </Link>

                    {/* Center nav links — hidden on mobile */}
                    <nav
                        className="hidden items-center gap-10 md:flex"
                        aria-label="Primary navigation"
                    >
                        {["Platform", "Research", "Resources", "Foundations"].map(
                            (link) => (
                                <a
                                    key={link}
                                    href={`#${link.toLowerCase()}`}
                                    className="flex min-h-[40px] items-center text-[14px] font-medium transition-colors duration-200 hover:opacity-100"
                                    style={{ color: isDark ? "rgba(255,255,255,0.75)" : "rgba(15,23,42,0.75)" }}
                                >
                                    {link}
                                </a>
                            ),
                        )}
                    </nav>

                    {/* Right side — Theme toggle, tiny square marker, Log in, Get started */}
                    <div className="flex items-center gap-3 sm:gap-4">
                        <button
                            aria-label="Toggle theme"
                            onClick={toggleTheme}
                            className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                            style={{ color: isDark ? "rgba(255,255,255,0.85)" : "#0f172a" }}
                        >
                            {isDark ? <Sun size={17} /> : <Moon size={17} />}
                        </button>
                        <div className="flex items-center gap-2.5">
                            {/* Tiny square marker matching Hero37 */}
                            <span
                                className="inline-block size-2 shrink-0 rounded-[2px]"
                                style={{ backgroundColor: isDark ? "rgba(255,255,255,0.7)" : "rgba(15,23,42,0.7)" }}
                                aria-hidden="true"
                            />
                            <Link
                                to="/login"
                                className="flex min-h-[40px] items-center text-[14px] font-medium transition-colors duration-200 hover:opacity-80"
                                style={{ color: isDark ? "rgba(255,255,255,0.85)" : "#0f172a" }}
                            >
                                Log in
                            </Link>
                        </div>
                        <Link
                            to="/register"
                            className="rounded-[5px] px-3.5 py-1.5 text-[14px] font-medium border transition-colors hover:opacity-90"
                            style={{
                                backgroundColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.08)",
                                color: isDark ? "#ffffff" : "#0f172a",
                                borderColor: isDark ? "rgba(255,255,255,0.18)" : "rgba(15,23,42,0.15)",
                            }}
                        >
                            Get started
                        </Link>
                    </div>
                </motion.nav>

                {/* ── Main hero content ─────────────────────────────────────────────────
                    Left-aligned, sits roughly in the upper-left third of the viewport */}
                <main className="flex min-h-[calc(100vh-80px)] flex-col justify-between px-6 pt-14 pb-10 sm:px-8 sm:pt-16 md:px-12 lg:px-14 lg:pt-20">
                    {/* Upper content — headline, subtitle, CTA */}
                    <div className="flex max-w-3xl flex-col items-start">
                        {/* Headline — two lines, each animates independently */}
                        <motion.h1
                            variants={headlineContainerVariants}
                            initial="hidden"
                            animate="show"
                            className="text-[2.75rem] leading-[1.06] font-normal tracking-[-0.025em] text-balance sm:text-[3.5rem] md:text-[4rem] lg:text-[4.5rem] 2xl:text-[7rem]"
                            style={{ color: isDark ? "#ffffff" : "#09090b" }}
                        >
                            <motion.span
                                variants={headlineLineVariants}
                                className="block will-change-transform"
                            >
                                SentinelX Secures Your Network.
                            </motion.span>
                            <motion.span
                                variants={headlineLineVariants}
                                className="block will-change-transform"
                            >
                                And Explains Why.
                            </motion.span>
                        </motion.h1>

                        {/* Subtitle */}
                        <motion.p
                            variants={subtitleVariants}
                            initial="hidden"
                            animate="show"
                            className="mt-5 max-w-[420px] text-[14.5px] leading-[1.65] font-normal text-pretty will-change-transform sm:text-[15px] 2xl:max-w-md 2xl:text-lg"
                            style={{ color: isDark ? "rgba(255,255,255,0.68)" : "#334155" }}
                        >
                            SentinelX empowers security teams with real telemetry, real detection, and graph-aware correlation that explains every incident without fabricated data.
                        </motion.p>

                        {/* CTA button — high contrast in both dark and light modes */}
                        <motion.div
                            variants={ctaVariants}
                            initial="hidden"
                            animate="show"
                            className="mt-8 will-change-transform"
                        >
                            <Link
                                to="/register"
                                className="group flex min-h-[44px] items-center gap-2.5 rounded-[5px] py-2.5 pr-4 pl-5 text-[14.5px] font-medium tracking-[-0.005em] transition-[transform,background-color,box-shadow] duration-150 ease-out active:scale-[0.96] 2xl:text-lg"
                                style={{
                                    backgroundColor: isDark ? "#ffffff" : "#0f172a",
                                    color: isDark ? "#0f172a" : "#ffffff",
                                    boxShadow: isDark
                                        ? "0 1px 3px rgba(0,0,0,0.25), 0 4px 16px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.90), inset 0 -1px 0 rgba(0,0,0,0.08)"
                                        : "0 1px 3px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.10)",
                                }}
                            >
                                Get started
                                <ArrowRight
                                    className="h-4 w-4 transition-transform duration-150 ease-out group-hover:translate-x-0.5"
                                    style={{ color: isDark ? "#334155" : "#cbd5e1" }}
                                    aria-hidden="true"
                                />
                            </Link>
                        </motion.div>
                    </div>

                    {/* ── Bottom row — stats left, tagline right ───────────────────────── */}
                    <div className="flex flex-col-reverse gap-8 sm:flex-row sm:items-end sm:justify-between">
                        {/* Stats row — left */}
                        <motion.div
                            variants={statsContainerVariants}
                            initial="hidden"
                            animate="show"
                            className="flex gap-10 sm:gap-12"
                        >
                            {/* Stat 1 — 5 ML Models / Zero-Day Research */}
                            <motion.div
                                variants={statItemVariants}
                                className="flex flex-col gap-1.5 will-change-transform"
                            >
                                <div className="flex items-center gap-2">
                                    {/* 2×2 dot-grid icon */}
                                    <svg
                                        width="14"
                                        height="14"
                                        viewBox="0 0 14 14"
                                        fill="none"
                                        aria-hidden="true"
                                        className="opacity-75"
                                        style={{ color: isDark ? "#ffffff" : "#09090b" }}
                                    >
                                        <circle cx="3" cy="3" r="1.5" fill="currentColor" />
                                        <circle cx="11" cy="3" r="1.5" fill="currentColor" />
                                        <circle cx="3" cy="11" r="1.5" fill="currentColor" />
                                        <circle cx="11" cy="11" r="1.5" fill="currentColor" />
                                    </svg>
                                    <span
                                        className="text-[1.05rem] font-semibold tracking-[-0.01em] tabular-nums"
                                        style={{ color: isDark ? "#ffffff" : "#09090b" }}
                                    >
                                        5 ML Models
                                    </span>
                                </div>
                                <span className="ml-[22px] text-[13px] font-normal" style={{ color: isDark ? "rgba(255,255,255,0.5)" : "#64748b" }}>
                                    Zero-Day Research
                                </span>
                            </motion.div>

                            {/* Stat 2 — 3 Databases / Postgres, Mongo & Redis */}
                            <motion.div
                                variants={statItemVariants}
                                className="flex flex-col gap-1.5 will-change-transform"
                            >
                                <div className="flex items-center gap-2">
                                    <svg
                                        width="14"
                                        height="14"
                                        viewBox="0 0 14 14"
                                        fill="none"
                                        aria-hidden="true"
                                        className="opacity-75"
                                        style={{ color: isDark ? "#ffffff" : "#09090b" }}
                                    >
                                        <rect
                                            x="2"
                                            y="5.5"
                                            width="10"
                                            height="3"
                                            rx="1"
                                            fill="currentColor"
                                        />
                                        <rect
                                            x="5.5"
                                            y="2"
                                            width="3"
                                            height="10"
                                            rx="1"
                                            fill="currentColor"
                                        />
                                    </svg>
                                    <span
                                        className="text-[1.05rem] font-semibold tracking-[-0.01em] tabular-nums"
                                        style={{ color: isDark ? "#ffffff" : "#09090b" }}
                                    >
                                        3 Databases
                                    </span>
                                </div>
                                <span className="ml-[22px] text-[13px] font-normal" style={{ color: isDark ? "rgba(255,255,255,0.5)" : "#64748b" }}>
                                    Postgres, Mongo &amp; Redis
                                </span>
                            </motion.div>

                            {/* Stat 3 — 0% Fabricated / Real Telemetry */}
                            <motion.div
                                variants={statItemVariants}
                                className="flex flex-col gap-1.5 will-change-transform"
                            >
                                <div className="flex items-center gap-2">
                                    <ShieldCheck size={14} style={{ color: isDark ? "rgba(255,255,255,0.75)" : "#09090b" }} />
                                    <span
                                        className="text-[1.05rem] font-semibold tracking-[-0.01em] tabular-nums"
                                        style={{ color: isDark ? "#ffffff" : "#09090b" }}
                                    >
                                        0% Fabricated
                                    </span>
                                </div>
                                <span className="ml-[22px] text-[13px] font-normal" style={{ color: isDark ? "rgba(255,255,255,0.5)" : "#64748b" }}>
                                    Real Telemetry
                                </span>
                            </motion.div>
                        </motion.div>

                        {/* Bottom-right tagline */}
                        <motion.p
                            variants={taglineVariants}
                            initial="hidden"
                            animate="show"
                            className="text-md max-w-xs leading-[1.55] font-normal text-pretty will-change-transform sm:text-right"
                            style={{ color: isDark ? "rgba(255,255,255,0.9)" : "rgba(15,23,42,0.85)" }}
                        >
                            Advanced security intelligence that takes SOC defense to new heights
                        </motion.p>
                    </div>
                </main>

                {/* ---- Promo pair ---- */}
                <section className="mx-auto max-w-7xl px-6 py-16">
                    <motion.div
                        initial="hidden"
                        whileInView="show"
                        viewport={{ once: true, margin: "-80px" }}
                        variants={staggerContainer}
                        className="grid grid-cols-1 gap-6 md:grid-cols-2"
                    >
                        <ExpandableCard
                            id="promo-zero-day"
                            icon={GitBranch}
                            subtitle="RESEARCH"
                            title="Zero-day detection, evaluated honestly"
                            description="GraphSAGE vs. Random Forest, XGBoost, CNN, and LSTM — with an entire attack class held out of training, not just a random split."
                            imageSrc="https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&q=80&w=1000"
                            actionText="Explore Zero-Day Research"
                            actionLink="/register"
                            content={
                                <div className="space-y-4">
                                    <p className="text-sm font-medium">
                                        Standard cybersecurity ML benchmarks suffer from severe evaluation bias by using simple 80/20 random splits. In reality, a true zero-day attack has never been seen before, meaning random splits leak topological signatures.
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                        <div className="p-3.5 rounded-xl border border-[#e2d9cc] dark:border-slate-800 bg-white/60 dark:bg-slate-900/40">
                                            <span className="font-bold uppercase text-sx-blue dark:text-sx-blue-glow">Held-Out Attack Classes</span>
                                            <p className="mt-1 text-[#4a4b5e] dark:text-slate-400">Heartbleed, Infiltration, and Botnet traffic are completely excluded from training and presented strictly as unknown zero-days during validation.</p>
                                        </div>
                                        <div className="p-3.5 rounded-xl border border-[#e2d9cc] dark:border-slate-800 bg-white/60 dark:bg-slate-900/40">
                                            <span className="font-bold uppercase text-emerald-600 dark:text-emerald-400">Inductive GraphSAGE</span>
                                            <p className="mt-1 text-[#4a4b5e] dark:text-slate-400">Learns neighborhood aggregation functions rather than transductive node embeddings, allowing instant generalization to unseen endpoints.</p>
                                        </div>
                                    </div>
                                    <div className="p-3.5 rounded-xl border border-[#e2d9cc] dark:border-slate-800 bg-white/60 dark:bg-slate-900/40">
                                        <h4 className="text-xs font-bold text-[#282937] dark:text-slate-200 mb-1">Evaluated Against 4 Classical Baseline Architectures</h4>
                                        <p className="text-xs text-[#4a4b5e] dark:text-slate-400">Benchmarked side-by-side with Random Forest, XGBoost, 1D-CNN, and LSTM over identical CIC-IDS2017 &amp; 2018 datasets with rigorous F1, Precision, and Recall scoring.</p>
                                    </div>
                                </div>
                            }
                        />

                        <ExpandableCard
                            id="promo-ai-assistant"
                            icon={MessageSquareText}
                            subtitle="AI ASSISTANT"
                            title="Context-grounded, not a generic chatbot"
                            description="Groq-backed investigation support that only reasons over your real incident data — with a local fallback if Groq isn't configured."
                            imageSrc="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1000"
                            actionText="Try AI Assistant"
                            actionLink="/register"
                            content={
                                <div className="space-y-4">
                                    <p className="text-sm font-medium">
                                        Generic LLMs hallucinate CVEs and invent non-existent IP connections. SentinelX pairs Groq LLaMA 3.3 70B with real-time vector search strictly grounded in your active PostgreSQL and Redis telemetry.
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                        <div className="p-3.5 rounded-xl border border-[#e2d9cc] dark:border-slate-800 bg-white/60 dark:bg-slate-900/40">
                                            <span className="font-bold uppercase text-purple-600 dark:text-purple-400">RAG Grounded Citations</span>
                                            <p className="mt-1 text-[#4a4b5e] dark:text-slate-400">Every response links directly to verified alert IDs, Sigma rule triggers, and active endpoint hostnames.</p>
                                        </div>
                                        <div className="p-3.5 rounded-xl border border-[#e2d9cc] dark:border-slate-800 bg-white/60 dark:bg-slate-900/40">
                                            <span className="font-bold uppercase text-amber-600 dark:text-amber-400">Local Fallback Mode</span>
                                            <p className="mt-1 text-[#4a4b5e] dark:text-slate-400">If external API keys are unavailable, SentinelX gracefully switches to local heuristic synthesis with zero downtime.</p>
                                        </div>
                                    </div>
                                    <div className="p-3.5 rounded-xl border border-[#e2d9cc] dark:border-slate-800 bg-white/60 dark:bg-slate-900/40">
                                        <h4 className="text-xs font-bold text-[#282937] dark:text-slate-200 mb-1">Analyst-Centric Workflow</h4>
                                        <p className="text-xs text-[#4a4b5e] dark:text-slate-400">Supports root cause hypothesis generation, containment script drafting, and MITRE ATT&amp;CK technique verification.</p>
                                    </div>
                                </div>
                            }
                        />
                    </motion.div>
                </section>

                {/* ---- Two pillars ---- */}
                <section id="platform" className="mx-auto max-w-7xl px-6 py-16">
                    <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={staggerContainer} className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <ExpandableCard
                            id="pillar-detect-correlate"
                            icon={Radar}
                            subtitle="DETECTION ENGINE"
                            title="Detect & correlate"
                            description="A Sigma-inspired rule engine and Isolation Forest anomaly detection run against real ingested telemetry — not simulated traffic."
                            imageSrc="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=1000"
                            actionText="Explore Detection Engine"
                            actionLink="/register"
                            content={
                                <div className="space-y-4">
                                    <p className="text-sm">
                                        Raw logs alone drown analysts in alert fatigue. SentinelX combines multi-layered detection techniques to filter noise and surface genuine incidents.
                                    </p>
                                    <ul className="space-y-2 text-xs">
                                        <li className="flex items-start gap-2">
                                            <CheckCircle2 size={15} className="text-sx-blue shrink-0 mt-0.5" />
                                            <span><strong>Sigma Rule Matching:</strong> Real-time YAML rule compiler mapping attacks directly to MITRE ATT&amp;CK tactics.</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <CheckCircle2 size={15} className="text-sx-blue shrink-0 mt-0.5" />
                                            <span><strong>Isolation Forest Anomaly Scoring:</strong> Catches subtle outlier beaconing and volumetric spikes without signature templates.</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <CheckCircle2 size={15} className="text-sx-blue shrink-0 mt-0.5" />
                                            <span><strong>Graph-Aware Correlation:</strong> Assembles disparate alerts across network hops into a unified correlated incident graph.</span>
                                        </li>
                                    </ul>
                                </div>
                            }
                        />

                        <ExpandableCard
                            id="pillar-investigate-report"
                            icon={Search}
                            subtitle="INCIDENT RESPONSE"
                            title="Investigate & report"
                            description="A full investigation workspace and AI-assisted reporting pipeline, built so every fact traces back to real data."
                            imageSrc="https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?auto=format&fit=crop&q=80&w=1000"
                            actionText="Explore Investigation Tools"
                            actionLink="/register"
                            content={
                                <div className="space-y-4">
                                    <p className="text-sm">
                                        From detection to containment, SentinelX equips SOC teams with complete forensic continuity.
                                    </p>
                                    <ul className="space-y-2 text-xs">
                                        <li className="flex items-start gap-2">
                                            <CheckCircle2 size={15} className="text-sx-blue shrink-0 mt-0.5" />
                                            <span><strong>Incident Timeline &amp; Blast Radius:</strong> Chronological breakdown of adversary progression across infected network hosts.</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <CheckCircle2 size={15} className="text-sx-blue shrink-0 mt-0.5" />
                                            <span><strong>Case Management:</strong> Assign cases to analysts, set priority SLAs, and append immutable audit notes.</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <CheckCircle2 size={15} className="text-sx-blue shrink-0 mt-0.5" />
                                            <span><strong>AI-Drafted Executive Summaries:</strong> One-click incident report drafting with factual attribution and remediation steps.</span>
                                        </li>
                                    </ul>
                                </div>
                            }
                        />
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

                {/* ---- Stat highlights (Expandable Cards) ---- */}
                <section className="mx-auto max-w-7xl px-6 py-16">
                    <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={staggerContainer} className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                        <ExpandableCard
                            id="stat-ml-models"
                            subtitle="BENCHMARK ARCHITECTURES"
                            title="5 ML Models Compared"
                            description="GraphSAGE, Random Forest, XGBoost, CNN, and LSTM evaluated on identical feature representations."
                            actionText="View Research Methodology"
                            actionLink="/register"
                            children={
                                <div>
                                    <div className="font-mono text-3xl font-semibold" style={{ color: p.primary }}>5</div>
                                    <div className="mt-2 text-xs leading-relaxed" style={{ color: p.textSecondary }}>ML models compared per zero-day experiment</div>
                                    <div className="mt-3 flex items-center gap-1 text-[10px] text-sx-blue font-semibold">
                                        <span>Inspect models</span> <ArrowRight size={10} />
                                    </div>
                                </div>
                            }
                            content={
                                <div className="space-y-3 text-xs">
                                    <p className="text-sm">We test multiple machine learning paradigms against the held-out zero-day attack classes:</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="p-2.5 rounded-lg border border-[#e2d9cc] dark:border-slate-800 bg-white/50 dark:bg-slate-900/30">
                                            <div className="font-bold text-sx-blue">GraphSAGE</div>
                                            <div className="text-[#4a4b5e] dark:text-slate-400 mt-0.5">Inductive GNN, neighborhood feature aggregation.</div>
                                        </div>
                                        <div className="p-2.5 rounded-lg border border-[#e2d9cc] dark:border-slate-800 bg-white/50 dark:bg-slate-900/30">
                                            <div className="font-bold text-emerald-600 dark:text-emerald-400">Random Forest &amp; XGBoost</div>
                                            <div className="text-[#4a4b5e] dark:text-slate-400 mt-0.5">Ensemble tree baseline over tabular flow statistics.</div>
                                        </div>
                                        <div className="p-2.5 rounded-lg border border-[#e2d9cc] dark:border-slate-800 bg-white/50 dark:bg-slate-900/30">
                                            <div className="font-bold text-indigo-600 dark:text-indigo-400">1D-CNN</div>
                                            <div className="text-[#4a4b5e] dark:text-slate-400 mt-0.5">Local temporal spatial convolution.</div>
                                        </div>
                                        <div className="p-2.5 rounded-lg border border-[#e2d9cc] dark:border-slate-800 bg-white/50 dark:bg-slate-900/30">
                                            <div className="font-bold text-purple-600 dark:text-purple-400">Bidirectional LSTM</div>
                                            <div className="text-[#4a4b5e] dark:text-slate-400 mt-0.5">Recurrent sequence memory for packet bursts.</div>
                                        </div>
                                    </div>
                                </div>
                            }
                        />

                        <ExpandableCard
                            id="stat-databases"
                            subtitle="POLYGLOT ARCHITECTURE"
                            title="3 Purpose-Built Databases"
                            description="PostgreSQL for relational integrity, MongoDB for alerts, Redis for sub-millisecond stream ingestion."
                            actionText="Inspect System Architecture"
                            actionLink="/register"
                            children={
                                <div>
                                    <div className="font-mono text-3xl font-semibold" style={{ color: p.primary }}>3</div>
                                    <div className="mt-2 text-xs leading-relaxed" style={{ color: p.textSecondary }}>purpose-built databases (Postgres, Mongo, Redis)</div>
                                    <div className="mt-3 flex items-center gap-1 text-[10px] text-sx-blue font-semibold">
                                        <span>Inspect stack</span> <ArrowRight size={10} />
                                    </div>
                                </div>
                            }
                            content={
                                <div className="space-y-3 text-xs">
                                    <p className="text-sm">A multi-model persistence tier engineered for zero data loss and extreme throughput:</p>
                                    <ul className="space-y-2">
                                        <li className="p-2 rounded-lg border border-[#e2d9cc] dark:border-slate-800">
                                            <strong>PostgreSQL:</strong> User accounts, cases, audit logs, and relational foreign-key integrity.
                                        </li>
                                        <li className="p-2 rounded-lg border border-[#e2d9cc] dark:border-slate-800">
                                            <strong>MongoDB:</strong> Flexible schema for unstructured telemetry alerts, raw PCAP headers, and graph edges.
                                        </li>
                                        <li className="p-2 rounded-lg border border-[#e2d9cc] dark:border-slate-800">
                                            <strong>Redis Streams:</strong> Event queue ingestion handling high EPS traffic with sub-millisecond dispatch.
                                        </li>
                                    </ul>
                                </div>
                            }
                        />

                        <ExpandableCard
                            id="stat-fabricated"
                            subtitle="DATA INTEGRITY"
                            title="0% Fabricated Numbers"
                            description="No mock random math. Every graph node and alert is computed from genuine packet ingestion."
                            actionText="View Live Telemetry"
                            actionLink="/register"
                            children={
                                <div>
                                    <div className="font-mono text-3xl font-semibold" style={{ color: p.primary }}>0%</div>
                                    <div className="mt-2 text-xs leading-relaxed" style={{ color: p.textSecondary }}>fabricated data — every number is real or honestly zero</div>
                                    <div className="mt-3 flex items-center gap-1 text-[10px] text-sx-blue font-semibold">
                                        <span>Verify telemetry</span> <ArrowRight size={10} />
                                    </div>
                                </div>
                            }
                            content={
                                <div className="space-y-3 text-xs">
                                    <p className="text-sm">SentinelX never fakes a high alert count to look active in sales demos:</p>
                                    <p className="text-[#4a4b5e] dark:text-slate-400">
                                        If the network is quiet and no malicious traffic is streamed, alert counts read 0. When you replay CIC-IDS2017 datasets or connect live agents via the Ingestion API, the detection engines and ML models calculate real risk scores from packet flows.
                                    </p>
                                </div>
                            }
                        />

                        <ExpandableCard
                            id="stat-rbac"
                            subtitle="ACCESS CONTROL"
                            title="4 Server-Enforced RBAC Roles"
                            description="Granular permission matrices with MFA/OTP and append-only cryptographic audit logging."
                            actionText="Explore Permissions"
                            actionLink="/register"
                            children={
                                <div>
                                    <div className="font-mono text-3xl font-semibold" style={{ color: p.primary }}>4</div>
                                    <div className="mt-2 text-xs leading-relaxed" style={{ color: p.textSecondary }}>RBAC roles with server-enforced permissions</div>
                                    <div className="mt-3 flex items-center gap-1 text-[10px] text-sx-blue font-semibold">
                                        <span>View RBAC matrix</span> <ArrowRight size={10} />
                                    </div>
                                </div>
                            }
                            content={
                                <div className="space-y-3 text-xs">
                                    <p className="text-sm">Enterprise role-based access control enforced at the API gateway:</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="p-2 rounded-lg border border-[#e2d9cc] dark:border-slate-800">
                                            <span className="font-bold text-red-500">Super Admin</span>
                                            <p className="text-[11px] text-[#4a4b5e] dark:text-slate-400">System config, user management &amp; global overrides.</p>
                                        </div>
                                        <div className="p-2 rounded-lg border border-[#e2d9cc] dark:border-slate-800">
                                            <span className="font-bold text-amber-500">SOC Lead</span>
                                            <p className="text-[11px] text-[#4a4b5e] dark:text-slate-400">Case triage, rule publishing &amp; escalation authority.</p>
                                        </div>
                                        <div className="p-2 rounded-lg border border-[#e2d9cc] dark:border-slate-800">
                                            <span className="font-bold text-blue-500">Analyst</span>
                                            <p className="text-[11px] text-[#4a4b5e] dark:text-slate-400">Investigation, evidence tagging &amp; report generation.</p>
                                        </div>
                                        <div className="p-2 rounded-lg border border-[#e2d9cc] dark:border-slate-800">
                                            <span className="font-bold text-emerald-500">Auditor</span>
                                            <p className="text-[11px] text-[#4a4b5e] dark:text-slate-400">Read-only forensic audit and compliance export.</p>
                                        </div>
                                    </div>
                                </div>
                            }
                        />
                    </motion.div>
                </section>

                {/* ---- Resource grid (Expandable Cards) ---- */}
                <section id="resources" className="mx-auto max-w-7xl px-6 py-16">
                    <h2 className="mb-8 text-2xl font-semibold">Explore the research</h2>
                    <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={staggerContainer} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {RESOURCE_CARDS.map((card) => (
                            <ExpandableCard
                                key={card.title}
                                icon={card.icon}
                                tag={card.tag}
                                title={card.title}
                                description={card.description}
                                actionText="Read Full Specification"
                                actionLink="/register"
                                content={
                                    <div className="space-y-3 text-xs">
                                        <p className="text-sm font-medium">{card.description}</p>
                                        <div className="rounded-xl border border-[#e2d9cc] dark:border-slate-800 bg-white/50 dark:bg-slate-900/40 p-3.5">
                                            <h4 className="font-bold text-[#282937] dark:text-slate-200 mb-1">Architecture Implementation</h4>
                                            <p className="text-[#4a4b5e] dark:text-slate-400">
                                                Integrated directly into SentinelX's Python FastAPI backend with PyTorch Geometric model weights, Redis Stream message pipelines, and WebSocket real-time updates.
                                            </p>
                                        </div>
                                    </div>
                                }
                            />
                        ))}
                    </motion.div>
                </section>

                {/* ---- Research foundations (Expandable Cards) ---- */}
                <section id="research" className="mx-auto max-w-7xl px-6 py-16">
                    <h2 className="mb-2 text-2xl font-semibold">Built on proven foundations</h2>
                    <p className="mb-8 max-w-2xl text-sm" style={{ color: p.textSecondary }}>
                        The zero-day research module and AI assistant aren't built from scratch — they apply
                        established, peer-reviewed techniques to a real security pipeline.
                    </p>
                    <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={staggerContainer} className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        {FOUNDATIONS.map((f) => (
                            <ExpandableCard
                                key={f.name}
                                subtitle={f.citation}
                                title={f.name}
                                description={f.description}
                                actionText="View Research Paper Implementation"
                                actionLink="/register"
                                content={
                                    <div className="space-y-3 text-xs">
                                        <p className="text-sm">{f.description}</p>
                                        <div className="p-3 rounded-xl border border-[#e2d9cc] dark:border-slate-800 bg-white/50 dark:bg-slate-900/40 font-mono text-[11px] text-sx-blue dark:text-sx-blue-glow">
                                            Citation: {f.citation}
                                        </div>
                                        <div className="p-3 rounded-xl border border-[#e2d9cc] dark:border-slate-800 bg-white/50 dark:bg-slate-900/40 text-[#4a4b5e] dark:text-slate-400">
                                            SentinelX implements this methodology with production safeguards, reproducible training pipelines, and held-out cross validation.
                                        </div>
                                    </div>
                                }
                            />
                        ))}
                    </motion.div>
                </section>

                {/* ---- Closing CTA row (Expandable Cards) ---- */}
                <section className="mx-auto max-w-7xl px-6 py-16">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <ExpandableCard
                            id="cta-create-account"
                            icon={ShieldCheck}
                            subtitle="AUTHENTICATION"
                            title="Create an account"
                            description="Register and verify with MFA to get a real, working SentinelX session."
                            actionText="Proceed to Registration"
                            actionLink="/register"
                            content={
                                <div className="space-y-3 text-xs">
                                    <p className="text-sm">Account creation includes cryptographic credential hashing and optional Time-based One-Time Password (TOTP) two-factor authentication.</p>
                                    <p className="text-[#4a4b5e] dark:text-slate-400">Once registered, your account is immediately granted scoped access to interactive dataset streaming, Sigma rule management, and the AI investigation assistant.</p>
                                </div>
                            }
                        />

                        <ExpandableCard
                            id="cta-read-architecture"
                            icon={FileText}
                            subtitle="SYSTEM DESIGN"
                            title="Read the architecture"
                            description="See the full event pipeline, phase by phase from packet to alert graph."
                            actionText="Explore Architecture"
                            actionLink="/register"
                            content={
                                <div className="space-y-3 text-xs">
                                    <p className="text-sm">SentinelX processes streaming packet flows in 4 distinct phases:</p>
                                    <ol className="list-decimal pl-4 space-y-1 text-[#4a4b5e] dark:text-slate-400">
                                        <li><strong>Ingestion:</strong> High-speed HTTP ingestion into Redis Streams.</li>
                                        <li><strong>Detection:</strong> Parallel Sigma rule evaluation &amp; Isolation Forest anomaly scoring.</li>
                                        <li><strong>Correlation:</strong> Graph-based clustering linking alerts into multi-stage attack campaigns.</li>
                                        <li><strong>Response:</strong> Real-time WebSocket dispatch and LLM triage synthesis.</li>
                                    </ol>
                                </div>
                            }
                        />

                        <ExpandableCard
                            id="cta-explore-api"
                            icon={BookOpen}
                            subtitle="DEVELOPER TOOLS"
                            title="Explore the API"
                            description="Every endpoint documented at /docs with interactive OpenAPI Swagger schemas."
                            actionText="View API Documentation"
                            actionLink="/register"
                            content={
                                <div className="space-y-3 text-xs">
                                    <p className="text-sm">Fully compliant RESTful API with automated OpenAPI 3.0 documentation:</p>
                                    <p className="text-[#4a4b5e] dark:text-slate-400">Access endpoints for streaming packet injection, MITRE ATT&amp;CK matrix status, live IOC lookups, and incident case updates.</p>
                                </div>
                            }
                        />
                    </div>
                </section>

                {/* ---- Footer16: Atmospheric Full-Width Footer with Large Backdrop Wordmark ---- */}
                <footer
                    className="relative w-full overflow-hidden font-sans antialiased mt-24 border-t backdrop-blur-xl"
                    style={{
                        backgroundColor: isDark ? "rgba(0,0,0,0.25)" : "rgba(255,245,230,0.4)",
                        borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
                        color: isDark ? "#f4f4f5" : "#09090b",
                    }}
                >
                    {/* Full-width Cyber Matrix Strips Horizon & Proportionally Formatted SENTINELX Wordmark */}
                    <div className="relative w-full overflow-hidden flex flex-col items-center justify-center py-20 sm:py-28 min-h-[360px] sm:min-h-[460px]">
                        {/* Strips of Matrix Design spanning whole space from left to right */}
                        <div className="absolute inset-0 z-0 w-full h-full pointer-events-none select-none overflow-hidden flex items-end">
                            {resolveImageUrl(FOOTER_MATRIX_IMAGE) ? (
                                <img
                                    src={resolveImageUrl(FOOTER_MATRIX_IMAGE)}
                                    alt="Cyber Matrix Wallpaper"
                                    className="w-full h-full object-cover object-bottom"
                                    style={{
                                        opacity: isDark ? 0.85 : 0.65,
                                        maskImage: "linear-gradient(to bottom, transparent 0%, black 25%, black 85%, transparent 100%)",
                                        WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 25%, black 85%, transparent 100%)",
                                    }}
                                />
                            ) : (
                                <div
                                    className="relative w-full h-full flex items-end"
                                    style={{
                                        maskImage: "linear-gradient(to bottom, transparent 0%, black 20%, black 85%, transparent 100%)",
                                        WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 20%, black 85%, transparent 100%)",
                                    }}
                                >
                                    {/* Ambient matrix glow */}
                                    <div
                                        className="absolute inset-0 pointer-events-none"
                                        style={{
                                            background: isDark
                                                ? "radial-gradient(ellipse at 50% 70%, rgba(56,189,248,0.18) 0%, rgba(99,102,241,0.08) 45%, transparent 75%)"
                                                : "radial-gradient(ellipse at 50% 70%, rgba(14,165,233,0.14) 0%, rgba(99,102,241,0.06) 45%, transparent 75%)",
                                        }}
                                    />

                                    {/* High-tech Matrix Strips SVG covering full width */}
                                    <svg
                                        className="w-full h-full min-h-[260px] max-h-[380px]"
                                        viewBox="0 0 1200 240"
                                        preserveAspectRatio="none"
                                        aria-hidden="true"
                                    >
                                        <defs>
                                            <linearGradient id="gridLineGrad" x1="0" y1="0" x2="1" y2="0">
                                                <stop offset="0%" stopColor={isDark ? "#38bdf8" : "#0284c7"} stopOpacity="0" />
                                                <stop offset="50%" stopColor={isDark ? "#38bdf8" : "#0284c7"} stopOpacity={isDark ? "0.45" : "0.35"} />
                                                <stop offset="100%" stopColor={isDark ? "#38bdf8" : "#0284c7"} stopOpacity="0" />
                                            </linearGradient>
                                        </defs>

                                        {/* Horizontal perspective matrix grid lines */}
                                        <line x1="0" y1="210" x2="1200" y2="210" stroke="url(#gridLineGrad)" strokeWidth="1" strokeDasharray="6 4" opacity="0.6" />
                                        <line x1="0" y1="222" x2="1200" y2="222" stroke="url(#gridLineGrad)" strokeWidth="1" opacity="0.4" />
                                        <line x1="0" y1="232" x2="1200" y2="232" stroke="url(#gridLineGrad)" strokeWidth="1.5" opacity="0.75" />

                                        {/* Dynamic Matrix Telemetry Strips */}
                                        {MATRIX_TELEMETRY_STRIPS.map((strip, i) => {
                                            const colorMap = {
                                                cyan: isDark ? "#38bdf8" : "#0284c7",
                                                emerald: isDark ? "#34d399" : "#059669",
                                                blue: isDark ? "#60a5fa" : "#2563eb",
                                                indigo: isDark ? "#818cf8" : "#4f46e5",
                                            };
                                            const color = colorMap[strip.color];
                                            const yTop = 230 - strip.h;

                                            return (
                                                <g key={i}>
                                                    {/* Vertical telemetry strip with dashed matrix segments */}
                                                    <line
                                                        x1={strip.x}
                                                        y1="230"
                                                        x2={strip.x}
                                                        y2={yTop}
                                                        stroke={color}
                                                        strokeWidth="3.2"
                                                        strokeLinecap="round"
                                                        strokeDasharray="4 3"
                                                        opacity={isDark ? (strip.glow ? 0.75 : 0.4) : (strip.glow ? 0.65 : 0.35)}
                                                    />

                                                    {/* Glowing apex node on active matrix strips */}
                                                    {strip.glow && (
                                                        <circle
                                                            cx={strip.x}
                                                            cy={yTop}
                                                            r="2.2"
                                                            fill={color}
                                                            opacity={isDark ? 0.95 : 0.85}
                                                        />
                                                    )}

                                                    {/* Matrix code telemetry labels */}
                                                    {strip.char && (
                                                        <text
                                                            x={strip.x}
                                                            y={yTop - 6}
                                                            fontSize="6.5"
                                                            fontFamily="monospace"
                                                            textAnchor="middle"
                                                            fill={color}
                                                            opacity={isDark ? 0.65 : 0.55}
                                                        >
                                                            {strip.char}
                                                        </text>
                                                    )}
                                                </g>
                                            );
                                        })}
                                    </svg>
                                </div>
                            )}
                        </div>

                        {/* Large SENTINELX Wordmark with natural proportions (not horizontally stretched) */}
                        <motion.div
                            variants={footerWordmarkVariants}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, amount: 0.2 }}
                            className="relative z-10 w-full flex justify-center items-center pointer-events-none select-none px-4 sm:px-8 overflow-hidden"
                            aria-hidden="true"
                        >
                            <svg
                                className="w-full h-auto max-w-6xl max-h-[160px] sm:max-h-[200px] lg:max-h-[240px] select-none"
                                viewBox="0 0 1200 150"
                                preserveAspectRatio="xMidYMid meet"
                                aria-label="SENTINELX"
                            >
                                <defs>
                                    <linearGradient id="brandGradFixed" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={isDark ? "#ffffff" : "#09090b"} stopOpacity={isDark ? "0.95" : "0.98"} />
                                        <stop offset="50%" stopColor={isDark ? "#cbd5e1" : "#334155"} stopOpacity={isDark ? "0.6" : "0.65"} />
                                        <stop offset="85%" stopColor={isDark ? "#38bdf8" : "#0284c7"} stopOpacity={isDark ? "0.2" : "0.25"} />
                                        <stop offset="100%" stopColor={isDark ? "#0284c7" : "#0369a1"} stopOpacity="0.05" />
                                    </linearGradient>
                                    <filter id="brandGlow" x="-10%" y="-10%" width="120%" height="120%">
                                        <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor={isDark ? "#38bdf8" : "#0284c7"} floodOpacity={isDark ? "0.2" : "0.12"} />
                                    </filter>
                                </defs>
                                <text
                                    x="50%"
                                    y="52%"
                                    dominantBaseline="central"
                                    textAnchor="middle"
                                    className="font-sans font-black tracking-wider"
                                    fill="url(#brandGradFixed)"
                                    filter="url(#brandGlow)"
                                    fontSize="128"
                                    letterSpacing="4"
                                >
                                    SENTINELX
                                </text>
                            </svg>
                        </motion.div>
                    </div>

                    <motion.div
                        variants={footerSectionVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.18 }}
                        className="relative mx-auto flex flex-col justify-end"
                    >
                        {/* Main content grid */}
                        <div
                            className="relative z-10 border-t px-6 pt-10 pb-8 shadow-[0_-24px_80px_rgba(0,0,0,0.15)] backdrop-blur-md sm:px-12 sm:pt-12 sm:pb-9 lg:pt-[48px]"
                            style={{
                                borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
                                backgroundColor: isDark ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.45)",
                            }}
                        >
                            <div className="grid gap-10 lg:grid-cols-[minmax(260px,1.2fr)_minmax(500px,1.8fr)] lg:gap-x-16">
                                {/* Left Brand info */}
                                <motion.div variants={footerRiseVariants} className="max-w-xl">
                                    <Link
                                        to="/"
                                        className="group inline-flex min-h-10 items-center gap-2.5 transition-[opacity,transform] duration-200 ease-out hover:opacity-85 active:scale-[0.96]"
                                        aria-label="SentinelX Home"
                                    >
                                        <div
                                            className="flex h-9 w-9 items-center justify-center rounded-lg border shadow-sm transition-transform group-hover:scale-105"
                                            style={{
                                                borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)",
                                                backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                                            }}
                                        >
                                            <ShieldCheck className="size-5" style={{ color: isDark ? "#38bdf8" : "#0284c7" }} />
                                        </div>
                                        <span className="text-xl leading-none font-semibold tracking-wide" style={{ color: isDark ? "#ffffff" : "#09090b" }}>
                                            SentinelX
                                        </span>
                                    </Link>
                                    <p className="mt-4 text-sm leading-relaxed font-normal text-pretty sm:text-[14.5px]" style={{ color: isDark ? "rgba(212,212,216,0.8)" : "#475569" }}>
                                        Next-generation AI-assisted SOC platform. Real telemetry, verified zero-day detection, and graph-aware alert correlation that never fabricates a single metric.
                                    </p>
                                    <div className="mt-6 flex items-center gap-3">
                                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                            Deterministic SOC Engine
                                        </span>
                                        <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-400">
                                            GraphSAGE GNN
                                        </span>
                                    </div>
                                </motion.div>

                                {/* Navigation Columns */}
                                <motion.nav
                                    variants={footerSectionVariants}
                                    aria-label="Footer navigation"
                                    className="grid grid-cols-1 gap-8 min-[520px]:grid-cols-3 min-[520px]:gap-x-8 lg:gap-x-12"
                                >
                                    {/* Column 1: Platform */}
                                    <motion.div variants={footerRiseVariants}>
                                        <h3 className="text-xs leading-none font-semibold tracking-widest uppercase" style={{ color: isDark ? "#e4e4e7" : "#09090b" }}>
                                            Platform
                                        </h3>
                                        <motion.ul variants={footerListVariants} className="mt-4 space-y-2.5">
                                            {[
                                                { label: "Zero-Day Research", href: "#research" },
                                                { label: "Detection Engine", href: "#platform" },
                                                { label: "Investigation Workspace", href: "/register" },
                                                { label: "Sigma Rule Matching", href: "/register" },
                                                { label: "Isolation Forest Scoring", href: "/register" },
                                            ].map((link) => (
                                                <motion.li variants={footerLinkVariants} key={link.label}>
                                                    <a
                                                        href={link.href}
                                                        className="inline-flex min-h-5 items-center text-sm font-medium transition-colors duration-200 ease-out hover:opacity-100"
                                                        style={{ color: isDark ? "rgba(212,212,216,0.7)" : "#475569" }}
                                                    >
                                                        {link.label}
                                                    </a>
                                                </motion.li>
                                            ))}
                                        </motion.ul>
                                    </motion.div>

                                    {/* Column 2: Architecture */}
                                    <motion.div variants={footerRiseVariants}>
                                        <h3 className="text-xs leading-none font-semibold tracking-widest uppercase" style={{ color: isDark ? "#e4e4e7" : "#09090b" }}>
                                            Architecture
                                        </h3>
                                        <motion.ul variants={footerListVariants} className="mt-4 space-y-2.5">
                                            {[
                                                { label: "Event Pipeline (Redis)", href: "#resources" },
                                                { label: "GraphSAGE GNN Model", href: "#foundations" },
                                                { label: "Polyglot Persistence", href: "#resources" },
                                                { label: "RAG Incident Copilot", href: "#foundations" },
                                                { label: "OpenAPI Documentation", href: "/register" },
                                            ].map((link) => (
                                                <motion.li variants={footerLinkVariants} key={link.label}>
                                                    <a
                                                        href={link.href}
                                                        className="inline-flex min-h-5 items-center text-sm font-medium transition-colors duration-200 ease-out hover:opacity-100"
                                                        style={{ color: isDark ? "rgba(212,212,216,0.7)" : "#475569" }}
                                                    >
                                                        {link.label}
                                                    </a>
                                                </motion.li>
                                            ))}
                                        </motion.ul>
                                    </motion.div>

                                    {/* Column 3: Resources */}
                                    <motion.div variants={footerRiseVariants}>
                                        <h3 className="text-xs leading-none font-semibold tracking-widest uppercase" style={{ color: isDark ? "#e4e4e7" : "#09090b" }}>
                                            Resources
                                        </h3>
                                        <motion.ul variants={footerListVariants} className="mt-4 space-y-2.5">
                                            {[
                                                { label: "CIC-IDS2017 Dataset", href: "#resources" },
                                                { label: "CSE-CIC-IDS2018 Data", href: "#resources" },
                                                { label: "MITRE ATT&CK Matrix", href: "#resources" },
                                                { label: "PyTorch Geometric Benchmarks", href: "#resources" },
                                                { label: "Research Foundations", href: "#foundations" },
                                            ].map((link) => (
                                                <motion.li variants={footerLinkVariants} key={link.label}>
                                                    <a
                                                        href={link.href}
                                                        className="inline-flex min-h-5 items-center text-sm font-medium transition-colors duration-200 ease-out hover:opacity-100"
                                                        style={{ color: isDark ? "rgba(212,212,216,0.7)" : "#475569" }}
                                                    >
                                                        {link.label}
                                                    </a>
                                                </motion.li>
                                            ))}
                                        </motion.ul>
                                    </motion.div>
                                </motion.nav>
                            </div>

                            {/* Bottom Row — Copyright, Socials & Legal */}
                            <motion.div
                                variants={footerRiseVariants}
                                className="mt-8 flex flex-col border-t pt-6 sm:mt-12 sm:flex-row sm:items-center sm:justify-between gap-4"
                                style={{ borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)" }}
                            >
                                <p className="text-xs font-normal leading-relaxed max-w-md" style={{ color: isDark ? "rgba(161,161,170,0.8)" : "#64748b" }}>
                                    © {new Date().getFullYear()} SentinelX. A 4th-year student capstone project — not a commercial product. No mock data. No fabricated metrics.
                                </p>

                                <div className="flex flex-col sm:items-end gap-3">
                                    {/* Social links */}
                                    <motion.ul
                                        variants={footerListVariants}
                                        className="flex items-center gap-1 sm:justify-end"
                                        aria-label="Social links"
                                    >
                                        {[
                                            { label: "GitHub", href: "https://github.com", icon: "github" as const },
                                            { label: "LinkedIn", href: "https://linkedin.com", icon: "linkedin" as const },
                                            { label: "Twitter", href: "https://twitter.com", icon: "twitter" as const },
                                            { label: "Instagram", href: "https://instagram.com", icon: "instagram" as const },
                                        ].map((social) => {
                                            const IconComponent = FooterSocialIcons[social.icon];
                                            return (
                                                <motion.li variants={footerLinkVariants} key={social.label}>
                                                    <a
                                                        href={social.href}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        aria-label={social.label}
                                                        className="group relative flex size-9 items-center justify-center rounded-lg transition-[color,transform,background-color] duration-200 ease-out hover:opacity-100 active:scale-[0.94]"
                                                        style={{ color: isDark ? "#a1a1aa" : "#475569" }}
                                                    >
                                                        <IconComponent className="size-4 transition-[transform,filter] duration-200 ease-out group-hover:scale-110" />
                                                    </a>
                                                </motion.li>
                                            );
                                        })}
                                    </motion.ul>

                                    {/* Legal links */}
                                    <motion.ul
                                        variants={footerListVariants}
                                        className="flex flex-wrap items-center gap-x-5 gap-y-1 sm:justify-end"
                                    >
                                        {[
                                            { label: "MIT License", href: "#" },
                                            { label: "Privacy Policy", href: "#" },
                                            { label: "Security Disclosure", href: "#" },
                                            { label: "API Docs", href: "#" },
                                        ].map((link) => (
                                            <motion.li variants={footerLinkVariants} key={link.label}>
                                                <a
                                                    href={link.href}
                                                    className="inline-flex min-h-5 items-center text-xs font-normal transition-colors duration-200 ease-out hover:opacity-100"
                                                    style={{ color: isDark ? "rgba(161,161,170,0.8)" : "#64748b" }}
                                                >
                                                    {link.label}
                                                </a>
                                            </motion.li>
                                        ))}
                                    </motion.ul>
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>
                </footer>
            </div>
        </div>
    );
}