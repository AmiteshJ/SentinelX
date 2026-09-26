import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Database,
  Search,
  UploadCloud,
  FileText,
  Trash2,
  Eye,
  Sparkles,
  Plus,
  RefreshCw,
  Layers,
  Cpu,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  X,
  FileCode,
  Shield,
  HelpCircle,
  ExternalLink,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DashboardShell } from "../components/layout/DashboardShell";
import { knowledgeApi } from "../api/knowledge";
import type {
  KnowledgeStats,
  KnowledgeDocument,
  KnowledgeChunk,
  SemanticSearchResult,
} from "../types/api";

export function KnowledgeBase() {
  const navigate = useNavigate();

  // Core State
  const [stats, setStats] = useState<KnowledgeStats | null>(null);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Filter & Search in Table
  const [searchFilter, setSearchFilter] = useState("");
  const [selectedSource, setSelectedSource] = useState<string>("all");

  // Semantic Vector Search Sandbox State
  const [testQuery, setTestQuery] = useState("");
  const [topK, setTopK] = useState(4);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SemanticSearchResult[] | null>(null);

  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showChunkModal, setShowChunkModal] = useState(false);
  const [selectedDocTitle, setSelectedDocTitle] = useState<string | null>(null);
  const [inspectChunks, setInspectChunks] = useState<KnowledgeChunk[]>([]);
  const [loadingChunks, setLoadingChunks] = useState(false);

  // Ingest Form State
  const [modalTab, setModalTab] = useState<"upload" | "manual">("upload");
  const [manualTitle, setManualTitle] = useState("");
  const [manualSource, setManualSource] = useState("playbook");
  const [manualContent, setManualContent] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadSource, setUploadSource] = useState("internal_doc");
  const [submitting, setSubmitting] = useState(false);

  // Seeding State
  const [seeding, setSeeding] = useState(false);

  // Load Data
  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [statsData, docsData] = await Promise.all([
        knowledgeApi.getStats(),
        knowledgeApi.listDocuments(),
      ]);
      setStats(statsData);
      setDocuments(docsData);
    } catch (err: any) {
      console.error("Failed to load knowledge base:", err);
      setActionMessage({
        type: "error",
        text: err?.response?.data?.detail || "Failed to connect to pgvector store.",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Documents
  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch =
        doc.document_title.toLowerCase().includes(searchFilter.toLowerCase()) ||
        doc.source.toLowerCase().includes(searchFilter.toLowerCase());
      const matchesSource =
        selectedSource === "all" || doc.source.toLowerCase() === selectedSource.toLowerCase();
      return matchesSearch && matchesSource;
    });
  }, [documents, searchFilter, selectedSource]);

  // Execute Vector Search
  const handleVectorSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testQuery.trim()) return;

    setSearching(true);
    try {
      const res = await knowledgeApi.search(testQuery, topK);
      setSearchResults(res.results);
    } catch (err: any) {
      setActionMessage({
        type: "error",
        text: err?.response?.data?.detail || "Vector similarity search failed.",
      });
    } finally {
      setSearching(false);
    }
  };

  // Inspect Chunks
  const handleInspectDoc = async (title: string) => {
    setSelectedDocTitle(title);
    setShowChunkModal(true);
    setLoadingChunks(true);
    try {
      const chunks = await knowledgeApi.getChunks(title);
      setInspectChunks(chunks);
    } catch (err: any) {
      setActionMessage({
        type: "error",
        text: err?.response?.data?.detail || "Failed to load document chunks.",
      });
    } finally {
      setLoadingChunks(false);
    }
  };

  // Delete Document
  const handleDeleteDoc = async (title: string) => {
    if (!window.confirm(`Are you sure you want to purge "${title}" and all its vector embeddings from pgvector?`)) {
      return;
    }

    try {
      const res = await knowledgeApi.deleteDocument(title);
      setActionMessage({
        type: "success",
        text: `Purged "${title}" (${res.chunks_deleted} vector chunks deleted).`,
      });
      loadData(true);
    } catch (err: any) {
      setActionMessage({
        type: "error",
        text: err?.response?.data?.detail || "Failed to delete document.",
      });
    }
  };

  // Seed Default Playbooks
  const handleSeedDefaults = async () => {
    setSeeding(true);
    try {
      const res = await knowledgeApi.seedDefaults();
      setActionMessage({
        type: "success",
        text: res.message,
      });
      await loadData(true);
    } catch (err: any) {
      setActionMessage({
        type: "error",
        text: err?.response?.data?.detail || "Failed to seed default playbooks.",
      });
    } finally {
      setSeeding(false);
    }
  };

  // Handle Manual Ingestion
  const handleManualIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle.trim() || !manualContent.trim()) return;

    setSubmitting(true);
    try {
      const res = await knowledgeApi.ingestDocument({
        title: manualTitle.trim(),
        source: manualSource,
        content: manualContent.trim(),
      });
      setActionMessage({
        type: "success",
        text: res.message,
      });
      setShowUploadModal(false);
      setManualTitle("");
      setManualContent("");
      await loadData(true);
    } catch (err: any) {
      setActionMessage({
        type: "error",
        text: err?.response?.data?.detail || "Ingestion failed.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle File Upload Ingestion
  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setSubmitting(true);
    try {
      const res = await knowledgeApi.uploadFile(
        uploadFile,
        uploadTitle.trim() || undefined,
        uploadSource
      );
      setActionMessage({
        type: "success",
        text: res.message,
      });
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadTitle("");
      await loadData(true);
    } catch (err: any) {
      setActionMessage({
        type: "error",
        text: err?.response?.data?.detail || "File upload failed.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Estimated chunks calculation for manual content
  const estimatedChunks = useMemo(() => {
    if (!manualContent.trim()) return 0;
    const len = manualContent.trim().length;
    // 800 char chunk with 100 overlap ~ effective step 700 chars
    return Math.max(1, Math.ceil(len / 700));
  }, [manualContent]);

  return (
    <DashboardShell>
      <div className="space-y-6 pb-12">
        {/* Header Section */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <BookOpen size={18} />
              </span>
              <h1 className="text-xl font-bold tracking-tight text-slate-100 sm:text-2xl">
                RAG Knowledge Base &amp; Vector Store
              </h1>
            </div>
            <p className="mt-1 text-xs text-slate-400 sm:text-sm">
              Vectorized threat intelligence, MITRE SOPs, and incident playbooks indexed in PostgreSQL (pgvector).
              Provides zero-hallucination factual grounding for the Groq AI SOC Assistant.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
            >
              <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>

            <button
              onClick={handleSeedDefaults}
              disabled={seeding}
              className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-900/40 hover:border-emerald-500/50 transition-colors shadow-sm cursor-pointer"
              title="Pre-load MITRE T1059, Reverse Shell, Ransomware, and Zero-Day SOPs"
            >
              <Sparkles size={13} className={seeding ? "animate-spin" : "text-emerald-400"} />
              {seeding ? "Seeding Vectors..." : "Seed SOC Playbooks"}
            </button>

            <button
              onClick={() => {
                setShowUploadModal(true);
                setModalTab("upload");
              }}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/25 hover:bg-indigo-500 transition-colors cursor-pointer"
            >
              <Plus size={14} />
              Ingest Document
            </button>
          </div>
        </div>

        {/* Global Action Message Banner */}
        <AnimatePresence>
          {actionMessage && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className={`flex items-center justify-between rounded-xl border p-3.5 text-xs font-medium ${
                actionMessage.type === "success"
                  ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
                  : "border-red-500/30 bg-red-950/20 text-red-300 shadow-[0_0_20px_rgba(239,68,68,0.1)]"
              }`}
            >
              <div className="flex items-center gap-2">
                {actionMessage.type === "success" ? (
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle size={16} className="text-red-400 shrink-0" />
                )}
                <span>{actionMessage.text}</span>
              </div>
              <button
                onClick={() => setActionMessage(null)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hardware & Vector Engine Telemetry Cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-4 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Total Indexed Documents</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                <FileText size={15} />
              </span>
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-100">
              {stats ? stats.total_documents : "--"}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-400" />
              <span>{stats ? `${stats.total_sources} categories` : "Loading..."}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-4 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Vector Embeddings</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                <Layers size={15} />
              </span>
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-100">
              {stats ? stats.total_chunks : "--"}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-400" />
              <span>{stats ? `${stats.vector_dimension}-dimensional vectors` : "384-dim"}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-4 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Active Embedding Model</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <Cpu size={15} />
              </span>
            </div>
            <div className="mt-2 text-sm font-bold text-slate-100 truncate" title={stats?.embedding_model}>
              {stats ? stats.embedding_model.split(" ")[0] : "all-MiniLM-L6-v2"}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span>Online &bull; SentenceTransformer</span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-4 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Vector Store &amp; Index</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                <Database size={15} />
              </span>
            </div>
            <div className="mt-2 text-sm font-bold text-slate-100">
              PostgreSQL (Neon)
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
              <span>pgvector IVFFlat (Cosine Ops)</span>
            </div>
          </div>
        </div>

        {/* Semantic Search & Vector Retrieval Sandbox */}
        <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-b from-indigo-950/20 to-slate-900/60 p-5 backdrop-blur-xl shadow-xl">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-white/[0.08] pb-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded bg-indigo-500/20 text-indigo-400">
                <Search size={14} />
              </span>
              <h2 className="text-sm font-semibold text-slate-100">
                Interactive Vector Search Sandbox
              </h2>
            </div>
            <span className="text-[11px] text-slate-400">
              Tests cosine similarity directly against the 384-dim pgvector index
            </span>
          </div>

          <form onSubmit={handleVectorSearch} className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={testQuery}
                onChange={(e) => setTestQuery(e.target.value)}
                placeholder="Ask a technical question (e.g., 'What steps should I take if port 4444 is beaconing?' or 'Ransomware containment checklist')"
                className="w-full rounded-xl border border-slate-700 bg-black/40 py-2.5 pl-9 pr-4 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={topK}
                onChange={(e) => setTopK(Number(e.target.value))}
                className="rounded-xl border border-slate-700 bg-black/40 px-3 py-2.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
              >
                <option value={3}>Top 3</option>
                <option value={5}>Top 5</option>
                <option value={8}>Top 8</option>
              </select>

              <button
                type="submit"
                disabled={searching || !testQuery.trim()}
                className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 disabled:opacity-50 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {searching ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Sparkles size={13} />
                    Run Vector Query
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Sandbox Query Chips */}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
            <span className="font-medium text-slate-500">Quick Test Prompts:</span>
            {[
              "How to contain reverse shell on port 4444?",
              "What command line arguments indicate T1059 script abuse?",
              "Ransomware rapid containment steps",
              "Zero-day anomaly triage workflow",
            ].map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => setTestQuery(prompt)}
                className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-slate-300 hover:border-indigo-500/40 hover:bg-indigo-500/10 hover:text-white transition-colors cursor-pointer"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Search Results Display */}
          {searchResults && (
            <div className="mt-4 pt-4 border-t border-white/[0.08]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-slate-300">
                  Retrieved {searchResults.length} matching chunks for: <span className="text-indigo-400 italic font-mono">"{testQuery}"</span>
                </span>
                <button
                  onClick={() => setSearchResults(null)}
                  className="text-[11px] text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  Clear results
                </button>
              </div>

              {searchResults.length === 0 ? (
                <div className="rounded-xl border border-white/5 bg-black/20 p-6 text-center text-xs text-slate-400">
                  No vectors matched this query. Try lowering Top-K or seeding default playbooks.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {searchResults.map((res, idx) => {
                    const simPercent = Math.round(res.similarity * 100);
                    const simBadgeColor =
                      simPercent >= 80
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : simPercent >= 65
                        ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/30";

                    return (
                      <motion.div
                        key={res.id || idx}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="flex flex-col justify-between rounded-xl border border-white/10 bg-black/30 p-3.5 hover:border-indigo-500/40 transition-colors"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="min-w-0">
                              <span className="text-xs font-semibold text-slate-200 line-clamp-1">
                                {res.document_title}
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] uppercase font-mono text-slate-400">
                                  {res.source}
                                </span>
                                <span className="text-[10px] text-slate-500">
                                  Chunk #{res.chunk_index}
                                </span>
                              </div>
                            </div>
                            <span
                              className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-mono font-bold ${simBadgeColor}`}
                            >
                              {simPercent}% Match
                            </span>
                          </div>
                          <p className="text-[11px] leading-relaxed text-slate-300 line-clamp-4 font-mono bg-black/40 p-2.5 rounded-lg border border-white/5">
                            {res.content}
                          </p>
                        </div>

                        <div className="mt-3 flex items-center justify-between pt-2 border-t border-white/5 text-[10px] text-slate-500">
                          <span>Similarity: {res.similarity.toFixed(4)}</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigate(`/ai-assistant?prompt=${encodeURIComponent(testQuery)}`);
                            }}
                            className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium transition-colors cursor-pointer"
                          >
                            <span>Query AI SOC Assistant</span>
                            <ExternalLink size={10} />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Document Repository & Management Table */}
        <div className="rounded-2xl border border-white/10 bg-[#080e1e]/80 p-5 backdrop-blur-xl shadow-xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <FileCode size={16} className="text-indigo-400" />
                Ingested Security Documents ({filteredDocs.length})
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                All documents currently partitioned into 800-character vector chunks in the Neon database
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Category Filter Tabs */}
              <div className="flex items-center rounded-lg border border-slate-700 bg-black/40 p-1 text-xs">
                {["all", "playbook", "mitre", "internal_doc"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedSource(cat)}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
                      selectedSource === cat
                        ? "bg-indigo-600 text-white"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {cat === "all" ? "All" : cat.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Filter documents..."
                  className="rounded-lg border border-slate-700 bg-black/40 py-1.5 pl-7 pr-3 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <RefreshCw size={24} className="animate-spin text-indigo-400" />
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-700/60 p-10 text-center">
              <BookOpen size={36} className="text-slate-600 mb-2" />
              <div className="text-xs font-semibold text-slate-300">No documents found</div>
              <p className="text-[11px] text-slate-500 mt-1 max-w-sm">
                Get started by clicking <strong>"Seed SOC Playbooks"</strong> above or uploading custom security documentation.
              </p>
              <button
                onClick={handleSeedDefaults}
                disabled={seeding}
                className="mt-4 flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 transition-colors cursor-pointer"
              >
                <Sparkles size={13} />
                Seed Standard SOC Playbooks
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/5 bg-black/20">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/10 bg-white/[0.02] text-[11px] uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Document Title</th>
                    <th className="px-4 py-3 font-medium">Source Type</th>
                    <th className="px-4 py-3 font-medium">Vector Chunks</th>
                    <th className="px-4 py-3 font-medium">Created / Vectorized</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {filteredDocs.map((doc) => {
                    const sourceBadge =
                      doc.source === "mitre"
                        ? "bg-purple-500/10 text-purple-400 border-purple-500/30"
                        : doc.source === "playbook"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : "bg-blue-500/10 text-blue-400 border-blue-500/30";

                    return (
                      <tr key={doc.document_title} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-100 flex items-center gap-2">
                          <FileText size={15} className="text-slate-400 shrink-0" />
                          <span className="truncate max-w-md">{doc.document_title}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-md border px-2 py-0.5 text-[10px] uppercase font-mono font-medium ${sourceBadge}`}
                          >
                            {doc.source}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1 font-mono text-slate-200">
                            <Layers size={13} className="text-indigo-400" />
                            {doc.chunk_count} {doc.chunk_count === 1 ? "chunk" : "chunks"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-[11px]">
                          {new Date(doc.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleInspectDoc(doc.document_title)}
                              className="flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
                              title="Inspect vector chunks"
                            >
                              <Eye size={12} />
                              Inspect
                            </button>
                            <button
                              onClick={() => handleDeleteDoc(doc.document_title)}
                              className="flex items-center gap-1 rounded-md border border-red-500/30 bg-red-950/20 px-2 py-1 text-[11px] text-red-400 hover:bg-red-900/40 hover:text-red-300 transition-colors cursor-pointer"
                              title="Delete from pgvector"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* AI SOC Assistant Bridge Banner */}
        <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-indigo-950/30 via-slate-900/60 to-purple-950/30 p-5 backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shadow-lg shadow-indigo-500/20">
              <Sparkles size={20} />
            </span>
            <div>
              <h3 className="text-xs font-semibold text-slate-200">
                Grounding the SentinelX AI SOC Assistant
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Every prompt asked in the AI Assistant automatically performs a top-3 cosine distance retrieval
                over these vectors, preventing LLM hallucination and enforcing adherence to your organizational SOPs.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate("/ai-assistant")}
            className="flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 hover:text-white transition-colors shrink-0 cursor-pointer"
          >
            <span>Open AI Assistant</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>

      {/* Ingest / Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !submitting && setShowUploadModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative z-10 w-full max-w-2xl rounded-2xl border border-white/15 bg-[#0a0f1d] p-6 shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
                    <Plus size={16} />
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold text-slate-100">
                      Ingest Document into pgvector
                    </h2>
                    <p className="text-[11px] text-slate-400">
                      Partitioned into 800-character chunks with 384-dimensional embeddings
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => !submitting && setShowUploadModal(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-2 border-b border-white/10 pb-3 mb-4">
                <button
                  type="button"
                  onClick={() => setModalTab("upload")}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                    modalTab === "upload"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                  }`}
                >
                  <UploadCloud size={14} />
                  File Upload (.txt, .md, .json, .csv, .pdf)
                </button>
                <button
                  type="button"
                  onClick={() => setModalTab("manual")}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                    modalTab === "manual"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                  }`}
                >
                  <FileText size={14} />
                  Manual Text / SOP
                </button>
              </div>

              {/* Tab 1: File Upload */}
              {modalTab === "upload" && (
                <form onSubmit={handleFileUpload} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Choose Document File
                    </label>
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-black/30 p-6 hover:border-indigo-500/50 transition-colors">
                      <UploadCloud size={32} className="text-slate-500 mb-2" />
                      <input
                        type="file"
                        required
                        accept=".txt,.md,.markdown,.json,.csv,.log,.pdf"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setUploadFile(e.target.files[0]);
                            if (!uploadTitle) {
                              setUploadTitle(e.target.files[0].name.replace(/\.[^/.]+$/, ""));
                            }
                          }
                        }}
                        className="text-xs text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-white hover:file:bg-indigo-500 cursor-pointer"
                      />
                      <span className="text-[10px] text-slate-500 mt-2">
                        Supports text files, markdown incident logs, and security whitepapers
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Document Title (Optional override)
                      </label>
                      <input
                        value={uploadTitle}
                        onChange={(e) => setUploadTitle(e.target.value)}
                        placeholder="e.g. Q3 Threat Intel Brief"
                        className="w-full rounded-lg border border-slate-700 bg-black/40 px-3 py-2 text-xs text-slate-100 outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Source Category
                      </label>
                      <select
                        value={uploadSource}
                        onChange={(e) => setUploadSource(e.target.value)}
                        className="w-full rounded-lg border border-slate-700 bg-black/40 px-3 py-2 text-xs text-slate-100 outline-none focus:border-indigo-500"
                      >
                        <option value="internal_doc">Internal Doc</option>
                        <option value="playbook">Playbook / SOP</option>
                        <option value="mitre">MITRE ATT&amp;CK</option>
                        <option value="incident_report">Incident Report</option>
                        <option value="nvd">NVD / CVE Advisory</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => setShowUploadModal(false)}
                      className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-white/5 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || !uploadFile}
                      className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 disabled:opacity-50 cursor-pointer"
                    >
                      {submitting ? (
                        <>
                          <RefreshCw size={13} className="animate-spin" />
                          Indexing...
                        </>
                      ) : (
                        <>
                          <Sparkles size={13} />
                          Upload &amp; Vectorize
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Tab 2: Manual Text Ingestion */}
              {modalTab === "manual" && (
                <form onSubmit={handleManualIngest} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Document Title *
                      </label>
                      <input
                        required
                        value={manualTitle}
                        onChange={(e) => setManualTitle(e.target.value)}
                        placeholder="e.g. Reverse Shell Response Playbook"
                        className="w-full rounded-lg border border-slate-700 bg-black/40 px-3 py-2 text-xs text-slate-100 outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Source Category
                      </label>
                      <select
                        value={manualSource}
                        onChange={(e) => setManualSource(e.target.value)}
                        className="w-full rounded-lg border border-slate-700 bg-black/40 px-3 py-2 text-xs text-slate-100 outline-none focus:border-indigo-500"
                      >
                        <option value="playbook">Playbook / SOP</option>
                        <option value="mitre">MITRE ATT&amp;CK</option>
                        <option value="internal_doc">Internal Doc</option>
                        <option value="incident_report">Incident Report</option>
                        <option value="nvd">NVD / CVE Advisory</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-slate-300">
                        Content / Markdown Text *
                      </label>
                      <span className="text-[10px] text-indigo-400 font-mono">
                        {manualContent.length} chars &bull; ~{estimatedChunks} chunks
                      </span>
                    </div>
                    <textarea
                      required
                      rows={8}
                      value={manualContent}
                      onChange={(e) => setManualContent(e.target.value)}
                      placeholder="Paste incident playbook, MITRE detection logic, containment protocols, or policy guidelines here..."
                      className="w-full rounded-lg border border-slate-700 bg-black/40 p-3 font-mono text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => setShowUploadModal(false)}
                      className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-white/5 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || !manualTitle.trim() || !manualContent.trim()}
                      className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 disabled:opacity-50 cursor-pointer"
                    >
                      {submitting ? (
                        <>
                          <RefreshCw size={13} className="animate-spin" />
                          Vectorizing Chunks...
                        </>
                      ) : (
                        <>
                          <Sparkles size={13} />
                          Vectorize &amp; Store
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Chunk Inspector Modal */}
      <AnimatePresence>
        {showChunkModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowChunkModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative z-10 flex flex-col max-h-[85vh] w-full max-w-3xl rounded-2xl border border-white/15 bg-[#0a0f1d] shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-white/10 p-5">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
                    <Layers size={18} />
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold text-slate-100 line-clamp-1">
                      {selectedDocTitle}
                    </h2>
                    <p className="text-[11px] text-slate-400">
                      Partitioned Vector Chunks ({inspectChunks.length} chunks indexed)
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowChunkModal(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {loadingChunks ? (
                  <div className="flex h-40 items-center justify-center">
                    <RefreshCw size={24} className="animate-spin text-indigo-400" />
                  </div>
                ) : inspectChunks.length === 0 ? (
                  <div className="text-center text-xs text-slate-400 py-10">
                    No chunks found for this document.
                  </div>
                ) : (
                  inspectChunks.map((chunk) => (
                    <div
                      key={chunk.id || chunk.chunk_index}
                      className="rounded-xl border border-white/10 bg-black/40 p-4"
                    >
                      <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2 text-[11px]">
                        <span className="font-mono font-bold text-indigo-400">
                          Chunk #{chunk.chunk_index}
                        </span>
                        <div className="flex items-center gap-2 text-slate-500">
                          <span>{chunk.content.length} chars</span>
                          <span>&bull;</span>
                          <span className="font-mono text-[10px] text-slate-400">ID: {chunk.id?.slice(0, 8)}...</span>
                        </div>
                      </div>
                      <p className="font-mono text-xs leading-relaxed text-slate-300 whitespace-pre-wrap">
                        {chunk.content}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-white/10 p-4 bg-white/[0.02] flex justify-end">
                <button
                  onClick={() => setShowChunkModal(false)}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DashboardShell>
  );
}
