import { apiClient } from "./client";

export interface MitreRule {
  rule_id: string;
  name: string;
  severity: string;
  status: string;
  description?: string;
  conditions?: Record<string, any>;
}

export interface MitreTechnique {
  id: string;
  name: string;
  tactic_id: string;
  description: string;
  platforms: string[];
  data_sources: string[];
  mitigations: string[];
  rules: MitreRule[];
  rules_count: number;
  alert_count: number;
  status: "active_alerts" | "covered" | "uncovered_gap";
  heatmap_score: number;
}

export interface MitreTactic {
  id: string;
  name: string;
  short: string;
  order: number;
  description: string;
  techniques: MitreTechnique[];
}

export interface MitreMatrixSummary {
  total_techniques: number;
  covered_techniques: number;
  coverage_percentage: number;
  active_alerts_techniques: number;
  uncovered_gaps: number;
  total_active_rules: number;
}

export interface MitreMatrixResponse {
  tactics: MitreTactic[];
  summary: MitreMatrixSummary;
}

export interface MitreTechniqueDetail extends MitreTechnique {
  tactic?: MitreTactic;
  recent_alerts: any[];
  total_alerts: number;
  coverage_status: string;
}

export async function fetchMitreMatrix(): Promise<MitreMatrixResponse> {
  const { data } = await apiClient.get<MitreMatrixResponse>("/api/mitre/matrix");
  return data;
}

export async function fetchTechniqueDetails(techniqueId: string): Promise<MitreTechniqueDetail> {
  const { data } = await apiClient.get<MitreTechniqueDetail>(`/api/mitre/techniques/${techniqueId}`);
  return data;
}
