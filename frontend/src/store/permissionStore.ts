import { create } from "zustand";
import { apiClient } from "../api/client";

export interface AgentPermissions {
  telemetry_enabled: boolean;
  firewall_enabled: boolean;
  kill_process_enabled: boolean;
  ai_remediation_enabled: boolean;
}

export interface AgentDetails {
  hostname?: string;
  os?: string;
  connections_count?: number;
  last_seen?: number;
}

export interface EnrollmentData {
  token: string;
  email: string;
  user_id: string;
  command_windows: string;
  command_python: string;
}

interface PermissionState {
  permissions: AgentPermissions;
  agentOnline: boolean;
  agentDetails: AgentDetails | null;
  enrollment: EnrollmentData | null;
  hasConsented: boolean;
  isModalOpen: boolean;
  isLoading: boolean;
  
  // Actions
  fetchPermissions: () => Promise<void>;
  updatePermissions: (perms: Partial<AgentPermissions>) => Promise<void>;
  fetchAgentStatus: () => Promise<void>;
  fetchEnrollment: () => Promise<EnrollmentData | null>;
  startAgent: () => Promise<{ status: string; message?: string }>;
  giveConsentAndActivate: (perms: AgentPermissions) => Promise<void>;
  openModal: () => void;
  closeModal: () => void;
}

const CONSENT_KEY = "sentinelx-edr-consent-v1";

export const usePermissionStore = create<PermissionState>((set, get) => ({
  permissions: {
    telemetry_enabled: true,
    firewall_enabled: true,
    kill_process_enabled: true,
    ai_remediation_enabled: true,
  },
  agentOnline: false,
  agentDetails: null,
  enrollment: null,
  hasConsented: localStorage.getItem(CONSENT_KEY) === "true",
  isModalOpen: localStorage.getItem(CONSENT_KEY) !== "true",
  isLoading: false,

  fetchEnrollment: async () => {
    try {
      const { data } = await apiClient.get<EnrollmentData>("/api/agent/enrollment");
      set({ enrollment: data });
      return data;
    } catch (err) {
      console.error("Failed to fetch enrollment", err);
      return null;
    }
  },

  fetchPermissions: async () => {
    try {
      const { data } = await apiClient.get<AgentPermissions>("/api/agent/permissions");
      set({ permissions: data });
    } catch (err) {
      console.error("Failed to load permissions", err);
    }
  },


  updatePermissions: async (patch: Partial<AgentPermissions>) => {
    const updated = { ...get().permissions, ...patch };
    set({ permissions: updated });
    try {
      await apiClient.put("/api/agent/permissions", updated);
    } catch (err) {
      console.error("Failed to update permissions on backend", err);
    }
  },

  fetchAgentStatus: async () => {
    try {
      const { data } = await apiClient.get<{ online: boolean; details: AgentDetails | null }>("/api/agent/status");
      set({ agentOnline: data.online, agentDetails: data.details });
    } catch (err) {
      set({ agentOnline: false, agentDetails: null });
    }
  },

  startAgent: async () => {
    try {
      const { data } = await apiClient.post("/api/agent/start");
      // Poll multiple times to pick up the agent heartbeat as soon as it boots
      setTimeout(() => get().fetchAgentStatus(), 1000);
      setTimeout(() => get().fetchAgentStatus(), 2500);
      setTimeout(() => get().fetchAgentStatus(), 5000);
      return data;
    } catch (err: any) {
      return { status: "error", message: err?.response?.data?.detail || "Could not spawn agent." };
    }
  },

  giveConsentAndActivate: async (perms: AgentPermissions) => {
    localStorage.setItem(CONSENT_KEY, "true");
    set({ hasConsented: true, isModalOpen: false, permissions: perms, isLoading: true });
    try {
      await apiClient.put("/api/agent/permissions", perms);
      // Attempt auto-starting agent
      await get().startAgent();
    } catch (err) {
      console.error("Error activating agent with consent", err);
    } finally {
      set({ isLoading: false });
    }
  },

  openModal: () => set({ isModalOpen: true }),
  closeModal: () => set({ isModalOpen: false }),
}));
