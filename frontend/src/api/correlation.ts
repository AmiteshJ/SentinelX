import { apiClient } from "./client";

export interface GraphNode {
  id: string;
  label: string;
  type: "incident" | "alert" | "ip" | "process" | "ioc" | "mitre" | "user";
  color: string;
  size: number;
  degree?: number;
  metadata?: Record<string, any>;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relation: string;
  label?: string;
}

export interface ChokePoint {
  id: string;
  label: string;
  type: string;
  degree: number;
}

export interface IncidentGraphResponse {
  incident_id: string;
  title: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  summary: {
    total_nodes: number;
    total_edges: number;
    alerts_count: number;
    choke_points: ChokePoint[];
  };
}

export interface GlobalGraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
  summary: {
    total_incidents: number;
    total_nodes: number;
    total_edges: number;
  };
}

export async function fetchGlobalCorrelationGraph(limit = 15): Promise<GlobalGraphResponse> {
  const { data } = await apiClient.get<GlobalGraphResponse>(`/api/correlation/graph?limit=${limit}`);
  return data;
}

export async function fetchIncidentCorrelationGraph(incidentId: string): Promise<IncidentGraphResponse> {
  const { data } = await apiClient.get<IncidentGraphResponse>(`/api/correlation/incident/${incidentId}`);
  return data;
}
