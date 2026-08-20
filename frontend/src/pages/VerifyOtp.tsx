import { useState, type FormEvent } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { apiClient } from "../api/client";

export function VerifyOtp() {
  const location = useLocation() as { state?: { email?: string } };
  const [email, setEmail] = useState(location.state?.email || "");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiClient.post("/api/auth/verify-otp", { email, code, purpose: "registration" });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 1200);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Verification failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass-panel-strong w-full max-w-sm p-8">
        <div className="mb-6 flex items-center gap-2">
          <ShieldCheck className="text-sx-blue" size={22} />
          <span className="text-lg font-semibold text-slate-100">Verify your account</span>
        </div>

        <p className="mb-4 text-xs text-slate-500">
          In development, the OTP is not emailed — check the terminal running{" "}
          <code className="text-slate-400">uvicorn app.main:app</code> for a line like{" "}
          <code className="text-slate-400">otp_issued_dev_mode ... code=482913</code>.
        </p>

        {success ? (
          <p className="text-sm text-emerald-400">Account verified. Redirecting to sign in…</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-black/20 px-3 py-2 text-sm text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sx-blue"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">6-digit code</label>
              <input
                required
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-black/20 px-3 py-2 text-center text-lg tracking-[0.5em] text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sx-blue"
              />
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-sx-blue/90 py-2 text-sm font-medium text-black transition-colors hover:bg-sx-blue disabled:opacity-50"
            >
              {submitting ? "Verifying…" : "Verify"}
            </button>
          </form>
        )}

        <p className="mt-4 text-center text-xs text-slate-500">
          <Link to="/login" className="text-sx-blue hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
