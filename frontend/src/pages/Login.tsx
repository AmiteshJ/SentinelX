import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { apiClient } from "../api/client";
import { useAuthStore } from "../store/authStore";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      setError(err?.response?.data?.detail || "Login failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass-panel-strong w-full max-w-sm p-8">
        <div className="mb-6 flex items-center gap-2">
          <ShieldCheck className="text-sx-blue" size={22} />
          <span className="text-lg font-semibold text-slate-100">SentinelX</span>
        </div>

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
            <label className="mb-1 block text-xs font-medium text-slate-400">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-black/20 px-3 py-2 text-sm text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sx-blue"
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-sx-blue/90 py-2 text-sm font-medium text-black transition-colors hover:bg-sx-blue disabled:opacity-50"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-500">
          No account?{" "}
          <Link to="/register" className="text-sx-blue hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
