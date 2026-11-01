import React, { useState, type FormEvent } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { Mail, KeyRound, ShieldCheck, CheckCircle2, ArrowRight } from "lucide-react";
import { motion, type Variants } from "framer-motion";
import { apiClient } from "../api/client";
import { AuthWallpaper } from "../components/auth/AuthWallpaper";
import { resolveImageUrl, HERO_BACKGROUND_WALLPAPER } from "./Home";

export function VerifyOtp() {
  const location = useLocation() as { state?: { email?: string } };
  const [email, setEmail] = useState(location.state?.email || "");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 24,
      },
    },
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiClient.post("/api/auth/verify-otp", { email, code, purpose: "registration" });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 1200);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Verification failed. Please check the code.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#050505] font-sans text-neutral-200 antialiased selection:bg-white/20 selection:text-white lg:flex-row">
      {/* Left Video Wallpaper Panel */}
      <AuthWallpaper
        title="Cryptographic verification."
        tagline="Zero-trust authentication ensuring every session is cryptographically bound and tamper-proof."
      />

      {/* Right Form Panel with Glassmorphism and Blurred Home Wallpaper */}
      <div className="relative flex w-full flex-col items-center justify-center p-6 sm:p-12 lg:w-1/2 overflow-hidden">
        {/* Blurred Home Wallpaper Background */}
        <div className="pointer-events-none absolute inset-0 select-none overflow-hidden">
          <img
            src={resolveImageUrl(HERO_BACKGROUND_WALLPAPER)}
            alt="Atmospheric Background"
            className="h-full w-full object-cover scale-110 filter blur-2xl opacity-40 brightness-75"
          />
          {/* Frosted Glassmorphism Layer Above Wallpaper */}
          <div className="absolute inset-0 bg-[#070707]/75 backdrop-blur-3xl" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-[#050505]/70" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(58,160,255,0.08)_0%,transparent_65%)]" />
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative z-10 w-full max-w-[400px]"
        >
          {/* Mobile Header / Brand Logo */}
          <motion.div variants={itemVariants} className="lg:hidden mb-6 flex justify-center">
            <Link to="/" className="inline-flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-sx-blue/15 border border-sx-blue/30 flex items-center justify-center text-sx-blue">
                <ShieldCheck size={18} />
              </div>
              <span className="text-base font-bold tracking-tight text-white">
                Sentinel<span className="text-sx-blue">X</span>
              </span>
            </Link>
          </motion.div>

          {/* Titles */}
          <motion.div variants={itemVariants} className="mb-8 text-center">
            <h2 className="text-3xl leading-tight font-medium tracking-tight text-balance text-white md:text-[36px]">
              Verify your security
              <br />
              access{" "}
              <span className="font-serif font-light italic text-sx-blue">code.</span>
            </h2>
            <p className="mt-2 text-xs text-neutral-400">
              Enter the 6-digit confirmation code dispatched to your email address.
            </p>
          </motion.div>

          {success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-center space-y-3"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 size={28} />
              </div>
              <h3 className="text-base font-semibold text-emerald-300">Account verified successfully!</h3>
              <p className="text-xs text-emerald-400/80">Redirecting you to sign in...</p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Email */}
              <motion.div variants={itemVariants} className="flex flex-col gap-1.5">
                <label
                  htmlFor="email"
                  className="text-xs font-medium text-neutral-300"
                >
                  Email address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                    <Mail size={16} />
                  </div>
                  <input
                    id="email"
                    type="email"
                    required
                    placeholder="alex@enterprise.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-[14px] border border-white/10 bg-black/40 backdrop-blur-md pl-10 pr-4 py-3 text-sm text-white transition-colors placeholder:text-neutral-500 focus:border-white/30 focus:bg-black/60 focus:ring-1 focus:ring-white/20 focus:outline-none"
                  />
                </div>
              </motion.div>

              {/* 6-Digit OTP */}
              <motion.div variants={itemVariants} className="flex flex-col gap-1.5">
                <label
                  htmlFor="code"
                  className="text-xs font-medium text-neutral-300"
                >
                  6-digit verification code
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                    <KeyRound size={16} />
                  </div>
                  <input
                    id="code"
                    type="text"
                    required
                    maxLength={6}
                    placeholder="• • • • • •"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full rounded-[14px] border border-white/10 bg-black/40 backdrop-blur-md pl-10 pr-4 py-3 text-center tracking-[0.35em] text-lg font-mono text-white transition-colors placeholder:text-neutral-500 focus:border-white/30 focus:bg-black/60 focus:ring-1 focus:ring-white/20 focus:outline-none"
                  />
                </div>
              </motion.div>

              {/* Error Banner */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs flex items-center gap-2"
                >
                  <span>{error}</span>
                </motion.div>
              )}

              {/* Verify Button */}
              <motion.div variants={itemVariants} className="mt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-full bg-[#EAEAEA] py-3.5 text-sm font-semibold text-black shadow-[0_0_20px_rgba(255,255,255,0.06)] transition-all hover:bg-white active:scale-[0.96] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>{submitting ? "Verifying..." : "Verify Code"}</span>
                  {!submitting && <ArrowRight size={14} />}
                </button>
              </motion.div>
            </form>
          )}

          {/* Back Link & Hint */}
          <motion.div
            variants={itemVariants}
            className="mt-8 space-y-4 text-center text-xs text-neutral-400"
          >
            <div>
              <Link
                to="/login"
                className="font-bold text-white hover:underline inline-flex items-center gap-1"
              >
                ← Back to sign in
              </Link>
            </div>

            <div className="border-t border-white/10 pt-4 text-[11px] text-neutral-500">
              In development mode, check your backend uvicorn terminal console for the generated simulated OTP code.
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
