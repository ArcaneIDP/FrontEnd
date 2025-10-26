// Type definitions for dashboard data

export interface TokenRequest {
  id: string;
  ts: string;
  agent: string;
  ttlSec: number;
  decision: 'GRANTED' | 'DENIED' | 'BLOCKED';
  reason: string;
  ip: string;
  token: {
    action: string;
    resource_type: string;
    resource_id: string;
    justification?: string;
    columns?: string[];
    row_filter?: string;
    output_limit?: { max_rows: number; max_bytes: number };
    mask_rules?: { column: string; rule: string }[];
    rate_limit?: { rpm: number; burst: number };
    idempotency_key?: string;
    payload_constraints?: any;
    retentionSec?: number;
    egress_budget?: { bytes: number };
    replay_protection?: { nonce: string; one_time: boolean };
    audit_tags?: string[];
    attestations?: { model_hash: string; prompt_hash?: string };
    network?: { cidr_allow?: string[]; geo_allow?: string[] };
  };
}

export interface SigninAttempt {
  id: string;
  ts: string;
  subject: string;
  method: string;
  status: 'SUCCESS' | 'FAILED' | 'BLOCKED';
  reason: string;
}

export interface Agent {
  id: string;
  name: string;
}

export interface UsageData {
  resource: string;
  calls: number;
}

export interface TrafficData {
  t: string;
  granted: number;
  denied: number;
}

