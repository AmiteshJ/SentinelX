import { apiClient } from "./client";
import type {
  KnowledgeStats,
  KnowledgeDocument,
  KnowledgeChunk,
  SemanticSearchResult,
} from "../types/api";

export const knowledgeApi = {
  async getStats(): Promise<KnowledgeStats> {
    const { data } = await apiClient.get<KnowledgeStats>("/api/knowledge/stats");
    return data;
  },

  async listDocuments(): Promise<KnowledgeDocument[]> {
    const { data } = await apiClient.get<KnowledgeDocument[]>("/api/knowledge/documents");
    return data;
  },

  async getChunks(title: string): Promise<KnowledgeChunk[]> {
    const { data } = await apiClient.get<KnowledgeChunk[]>(
      `/api/knowledge/documents/${encodeURIComponent(title)}/chunks`
    );
    return data;
  },

  async ingestDocument(payload: {
    title: string;
    source: string;
    content: string;
  }): Promise<{ status: string; chunks_ingested: number; message: string }> {
    const { data } = await apiClient.post("/api/knowledge/ingest", payload);
    return data;
  },

  async uploadFile(
    file: File,
    title?: string,
    source: string = "internal_doc"
  ): Promise<{ status: string; chunks_ingested: number; message: string }> {
    const formData = new FormData();
    formData.append("file", file);
    if (title) formData.append("title", title);
    formData.append("source", source);

    const { data } = await apiClient.post("/api/knowledge/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return data;
  },

  async deleteDocument(title: string): Promise<{ status: string; chunks_deleted: number }> {
    const { data } = await apiClient.delete(`/api/knowledge/documents/${encodeURIComponent(title)}`);
    return data;
  },

  async search(
    query: string,
    top_k: number = 5
  ): Promise<{ query: string; top_k: number; results_count: number; results: SemanticSearchResult[] }> {
    const { data } = await apiClient.post("/api/knowledge/search", { query, top_k });
    return data;
  },

  async seedDefaults(): Promise<{ status: string; chunks_ingested: number; message: string }> {
    const { data } = await apiClient.post("/api/knowledge/seed-defaults");
    return data;
  },
};
