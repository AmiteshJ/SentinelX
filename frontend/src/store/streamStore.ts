import { create } from "zustand";
import { apiClient } from "../api/client";
import type { DatasetFile, DatasetStreamStatus } from "../types/api";

interface StreamState {
  files: DatasetFile[];
  status: DatasetStreamStatus | null;
  selectedFile: string;
  speedEps: number;
  isLoading: boolean;
  error: string | null;

  loadFiles: (force?: boolean) => Promise<void>;
  fetchStatus: () => Promise<void>;
  startStream: (filename?: string, speed?: number) => Promise<void>;
  pauseStream: () => Promise<void>;
  resumeStream: () => Promise<void>;
  stopStream: () => Promise<void>;
  setSpeed: (speed: number) => Promise<void>;
  setSelectedFile: (file: string) => void;
  setError: (err: string | null) => void;
}

let pollingInterval: any = null;

export const useStreamStore = create<StreamState>((set, get) => ({
  files: [],
  status: null,
  selectedFile: "",
  speedEps: 10,
  isLoading: false,
  error: null,

  setError: (err) => set({ error: err }),

  setSelectedFile: (file) => set({ selectedFile: file }),

  loadFiles: async (force = false) => {
    if (get().files.length > 0 && !force) return;
    try {
      const res = await apiClient.get<{ files: DatasetFile[] }>("/api/datasets/files");
      const files = res.data.files || [];
      set({ files });
      if (files.length > 0 && !get().selectedFile) {
        const defaultFile = files.find((f) => f.filename.includes("combinenew")) || files[0];
        set({ selectedFile: defaultFile.filename });
      }
    } catch {
      // Ignore network errors on background check
    }
  },

  fetchStatus: async () => {
    try {
      const res = await apiClient.get<DatasetStreamStatus>("/api/datasets/stream/status");
      set({ status: res.data });
      if (res.data.current_filename) {
        set({ selectedFile: res.data.current_filename });
      }
    } catch {
      // Ignore
    }
  },

  startStream: async (filename, speed) => {
    const targetFile = filename || get().selectedFile;
    const targetSpeed = speed || get().speedEps;
    if (!targetFile) return;

    set({ isLoading: true, error: null });
    try {
      const res = await apiClient.post<DatasetStreamStatus>("/api/datasets/stream/start", {
        filename: targetFile,
        speed_eps: targetSpeed,
        loop: true,
      });
      set({ status: res.data, selectedFile: targetFile, speedEps: targetSpeed });
    } catch (err: any) {
      set({ error: err?.response?.data?.detail || "Failed to start streaming" });
    } finally {
      set({ isLoading: false });
    }
  },

  pauseStream: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiClient.post<DatasetStreamStatus>("/api/datasets/stream/pause");
      set({ status: res.data });
    } catch (err: any) {
      set({ error: err?.response?.data?.detail || "Failed to pause streaming" });
    } finally {
      set({ isLoading: false });
    }
  },

  resumeStream: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiClient.post<DatasetStreamStatus>("/api/datasets/stream/resume");
      set({ status: res.data });
    } catch (err: any) {
      set({ error: err?.response?.data?.detail || "Failed to resume streaming" });
    } finally {
      set({ isLoading: false });
    }
  },

  stopStream: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiClient.post<DatasetStreamStatus>("/api/datasets/stream/stop");
      set({ status: res.data });
    } catch (err: any) {
      set({ error: err?.response?.data?.detail || "Failed to stop streaming" });
    } finally {
      set({ isLoading: false });
    }
  },

  setSpeed: async (speed) => {
    set({ speedEps: speed });
    if (get().status?.is_running) {
      try {
        await apiClient.post("/api/datasets/stream/speed", { speed_eps: speed });
      } catch {
        // Fallback
      }
    }
  },
}));

export function startGlobalStreamPolling() {
  if (pollingInterval) return;
  useStreamStore.getState().loadFiles();
  useStreamStore.getState().fetchStatus();
  pollingInterval = setInterval(() => {
    useStreamStore.getState().fetchStatus();
  }, 1500);
}

export function stopGlobalStreamPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
}
