import { Navigate, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "./theme/ThemeProvider";
import { Home } from "./pages/Home";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { VerifyOtp } from "./pages/VerifyOtp";
import { Dashboard } from "./pages/Dashboard";
import { SecurityOperations } from "./pages/SecurityOperations";
import { ThreatIntelligence } from "./pages/ThreatIntelligence";
import { AiAssistant } from "./pages/AiAssistant";
import { ZeroDayDetection } from "./pages/ZeroDayDetection";
import { Investigation } from "./pages/Investigation";
import { CaseManagement } from "./pages/CaseManagement";
import { Reports } from "./pages/Reports";
import { Settings } from "./pages/Settings";
import { AuditLogs } from "./pages/AuditLogs";
import { ComingSoon } from "./pages/ComingSoon";
import { useAuthStore } from "./store/authStore";
import type { JSX } from "react";

function RequireAuth({ children }: { children: JSX.Element }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  return accessToken ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <ThemeProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />

        <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />

        <Route path="/security-operations" element={<RequireAuth><SecurityOperations /></RequireAuth>} />
        <Route path="/threat-detection" element={<RequireAuth><ComingSoon title="Threat Detection" phase="rule engine + Isolation Forest run server-side; a dedicated management UI is pending" /></RequireAuth>} />
        <Route path="/zero-day" element={<RequireAuth><ZeroDayDetection /></RequireAuth>} />
        <Route path="/threat-intelligence" element={<RequireAuth><ThreatIntelligence /></RequireAuth>} />
        <Route path="/investigation" element={<RequireAuth><Investigation /></RequireAuth>} />
        <Route path="/ai-assistant" element={<RequireAuth><AiAssistant /></RequireAuth>} />
        <Route path="/reports" element={<RequireAuth><Reports /></RequireAuth>} />
        <Route path="/cases" element={<RequireAuth><CaseManagement /></RequireAuth>} />
        <Route path="/knowledge-base" element={<RequireAuth><ComingSoon title="Knowledge Base" phase="Phase 16 — RAG/pgvector backend implemented; document-upload UI pending" /></RequireAuth>} />
        <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
        <Route path="/audit-logs" element={<RequireAuth><AuditLogs /></RequireAuth>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ThemeProvider>
  );
}