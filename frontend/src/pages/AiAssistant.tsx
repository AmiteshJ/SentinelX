import { useState, useEffect, useRef, useMemo, type FormEvent, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Sparkles,
  Send,
  User,
  Copy,
  Check,
  Terminal,
  Shield,
  ShieldAlert,
  Cpu,
  RefreshCw,
  Trash2,
  ArrowRight,
  Database,
  AlertCircle,
  FileText,
  CheckCircle2,
  ChevronDown,
  Info,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Zap,
  Plus,
  MessageSquare,
  MessageSquareText,
  PanelLeftClose,
  PanelLeft,
  Target,
  X,
} from "lucide-react";
import { DashboardShell } from "../components/layout/DashboardShell";
import { apiClient } from "../api/client";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  provider?: string;
  model?: string;
  timestamp: string;
}

interface ChatSession {
  id: string;
  title: string;
  incidentId: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

interface IncidentOption {
  id: string;
  title: string;
  severity: string;
  status: string;
}

const STORAGE_KEY = "sentinelx_ai_chat_sessions";
const ACTIVE_SESSION_KEY = "sentinelx_ai_active_session_id";

// ---------------------------------------------------------------------------
// Markdown Parser & Formatter for Cyber SOC LLM Responses
// ---------------------------------------------------------------------------
function formatInline(text: string): ReactNode[] {
  // Split by inline code: `code`
  const codeParts = text.split(/(`[^`]+`)/g);

  return codeParts.map((part, pIdx) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      const code = part.slice(1, -1);
      return (
        <code
          key={`code-${pIdx}`}
          className="rounded-md border border-cyan-500/25 bg-cyan-950/40 px-1.5 py-0.5 font-mono text-[11px] font-medium text-cyan-300"
        >
          {code}
        </code>
      );
    }

    // Split bold: **bold**
    const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
    return (
      <span key={`text-${pIdx}`}>
        {boldParts.map((bPart, bIdx) => {
          if (bPart.startsWith("**") && bPart.endsWith("**")) {
            const boldText = bPart.slice(2, -2);
            return (
              <strong key={`b-${bIdx}`} className="font-semibold text-slate-100">
                {boldText}
              </strong>
            );
          }
          return bPart;
        })}
      </span>
    );
  });
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-white/10 bg-[#070d18] shadow-lg">
      <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-[11px] font-mono">
        <span className="flex items-center gap-1.5 text-slate-400">
          <Terminal size={12} className="text-cyan-400" />
          {language || "code"}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <div className="overflow-x-auto p-3 text-xs leading-relaxed text-emerald-400 font-mono">
        <pre>{code}</pre>
      </div>
    </div>
  );
}

function MarkdownViewer({ content }: { content: string }) {
  const elements = useMemo(() => {
    const rawBlocks = content.split(/(```[\s\S]*?```)/g);
    const parsed: ReactNode[] = [];

    rawBlocks.forEach((block, bIdx) => {
      if (block.startsWith("```") && block.endsWith("```")) {
        const lines = block.slice(3, -3).trim().split("\n");
        const lang = lines[0]?.trim() || "bash";
        const code = lines.slice(1).join("\n");
        parsed.push(<CodeBlock key={`cb-${bIdx}`} code={code} language={lang} />);
      } else {
        const lines = block.split("\n");
        let listItems: ReactNode[] = [];

        const flushList = (lIdx: number) => {
          if (listItems.length > 0) {
            parsed.push(
              <ul key={`ul-${bIdx}-${lIdx}`} className="my-2 space-y-1.5 pl-4 list-disc marker:text-cyan-400 text-xs text-slate-300">
                {listItems}
              </ul>
            );
            listItems = [];
          }
        };

        lines.forEach((line, lIdx) => {
          const trimmed = line.trim();

          if (trimmed.startsWith("### ")) {
            flushList(lIdx);
            parsed.push(
              <h4 key={`h3-${bIdx}-${lIdx}`} className="mt-4 mb-2 text-sm font-bold text-white flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                {trimmed.replace(/^###\s+/, "")}
              </h4>
            );
          } else if (trimmed.startsWith("## ")) {
            flushList(lIdx);
            parsed.push(
              <h3 key={`h2-${bIdx}-${lIdx}`} className="mt-5 mb-2 text-base font-bold text-slate-100 border-b border-white/10 pb-1">
                {trimmed.replace(/^##\s+/, "")}
              </h3>
            );
          } else if (trimmed.startsWith("# ")) {
            flushList(lIdx);
            parsed.push(
              <h2 key={`h1-${bIdx}-${lIdx}`} className="mt-6 mb-2.5 text-lg font-bold text-white">
                {trimmed.replace(/^#\s+/, "")}
              </h2>
            );
          } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
            listItems.push(
              <li key={`li-${bIdx}-${lIdx}`} className="leading-relaxed">
                {formatInline(trimmed.replace(/^[-*]\s+/, ""))}
              </li>
            );
          } else if (/^\d+\.\s+/.test(trimmed)) {
            flushList(lIdx);
            parsed.push(
              <div key={`ol-${bIdx}-${lIdx}`} className="my-1.5 flex items-start gap-2 text-xs text-slate-300 leading-relaxed">
                <span className="font-mono font-bold text-cyan-400 shrink-0">
                  {trimmed.match(/^\d+\./)?.[0]}
                </span>
                <div>{formatInline(trimmed.replace(/^\d+\.\s+/, ""))}</div>
              </div>
            );
          } else if (trimmed.startsWith("> ")) {
            flushList(lIdx);
            parsed.push(
              <div
                key={`bq-${bIdx}-${lIdx}`}
                className="my-3 rounded-xl border-l-4 border-cyan-400 bg-cyan-950/20 px-3.5 py-2 text-xs text-slate-200"
              >
                {formatInline(trimmed.replace(/^>\s+/, ""))}
              </div>
            );
          } else if (trimmed.length > 0) {
            flushList(lIdx);
            parsed.push(
              <p key={`p-${bIdx}-${lIdx}`} className="my-2 text-xs leading-relaxed text-slate-300">
                {formatInline(trimmed)}
              </p>
            );
          } else {
            flushList(lIdx);
          }
        });

        flushList(lines.length);
      }
    });

    return parsed;
  }, [content]);

  return <div className="space-y-1">{elements}</div>;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export function AiAssistant() {
  const [searchParams] = useSearchParams();
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      // ignore
    }
    const initialId = `chat-${Date.now()}`;
    return [
      {
        id: initialId,
        title: "New Investigation",
        incidentId: "",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
      },
    ];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    const saved = localStorage.getItem(ACTIVE_SESSION_KEY);
    return saved || sessions[0]?.id || `chat-${Date.now()}`;
  });

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [incidents, setIncidents] = useState<IncidentOption[]>([]);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Active session
  const activeSession = useMemo(() => {
    return sessions.find((s) => s.id === activeSessionId) || sessions[0];
  }, [sessions, activeSessionId]);

  // Persist sessions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
      localStorage.setItem(ACTIVE_SESSION_KEY, activeSessionId);
    } catch (e) {
      // ignore storage quota errors
    }
  }, [sessions, activeSessionId]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession?.messages, loading]);

  // URL query pre-seed
  useEffect(() => {
    const promptParam = searchParams.get("prompt") || searchParams.get("q");
    if (promptParam) {
      setQuestion(promptParam);
    }
    const incParam = searchParams.get("incident_id");
    if (incParam && activeSession) {
      updateActiveIncidentId(incParam);
    }
  }, [searchParams]);

  // Load available incidents for context grounding dropdown
  useEffect(() => {
    async function loadIncidents() {
      try {
        const { data } = await apiClient.get("/api/incidents?limit=30");
        if (data?.items) {
          setIncidents(data.items);
        }
      } catch (e) {
        // Fallback silently if unavailable
      }
    }
    loadIncidents();
  }, []);

  function updateActiveIncidentId(incId: string) {
    setSessions((prev) =>
      prev.map((s) => (s.id === activeSessionId ? { ...s, incidentId: incId, updatedAt: Date.now() } : s))
    );
  }

  function handleCreateNewChat() {
    const newId = `chat-${Date.now()}`;
    const newSession: ChatSession = {
      id: newId,
      title: "New Investigation",
      incidentId: "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    };

    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newId);
    setQuestion("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function handleDeleteSession(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== id);
      if (filtered.length === 0) {
        const freshId = `chat-${Date.now()}`;
        const freshSession: ChatSession = {
          id: freshId,
          title: "New Investigation",
          incidentId: "",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: [],
        };
        setActiveSessionId(freshId);
        return [freshSession];
      }
      if (activeSessionId === id) {
        setActiveSessionId(filtered[0].id);
      }
      return filtered;
    });
  }

  function handleClearAllSessions() {
    const freshId = `chat-${Date.now()}`;
    const freshSession: ChatSession = {
      id: freshId,
      title: "New Investigation",
      incidentId: "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    };
    setSessions([freshSession]);
    setActiveSessionId(freshId);
  }

  async function handleAsk(e?: FormEvent) {
    if (e) e.preventDefault();
    if (!question.trim() || loading || !activeSession) return;

    const q = question.trim();
    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: "user",
      content: q,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    // Auto title chat session from first user question if it's currently default
    const newTitle =
      activeSession.messages.length === 0 && activeSession.title === "New Investigation"
        ? q.slice(0, 36) + (q.length > 36 ? "..." : "")
        : activeSession.title;

    // Append user message immediately
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId
          ? {
              ...s,
              title: newTitle,
              updatedAt: Date.now(),
              messages: [...s.messages, userMsg],
            }
          : s
      )
    );

    setQuestion("");
    setLoading(true);

    try {
      const { data } = await apiClient.post("/api/ai/ask", {
        question: q,
        incident_id: activeSession.incidentId || undefined,
      });

      const assistantMsg: ChatMessage = {
        id: `ast-${Date.now()}`,
        role: "assistant",
        content: data.answer || "No response received.",
        provider: data.provider || "groq",
        model: data.model || "llama-3.3-70b-versatile",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? {
                ...s,
                updatedAt: Date.now(),
                messages: [...s.messages, assistantMsg],
              }
            : s
        )
      );
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail ||
        (err?.response?.status === 401
          ? "Authentication required. Please log in to ask the AI SOC Assistant."
          : "AI provider service error. Please check backend LLM credentials.");

      const sysMsg: ChatMessage = {
        id: `sys-${Date.now()}`,
        role: "system",
        content: detail,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? {
                ...s,
                updatedAt: Date.now(),
                messages: [...s.messages, sysMsg],
              }
            : s
        )
      );
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  }

  function handleCopyMessage(id: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  }

  const QUICK_PROMPTS = [
    {
      title: "Triage Active Threats",
      desc: "Analyze recent high-severity anomalies & recommended mitigations",
      prompt: "Analyze our active incidents and telemetry stream. What are the highest priority threats right now, and what containment steps should we execute?",
      icon: ShieldAlert,
      badge: "TRIAGE",
      accent: "text-rose-400 border-rose-500/25 bg-rose-500/10",
    },
    {
      title: "MITRE ATT&CK Mapping",
      desc: "Map observed intrusion probes to adversary tactics and techniques",
      prompt: "Map the observed network intrusion probes (SSH brute force on Port 22 and port 4444 scans) to the MITRE ATT&CK enterprise matrix with tactic IDs.",
      icon: Target,
      badge: "HEATMAP",
      accent: "text-teal-400 border-teal-500/25 bg-teal-500/10",
    },
    {
      title: "Remediation Script",
      desc: "Generate automated PowerShell & Bash firewall containment rules",
      prompt: "Generate an automated PowerShell and Bash containment script to block malicious external IP 185.220.101.5 and drop unauthorized SSH brute-force traffic.",
      icon: Terminal,
      badge: "PLAYBOOK",
      accent: "text-cyan-400 border-cyan-500/25 bg-cyan-500/10",
    },
    {
      title: "Executive SOC Brief",
      desc: "High-level defensive posture, alert volumes & strategic actions",
      prompt: "Provide an executive-level summary of our platform's current defensive security posture, key alert indicators, and recommended SOC actions.",
      icon: FileText,
      badge: "EXECUTIVE",
      accent: "text-indigo-400 border-indigo-500/25 bg-indigo-500/10",
    },
  ];

  return (
    <>
      {/* Ambient background matching SentinelX Dark Theme */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#040810]">
        <div className="absolute inset-0 bg-gradient-to-b from-[#050b18] via-[#040810] to-[#020509]" />
        <div className="absolute top-1/4 -left-40 h-[520px] w-[520px] rounded-full bg-cyan-600/[0.08] blur-[150px]" />
        <div className="absolute -top-40 right-1/4 h-[560px] w-[560px] rounded-full bg-indigo-600/[0.07] blur-[160px]" />
      </div>

      <DashboardShell>
        {/* FULL VIEW CONTAINER (Edge-to-edge full width & height) */}
        <div className="w-full h-[calc(100vh-100px)] flex flex-row overflow-hidden rounded-3xl border border-white/10 bg-[#040812]/90 backdrop-blur-2xl shadow-[0_30px_70px_rgba(0,0,0,0.7)]">
          {/* ============================================================ */}
          {/* SIDEBAR: CHAT HISTORY (ChatGPT STYLE) */}
          {/* ============================================================ */}
          <AnimatePresence initial={false}>
            {sidebarOpen && (
              <motion.aside
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 280, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-20 flex h-full shrink-0 flex-col border-r border-white/10 bg-black/40 overflow-hidden"
              >
                {/* Sidebar Header & New Chat Button */}
                <div className="p-3.5 border-b border-white/10 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
                        <Bot size={15} />
                      </div>
                      <span className="text-xs font-bold text-white tracking-wide uppercase font-mono">
                        Chat History
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSidebarOpen(false)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                      title="Collapse Sidebar"
                    >
                      <PanelLeftClose size={15} />
                    </button>
                  </div>

                  {/* + New Investigation Button */}
                  <button
                    type="button"
                    onClick={handleCreateNewChat}
                    className="flex w-full items-center justify-center gap-2 rounded-full border border-cyan-500/35 bg-gradient-to-r from-cyan-500/20 via-sky-500/20 to-blue-500/20 py-2.5 px-4 text-xs font-semibold text-cyan-200 hover:text-white hover:from-cyan-500/30 hover:to-blue-500/30 transition-all shadow-sm cursor-pointer"
                  >
                    <Plus size={15} className="text-cyan-400" />
                    <span>New Investigation</span>
                  </button>
                </div>

                {/* Saved Chats Scrollable List */}
                <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
                  <div className="px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                    Investigations ({sessions.length})
                  </div>

                  {sessions.map((s) => {
                    const isActive = s.id === activeSessionId;
                    return (
                      <div
                        key={s.id}
                        onClick={() => setActiveSessionId(s.id)}
                        className={`group relative flex items-center justify-between rounded-2xl px-3 py-2.5 text-xs transition-all cursor-pointer ${
                          isActive
                            ? "bg-white/[0.09] text-white border border-cyan-500/35 shadow-[0_0_15px_rgba(6,182,212,0.1)] font-medium"
                            : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
                        }`}
                      >
                        {/* Active indicator bar */}
                        {isActive && (
                          <div className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r-full bg-cyan-400" />
                        )}

                        <div className="flex items-center gap-2.5 overflow-hidden pr-2">
                          <MessageSquare
                            size={14}
                            className={`shrink-0 ${isActive ? "text-cyan-400" : "text-slate-500 group-hover:text-slate-400"}`}
                          />
                          <div className="truncate">
                            <span className="block truncate text-xs leading-tight">{s.title}</span>
                            <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                              {s.messages.length} messages • {new Date(s.updatedAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                            </span>
                          </div>
                        </div>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSession(e, s.id)}
                          className="opacity-0 group-hover:opacity-100 flex h-6 w-6 items-center justify-center rounded-full text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all shrink-0 cursor-pointer"
                          title="Delete chat"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Sidebar Footer */}
                <div className="p-3 border-t border-white/10 bg-black/50 flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>Preserved locally</span>
                  <button
                    type="button"
                    onClick={handleClearAllSessions}
                    className="hover:text-rose-400 transition-colors text-[10px]"
                  >
                    Clear All
                  </button>
                </div>
              </motion.aside>
            )}
          </AnimatePresence>

          {/* ============================================================ */}
          {/* MAIN CHAT AREA (FULL VIEW) */}
          {/* ============================================================ */}
          <div className="relative flex flex-1 flex-col overflow-hidden">
            {/* Top Bar inside Workspace */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-black/30 px-6 py-3 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                {/* Toggle Sidebar Button */}
                {!sidebarOpen && (
                  <button
                    type="button"
                    onClick={() => setSidebarOpen(true)}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    title="Open History Sidebar"
                  >
                    <PanelLeft size={16} />
                  </button>
                )}

                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-white truncate max-w-xs sm:max-w-md">
                      {activeSession?.title || "AI SOC Assistant"}
                    </h2>
                    <span className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-2.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider text-cyan-300">
                      GROQ LLaMA 3.3 70B
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Grounded in real SOC facts, MITRE vectors, and live network telemetry
                  </p>
                </div>
              </div>

              {/* Context Grounding Incident Dropdown */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <select
                    value={activeSession?.incidentId || ""}
                    onChange={(e) => updateActiveIncidentId(e.target.value)}
                    className="appearance-none rounded-full border border-white/15 bg-white/[0.04] py-1.5 pl-4 pr-8 text-xs text-slate-200 outline-none hover:border-white/25 focus:border-cyan-400/60 max-w-xs truncate shadow-sm"
                  >
                    <option value="">🌐 Global SOC Telemetry Context</option>
                    {incidents.map((inc) => (
                      <option key={inc.id} value={inc.id}>
                        [{inc.severity.toUpperCase()}] {inc.title || `Incident #${inc.id.slice(-6)}`}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={13}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                </div>
              </div>
            </div>

            {/* Message Thread Scrollable Area (Fills entire width, no wasted side gaps) */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-5 space-y-6">
              {(!activeSession || activeSession.messages.length === 0) ? (
                /* Empty Welcome Screen */
                <div className="flex h-full flex-col items-center justify-center text-center my-auto py-8 max-w-4xl mx-auto w-full">
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.2)] mb-4">
                    <Bot size={36} />
                  </div>
                  <h2 className="text-xl font-bold text-white">How can I assist your investigation?</h2>
                  <p className="max-w-lg text-xs text-slate-400 mt-1 mb-8 leading-relaxed">
                    Ask questions about active alerts, generate mitigation playbooks, or cross-reference threats against the MITRE ATT&amp;CK matrix.
                  </p>

                  {/* Starter Chips (Spacious uncompressed ovular capsule styling) */}
                  <div className="grid w-full grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5 text-left">
                    {QUICK_PROMPTS.map((p) => {
                      const Icon = p.icon;
                      return (
                        <motion.button
                          key={p.title}
                          type="button"
                          whileHover={{ scale: 1.015, y: -2 }}
                          whileTap={{ scale: 0.985 }}
                          onClick={() => {
                            setQuestion(p.prompt);
                            inputRef.current?.focus();
                          }}
                          className="group relative flex items-center justify-between gap-4 sm:gap-5 rounded-[24px] border border-white/10 bg-[#091122]/75 hover:bg-[#0c1730]/95 hover:border-cyan-400/40 p-5 sm:p-6 transition-all duration-200 cursor-pointer shadow-lg backdrop-blur-md text-left min-h-[110px]"
                        >
                          <div className="flex items-center gap-4 sm:gap-4.5 min-w-0 flex-1">
                            <div className={`flex h-12 w-12 sm:h-13 sm:w-13 shrink-0 items-center justify-center rounded-2xl border ${p.accent} shadow-md group-hover:scale-105 transition-transform`}>
                              <Icon size={22} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                <span className="text-sm sm:text-[15px] font-semibold text-white group-hover:text-cyan-300 transition-colors">
                                  {p.title}
                                </span>
                                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[9px] font-mono tracking-wider text-slate-300 uppercase">
                                  {p.badge}
                                </span>
                              </div>
                              <p className="text-xs sm:text-[13px] text-slate-400 leading-relaxed group-hover:text-slate-300 transition-colors line-clamp-2">
                                {p.desc}
                              </p>
                            </div>
                          </div>
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-400 group-hover:border-cyan-400/40 group-hover:bg-cyan-500/10 group-hover:text-cyan-300 group-hover:translate-x-0.5 transition-all">
                            <ArrowRight size={15} />
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Messages (Full-width responsive layout) */
                <div className="w-full space-y-6">
                  {activeSession.messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex gap-3.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      {/* Assistant Avatar */}
                      {m.role === "assistant" && (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-cyan-500/30 bg-cyan-500/15 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)] mt-0.5">
                          <Bot size={19} />
                        </div>
                      )}

                      {/* System / Error Avatar */}
                      {m.role === "system" && (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/15 text-rose-400 mt-0.5">
                          <AlertCircle size={19} />
                        </div>
                      )}

                      {/* Message Bubble (Full width for assistant, comfortably right-aligned for user) */}
                      <div
                        className={`relative shadow-xl ${
                          m.role === "user"
                            ? "max-w-[85%] rounded-3xl rounded-tr-md px-5 py-3.5 bg-gradient-to-r from-sky-600/35 via-blue-600/30 to-indigo-600/35 border border-sky-400/30 text-white"
                            : m.role === "system"
                            ? "w-full max-w-[96%] rounded-3xl rounded-tl-md p-5 border border-rose-500/30 bg-rose-950/20 text-rose-200"
                            : "w-full max-w-[97%] rounded-3xl rounded-tl-md p-5 sm:p-6 border border-white/[0.08] bg-white/[0.025] text-slate-200 backdrop-blur-2xl"
                        }`}
                      >
                        {/* Assistant Header Info Bar */}
                        {m.role === "assistant" && (
                          <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3.5 text-[11px]">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-200 tracking-wide uppercase text-[10px] font-mono">
                                SentinelX Cyber Copilot
                              </span>
                              <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-0.5 font-mono text-[9px] font-semibold text-cyan-300">
                                {m.provider?.toUpperCase() || "GROQ"}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-400 font-mono">{m.timestamp}</span>
                              <button
                                type="button"
                                onClick={() => handleCopyMessage(m.id, m.content)}
                                className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                                title="Copy markdown"
                              >
                                {copiedMsgId === m.id ? (
                                  <>
                                    <Check size={11} className="text-emerald-400" />
                                    <span className="text-emerald-400 font-medium">Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy size={11} />
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Content Renderer */}
                        {m.role === "assistant" ? (
                          <MarkdownViewer content={m.content} />
                        ) : (
                          <div className="text-xs sm:text-[13px] leading-relaxed whitespace-pre-wrap">
                            {m.content}
                          </div>
                        )}

                        {/* User Timestamp */}
                        {m.role === "user" && (
                          <div className="mt-1.5 text-right text-[10px] text-slate-300/70 font-mono">
                            {m.timestamp}
                          </div>
                        )}
                      </div>

                      {/* User Avatar */}
                      {m.role === "user" && (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-sky-400/30 bg-sky-500/20 text-sky-200 mt-0.5">
                          <User size={19} />
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Thinking Indicator */}
                  {loading && (
                    <div className="flex items-start gap-3.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-cyan-500/30 bg-cyan-500/15 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)] animate-pulse">
                        <Bot size={19} />
                      </div>
                      <div className="rounded-full border border-cyan-500/30 bg-cyan-950/25 px-5 py-2.5 text-xs text-cyan-200 backdrop-blur-xl flex items-center gap-2.5 shadow-lg">
                        <Loader2 size={15} className="animate-spin text-cyan-400" />
                        <span className="font-mono text-[11px] tracking-wide">
                          Analyzing incident telemetry &amp; formulating response with Groq LLaMA 3.3...
                        </span>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* ============================================================ */}
            {/* FLOATING TYPING CAPSULE (CLEAN, OVULAR, AESTHETIC) */}
            {/* ============================================================ */}
            <div className="p-4 sm:p-5 bg-transparent flex flex-col items-center">
              <div className="w-full max-w-5xl">
                <form
                  onSubmit={handleAsk}
                  className="relative flex items-center rounded-full border border-white/20 bg-[#060c18]/90 backdrop-blur-3xl px-5 py-2 shadow-[0_15px_35px_rgba(0,0,0,0.8),0_0_20px_1px_rgba(6,182,212,0.15)] focus-within:border-cyan-400/70 focus-within:shadow-[0_0_25px_rgba(6,182,212,0.3)] transition-all"
                >
                  <textarea
                    ref={inputRef}
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    placeholder="Ask SentinelX Copilot (e.g. 'What is the root cause of this alert?' or 'Generate Sigma rule')..."
                    className="flex-1 resize-none bg-transparent py-1.5 pr-3 text-xs sm:text-sm text-white placeholder:text-slate-400 outline-none max-h-32 leading-relaxed"
                  />

                  <button
                    type="submit"
                    disabled={loading || !question.trim()}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-cyan-400 to-sky-400 text-slate-950 hover:scale-105 active:scale-95 transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)] disabled:opacity-30 disabled:hover:scale-100 cursor-pointer"
                    title="Send message (Enter)"
                  >
                    <Send size={15} />
                  </button>
                </form>

                <div className="mt-2 text-center text-[10px] font-mono text-slate-500">
                  Press <kbd className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-slate-400">Enter</kbd> to send, <kbd className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-slate-400">Shift + Enter</kbd> for newline • Zero fabrication policy
                </div>
              </div>
            </div>
          </div>
        </div>
      </DashboardShell>
    </>
  );
}
