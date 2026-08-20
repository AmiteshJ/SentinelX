export interface SystemHealth {
  postgres: boolean;
  mongodb: boolean;
  redis: boolean;
  detection_engine: boolean;
}

export interface DashboardOverview {
  system_health: SystemHealth;
  monitoring_mode: "LIVE" | "DATASET" | "REPLAY" | "OFFLINE";
  active_incidents: number;
  critical_alerts: number;
  high_alerts: number;
  medium_alerts: number;
  low_alerts: number;
  events_per_second: number;
}

export interface UserOut {
  id: string;
  full_name: string;
  email: string;
  role: string | null;
  is_verified: boolean;
}

export interface Alert {
  id: string;
  event_id: string;
  rule_id: string;
  rule_name: string;
  severity: "low" | "medium" | "high" | "critical";
  mitre_technique: string | null;
  source_ip: string | null;
  destination_ip: string | null;
  status: string;
  created_at: string;
}

export interface Incident {
  id: string;
  title: string;
  severity: string;
  status: string;
  risk_score: number | null;
  alert_count: number;
  created_at: string;
  updated_at: string;
}

export interface RealtimeUpdate {
  type: "alert_created";
  alert: Alert;
  incident_id: string;
  incident_risk_score: number;
}

export interface MaliciousUrl {
  id: string;
  url: string;
  normalized_url: string;
  domain: string;
  threat_type: string;
  severity: string;
  confidence: number;
  source: string;
  status: string;
  active: boolean;
  tags: string[];
  analyst: string | null;
  notes: string | null;
  first_seen: string;
  last_seen: string;
}

export interface ThreatIntelOverview {
  malicious_urls: number;
  malicious_ips: number;
  pending_verification: number;
}

export interface ExperimentResult {
  model: string;
  held_out_class: string | null;
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1_score?: number;
  roc_auc?: number | null;
  confusion_matrix?: number[][];
  n_test_samples?: number;
  training_seconds?: number;
  error?: string;
}

export interface Experiment {
  id: string;
  experiment_type: "standard_split" | "zero_day";
  held_out_class: string | null;
  feature_names: string[];
  n_train: number;
  n_test: number;
  results: ExperimentResult[];
  triggered_by: string;
}

export interface Case {
  id: string;
  title: string;
  description: string | null;
  severity: string;
  status: string;
  assigned_analyst_id: string | null;
  related_incident_ids: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface Report {
  id: string;
  incident_id: string;
  generated_at: string;
  executive_summary: string;
  executive_summary_provider: string | null;
  facts: Record<string, unknown>;
}

export interface AuditLogEntry {
  id: string;
  user_id: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  created_at: string;
}
