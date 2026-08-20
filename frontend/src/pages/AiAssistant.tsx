import { useState, type FormEvent } from "react";
import { DashboardShell } from "../components/layout/DashboardShell";
import { apiClient } from "../api/client";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export function AiAssistant() {
  const [incidentId, setIncidentId] = useState("");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleAsk(e: FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    const q = question;
    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setQuestion("");
    setLoading(true);
    try {
      const { data } = await apiClient.post("/api/ai/ask", {
        question: q,
        incident_id: incidentId || undefined,
      });
      setMessages((prev) => [...prev, { role: "assistant", content: `[${data.provider}] ${data.answer}` }]);
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail ||
        (err?.response?.status === 401
          ? "Authentication required. Please log in to ask the AI SOC Assistant."
          : "AI provider error. Please check backend configuration.");
      setMessages((prev) => [...prev, { role: "system", content: detail }]);
    } finally {
      setLoading(false);
    }
  }


  return (
    <DashboardShell>
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-slate-100">AI SOC Assistant</h1>
        <p className="text-sm text-slate-500">
          Context-grounded incident Q&amp;A (Groq primary, local Ollama fallback). Answers are
          restricted to real incident/alert/knowledge-base facts — never fabricated.
        </p>
      </div>

      <div className="glass-panel mb-4 p-4">
        <label className="mb-1 block text-xs font-medium text-slate-400">
          Incident ID (optional — grounds the answer in a specific incident)
        </label>
        <input
          value={incidentId}
          onChange={(e) => setIncidentId(e.target.value)}
          placeholder="e.g. a UUID from Security Operations"
          className="w-full rounded-lg border border-slate-700 bg-black/20 px-3 py-2 text-xs text-slate-100"
        />
      </div>

      <div className="glass-panel mb-4 flex h-96 flex-col p-4">
        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          {messages.length === 0 && (
            <p className="text-xs text-slate-500">
              Ask something like "Summarize this incident" or "What MITRE techniques are involved?"
            </p>
          )}
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`max-w-[85%] rounded-xl px-3 py-2 text-xs ${
                m.role === "user"
                  ? "ml-auto bg-sx-blue/20 text-slate-100"
                  : m.role === "system"
                    ? "bg-red-500/10 text-red-300"
                    : "bg-white/5 text-slate-200"
              }`}
            >
              {m.content}
            </div>
          ))}
          {loading && <div className="text-xs text-slate-500">Thinking…</div>}
        </div>
      </div>

      <form onSubmit={handleAsk} className="flex gap-2">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask the SOC assistant…"
          className="flex-1 rounded-lg border border-slate-700 bg-black/20 px-3 py-2 text-sm text-slate-100"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-sx-blue/90 px-4 py-2 text-sm font-medium text-black hover:bg-sx-blue disabled:opacity-50"
        >
          Ask
        </button>
      </form>
    </DashboardShell>
  );
}
