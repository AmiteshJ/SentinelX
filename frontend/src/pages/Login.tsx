import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { apiClient } from "../api/client";
import { useAuthStore } from "../store/authStore";
import fluidCubeDarkImg from "../assets/fluid_cube_dark.jpg";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const setUser = useAuthStore((s) => s.setUser);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { data } = await apiClient.post("/api/auth/login", { email, password });
      setSession(data.access_token, data.refresh_token);
      const me = await apiClient.get("/api/auth/me", {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });
      setUser(me.data);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Invalid credentials. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 md:p-10 bg-[#05070a] relative overflow-hidden font-sans">
      {/* Dark ambient glow effects */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[400px] bg-sx-blue/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[400px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(1200px_600px_at_15%_-10%,rgba(58,160,255,0.07),transparent_60%)] pointer-events-none" />

      {/* Main Container Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="w-full max-w-[940px] bg-[#0b0f19]/90 backdrop-blur-2xl rounded-2xl md:rounded-[32px] shadow-[0_25px_70px_rgba(0,0,0,0.8),0_0_40px_rgba(58,160,255,0.06)] overflow-hidden flex flex-col md:flex-row relative z-10 border border-white/10 min-h-[580px]"
      >
        {/* Left Form Section */}
        <div className="w-full md:w-[48%] lg:w-[46%] p-8 sm:p-10 lg:p-12 flex flex-col justify-between bg-[#0b0f19]/80 md:bg-transparent z-10">
          <div>
            {/* Logo & Header */}
            <div className="mb-8">
              <Link to="/" className="inline-flex items-center gap-2 mb-6 group">
                <div className="w-8 h-8 rounded-lg bg-sx-blue/15 border border-sx-blue/30 flex items-center justify-center text-sx-blue group-hover:bg-sx-blue/25 transition-colors">
                  <ShieldCheck size={20} className="text-sx-blue" />
                </div>
                <span className="text-base font-bold tracking-tight text-white">
                  Sentinel<span className="text-sx-blue">X</span>
                </span>
              </Link>

              <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-slate-100 leading-tight">
                Welcome to SentinelX
              </h1>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail size={16} />
                  </div>
                  <input
                    type="email"
                    required
                    placeholder="yatingzang0215@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-[#131926]/90 border border-slate-700/80 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sx-blue/25 focus:border-sx-blue transition-all shadow-inner"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock size={16} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 text-sm bg-[#131926]/90 border border-slate-700/80 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sx-blue/25 focus:border-sx-blue transition-all shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 bg-sx-blue hover:bg-sx-blue-glow active:scale-[0.99] text-[#04101f] text-sm font-semibold rounded-lg shadow-[0_0_20px_rgba(58,160,255,0.25)] hover:shadow-[0_0_25px_rgba(95,194,255,0.4)] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {submitting ? "Signing in..." : "Login"}
              </button>

              <div className="pt-1">
                <p className="text-xs text-slate-400">
                  Don't have an account?{" "}
                  <Link
                    to="/register"
                    className="text-sx-blue hover:text-sx-blue-glow font-semibold hover:underline"
                  >
                    Sign Up!
                  </Link>
                </p>
              </div>
            </form>
          </div>

          {/* Bottom Divider & Feature/FAQ Note */}
          <div className="pt-8">
            <div className="border-t border-slate-800/80 pt-5 mb-3">
              <div className="flex items-start gap-2.5 mb-1.5">
                <div className="mt-0.5 w-4 h-4 rounded-full bg-sx-blue/15 border border-sx-blue/30 text-sx-blue flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold">?</span>
                </div>
                <h2 className="text-xs font-bold text-slate-200">
                  Can you change your plan?
                </h2>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed pl-6">
                Whenever you want. SentinelX will also change with you according to your needs.
              </p>
            </div>

            <div className="pl-6">
              <Link
                to="/"
                className="text-xs font-semibold text-sx-blue hover:text-sx-blue-glow hover:underline"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </div>

        {/* Right Artwork Panel */}
        <div className="relative hidden md:flex flex-1 items-center justify-center bg-gradient-to-br from-[#0c1322] via-[#080d17] to-[#04070e] rounded-tl-[70px] lg:rounded-tl-[95px] overflow-hidden p-8 border-l border-white/5 select-none">
          {/* Glowing radial ambiance behind cube */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(58,160,255,0.12)_0%,transparent_70%)] pointer-events-none" />

          {/* 3D Dark Fluid Cube Visual */}
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            whileHover={{ y: -6, transition: { duration: 0.3 } }}
            className="relative w-full max-w-[340px] aspect-square flex items-center justify-center"
          >
            <img
              src={fluidCubeDarkImg}
              alt="3D Fluid Cube"
              className="w-full h-full object-contain filter drop-shadow-[0_0_35px_rgba(58,160,255,0.28)]"
            />
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}


