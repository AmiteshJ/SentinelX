import React, { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { User, Mail, Phone, Lock, Eye, EyeOff, ShieldCheck, ArrowRight } from "lucide-react";
import { motion, type Variants } from "framer-motion";
import { apiClient } from "../api/client";
import { AuthWallpaper, type WallpaperSlide } from "../components/auth/AuthWallpaper";

// Custom Google SVG Icon
const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...props}>
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.16v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.16C1.43 8.55 1 10.22 1 12s.43 3.45 1.16 4.93l3.68-2.84z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.16 7.07l3.68 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

const REGISTER_SLIDES: WallpaperSlide[] = [
  {
    title: "Start defending with real telemetry.",
    tagline: "Live packet streams, correlation graphs, and zero-day neural models.",
  },
  {
    title: "End-to-end incident investigation.",
    tagline: "Unified timeline, asset mapping, and automated AI executive reporting.",
  },
  {
    title: "Cryptographic security by default.",
    tagline: "Server-enforced RBAC, OTP multi-factor, and tamper-evident audit trails.",
  },
];

export function Register() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.07,
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
      await apiClient.post("/api/auth/register", {
        full_name: fullName,
        email,
        contact_number: contactNumber,
        password,
      });
      navigate("/verify-otp", { state: { email } });
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Registration failed. Please check your details.");
    } finally {
      setSubmitting(false);
    }
  }

  const handleOAuthClick = (provider: string) => {
    setError(`${provider} signup is coming soon. Please complete registration with your credentials below.`);
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#050505] font-sans text-neutral-200 antialiased selection:bg-white/20 selection:text-white lg:flex-row">
      {/* Left Video Wallpaper Panel */}
      <AuthWallpaper slides={REGISTER_SLIDES} />

      {/* Right Form Panel */}
      <div className="flex w-full flex-col items-center justify-center p-6 sm:p-10 lg:w-1/2">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-[420px]"
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
          <motion.div variants={itemVariants} className="mb-6 text-center">
            <h2 className="text-3xl leading-tight font-medium tracking-tight text-balance text-white md:text-[36px]">
              Create your defense
              <br />
              workspace{" "}
              <span className="font-serif font-light italic text-sx-blue">faster.</span>
            </h2>
            <p className="mt-2 text-xs text-neutral-400">
              Set up your SOC account and start monitoring telemetry immediately.
            </p>
          </motion.div>

          {/* Centered Google Button (Apple button removed) */}
          <motion.div
            variants={itemVariants}
            className="mb-5 flex justify-center"
          >
            <button
              type="button"
              onClick={() => handleOAuthClick("Google")}
              className="w-full flex items-center justify-center gap-2.5 rounded-full border border-white/10 bg-[#141414] py-2.5 text-[13px] font-medium text-white transition-all hover:bg-[#1f1f1f] hover:border-white/20 active:scale-[0.96] cursor-pointer shadow-sm"
            >
              <GoogleIcon className="text-[17px]" />
              <span>Continue with Google</span>
            </button>
          </motion.div>

          {/* Divider */}
          <motion.div
            variants={itemVariants}
            className="relative mb-5 flex items-center"
          >
            <div className="grow border-t border-white/10"></div>
            <span className="px-4 text-[11px] font-medium tracking-wider text-neutral-500 uppercase">
              Or sign up with email
            </span>
            <div className="grow border-t border-white/10"></div>
          </motion.div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            {/* Full Name */}
            <motion.div variants={itemVariants} className="flex flex-col gap-1">
              <label
                htmlFor="fullName"
                className="text-xs font-medium text-neutral-300"
              >
                Full name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                  <User size={15} />
                </div>
                <input
                  id="fullName"
                  type="text"
                  required
                  placeholder="Alex Mercer"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-[14px] border border-white/10 bg-[#0A0A0A] pl-10 pr-4 py-2.5 text-sm text-white transition-colors placeholder:text-neutral-500 focus:border-neutral-400 focus:bg-[#111] focus:ring-1 focus:ring-neutral-400 focus:outline-none"
                />
              </div>
            </motion.div>

            {/* Email */}
            <motion.div variants={itemVariants} className="flex flex-col gap-1">
              <label
                htmlFor="email"
                className="text-xs font-medium text-neutral-300"
              >
                Work email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                  <Mail size={15} />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="alex@enterprise.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-[14px] border border-white/10 bg-[#0A0A0A] pl-10 pr-4 py-2.5 text-sm text-white transition-colors placeholder:text-neutral-500 focus:border-neutral-400 focus:bg-[#111] focus:ring-1 focus:ring-neutral-400 focus:outline-none"
                />
              </div>
            </motion.div>

            {/* Contact Number */}
            <motion.div variants={itemVariants} className="flex flex-col gap-1">
              <label
                htmlFor="contactNumber"
                className="text-xs font-medium text-neutral-300"
              >
                Contact number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                  <Phone size={15} />
                </div>
                <input
                  id="contactNumber"
                  type="tel"
                  required
                  placeholder="+1 (555) 019-2834"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  className="w-full rounded-[14px] border border-white/10 bg-[#0A0A0A] pl-10 pr-4 py-2.5 text-sm text-white transition-colors placeholder:text-neutral-500 focus:border-neutral-400 focus:bg-[#111] focus:ring-1 focus:ring-neutral-400 focus:outline-none"
                />
              </div>
            </motion.div>

            {/* Password */}
            <motion.div variants={itemVariants} className="flex flex-col gap-1">
              <label
                htmlFor="password"
                className="text-xs font-medium text-neutral-300"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                  <Lock size={15} />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  placeholder="Minimum 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-[14px] border border-white/10 bg-[#0A0A0A] pl-10 pr-10 py-2.5 text-sm text-white transition-colors placeholder:text-neutral-500 focus:border-neutral-400 focus:bg-[#111] focus:ring-1 focus:ring-neutral-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-500 hover:text-neutral-200 transition-colors cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
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

            {/* Submit Button */}
            <motion.div variants={itemVariants} className="mt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-full bg-[#EAEAEA] py-3.5 text-sm font-semibold text-black shadow-[0_0_20px_rgba(255,255,255,0.06)] transition-all hover:bg-white active:scale-[0.96] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
              >
                <span>{submitting ? "Creating account..." : "Create account"}</span>
                {!submitting && <ArrowRight size={14} />}
              </button>
            </motion.div>
          </form>

          {/* Footer Link */}
          <motion.div
            variants={itemVariants}
            className="mt-6 text-center text-[13px] text-neutral-400"
          >
            Already have an account?{" "}
            <Link to="/login" className="font-bold text-white hover:underline">
              Log in
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
