import { supabase } from './supabase';

// Fetch ephemeral tokens (token requests) - Maps to "Live token requests" table
export async function fetchEphemeralTokens() {
  if (!supabase) return [];
  
  const { data, error } = await supabase
    .from('ephemeral_tokens')
    .select('*, data_sources!inner(id, name), user_api_tokens!left(id, name)')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Error fetching ephemeral tokens:', error);
    return [];
  }

  // Transform to match dashboard format
  return (data || []).map(token => ({
    id: token.id,
    ts: token.created_at,
    agent: token.data_sources?.name || 'Unknown Agent',
    ttlSec: Math.floor((new Date(token.expires_at).getTime() - new Date(token.created_at).getTime()) / 1000),
    decision: token.is_revoked ? 'DENIED' : 'GRANTED',
    reason: token.justification || 'Generated for data access',
    ip: 'N/A',
    token: {
      action: token.scope || 'ACCESS',
      resource_type: 'data-source',
      resource_id: token.data_sources?.name || 'Unknown Resource',
      justification: token.justification,
      scope: token.scope,
      columns: [],
      row_filter: '',
      output_limit: { max_rows: 0, max_bytes: 0 },
      mask_rules: [],
      retentionSec: 0,
      egress_budget: { bytes: 0 },
      replay_protection: { nonce: token.id.slice(0, 6), one_time: true },
      audit_tags: ['ephemeral-token'],
      metadata: token.metadata,
    },
  }));
}

// Fetch audit logs - Maps to "Auth attempts" table
export async function fetchAuditLogs() {
  if (!supabase) return [];
  
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Error fetching audit logs:', error);
    return [];
  }

  // Transform to match dashboard format
  return (data || []).map(log => ({
    id: log.id,
    ts: log.timestamp,
    subject: log.user_id, // User who made the request
    method: log.method || 'UNKNOWN', // HTTP method (GET, POST, etc.)
    status: log.status_code >= 200 && log.status_code < 300 ? 'SUCCESS' : 
            log.status_code >= 400 && log.status_code < 500 ? 'FAILED' : 'BLOCKED',
    reason: log.action || `${log.method} ${log.path}`, // What action was performed
    ip: log.ip_address,
    duration_ms: log.duration_ms,
    metadata: log.metadata,
  }));
}

// Fetch data sources - Maps to "Agents" filter dropdown
export async function fetchDataSources() {
  if (!supabase) return [];
  
  const { data, error } = await supabase
    .from('data_sources')
    .select('id, name, base_url, is_active')
    .eq('is_active', true) // Only show active data sources
    .order('name');

  if (error) {
    console.error('Error fetching data sources:', error);
    return [];
  }

  return (data || []).map(source => ({
    id: source.id,
    name: source.name,
    base_url: source.base_url,
    is_active: source.is_active,
  }));
}

// Get usage statistics for charts (resource usage over time)
export async function fetchUsageStats() {
  if (!supabase) return [];
  
  // Get count of requests per data_source
  const { data: tokens, error } = await supabase
    .from('ephemeral_tokens')
    .select('data_source_id, data_sources(name)')
    .limit(100);

  if (error || !tokens) return [];

  // Count usage per data source
  const usageMap = new Map<string, number>();
  tokens.forEach(token => {
    const sourceName = (token as any).data_sources?.name || 'Unknown';
    usageMap.set(sourceName, (usageMap.get(sourceName) || 0) + 1);
  });

  return Array.from(usageMap.entries()).map(([resource, calls]) => ({
    resource,
    calls,
  }));
}

// Get traffic statistics for the area chart
export async function fetchTrafficStats() {
  if (!supabase) return [];

  // Get tokens grouped by creation time (last 60 minutes, 5-minute intervals)
  const { data: tokens, error } = await supabase
    .from('ephemeral_tokens')
    .select('created_at, is_revoked')
    .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: true })
    .limit(100);

  if (error || !tokens) return [];

  // Group into 5-minute buckets
  const buckets = new Map<string, { granted: number; denied: number }>();
  tokens.forEach(token => {
    const date = new Date(token.created_at);
    const minutes = Math.floor(date.getMinutes() / 5) * 5;
    const bucket = `${date.getHours()}:${minutes.toString().padStart(2, '0')}`;
    
    if (!buckets.has(bucket)) {
      buckets.set(bucket, { granted: 0, denied: 0 });
    }
    const stats = buckets.get(bucket)!;
    
    if (token.is_revoked) {
      stats.denied++;
    } else {
      stats.granted++;
    }
  });

  return Array.from(buckets.entries()).map(([t, stats]) => ({
    t,
    granted: stats.granted,
    denied: stats.denied,
  }));
}

// Subscribe to real-time ephemeral tokens
export function subscribeToEphemeralTokens(onInsert: (payload: any) => void) {
  if (!supabase) return { unsubscribe: () => {} };
  
  return supabase
    .channel('ephemeral_tokens_channel')
    .on('postgres_changes', 
      { event: 'INSERT', schema: 'public', table: 'ephemeral_tokens' },
      (payload) => {
        onInsert(payload.new);
      }
    )
    .subscribe();
}

// Subscribe to real-time audit logs
export function subscribeToAuditLogs(onInsert: (payload: any) => void) {
  if (!supabase) return { unsubscribe: () => {} };
  
  return supabase
    .channel('audit_logs_channel')
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'audit_logs' },
      (payload) => {
        onInsert(payload.new);
      }
    )
    .subscribe();
}

