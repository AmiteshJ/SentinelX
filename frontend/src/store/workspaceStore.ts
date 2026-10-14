import { create } from "zustand";
import { apiClient } from "../api/client";

export type SocScope = "personal" | "fleet";

export interface EnrolledEndpoint {
  hostname: string;
  os: string;
  user_id: string;
  user_email?: string;
  online: boolean;
  is_current_user?: boolean;
  last_seen?: number;
  connections_count?: number;
}

interface WorkspaceState {
  scope: SocScope;
  selectedHost: string | null;
  endpoints: EnrolledEndpoint[];
  isLoading: boolean;
  
  setScope: (scope: SocScope) => void;
  setSelectedHost: (host: string | null) => void;
  fetchEndpoints: () => Promise<void>;
}

const SCOPE_STORAGE_KEY = "sentinelx-soc-scope";

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  scope: (localStorage.getItem(SCOPE_STORAGE_KEY) as SocScope) || "personal",
  selectedHost: null,
  endpoints: [],
  isLoading: false,

  setScope: (scope: SocScope) => {
    localStorage.setItem(SCOPE_STORAGE_KEY, scope);
    set({ scope });
  },

  setSelectedHost: (host: string | null) => set({ selectedHost: host }),

  fetchEndpoints: async () => {
    set({ isLoading: true });
    try {
      const { data } = await apiClient.get<{ endpoints: EnrolledEndpoint[] }>("/api/agent/endpoints");
      set({ endpoints: data.endpoints || [] });
    } catch {
      set({ endpoints: [] });
    } finally {
      set({ isLoading: false });
    }
  },
}));
