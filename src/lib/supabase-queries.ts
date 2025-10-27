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

// Get usage statistics for charts (resource usage by scope from ephemeral_tokens)
export async function fetchUsageStats() {
  if (!supabase) return [];
  
  // Get count of requests per scope
  const { data: tokens, error } = await supabase
    .from('ephemeral_tokens')
    .select('scope')
    .limit(100);

  if (error || !tokens) return [];

  // Count usage per scope
  const usageMap = new Map<string, number>();
  tokens.forEach(token => {
    const scope = token.scope || 'Unknown';
    usageMap.set(scope, (usageMap.get(scope) || 0) + 1);
  });

  return Array.from(usageMap.entries()).map(([resource, calls]) => ({
    resource,
    calls,
  }));
}

// Get traffic statistics for the area chart (based on audit_logs)
export async function fetchTrafficStats(timeRange: string = "12h") {
  if (!supabase) return [];

  // Calculate time range in milliseconds
  const timeRanges: Record<string, number> = {
    "5m": 5 * 60 * 1000,
    "30m": 30 * 60 * 1000,
    "1h": 60 * 60 * 1000,
    "8h": 8 * 60 * 60 * 1000,
    "12h": 12 * 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
  };

  const timeRangeMs = timeRanges[timeRange] || timeRanges["12h"];
  const bucketSizeMinutes = timeRange.includes("d") ? 
    (timeRange === "7d" ? 60 : 240) : 
    (timeRange === "5m" ? 1 : timeRange === "30m" ? 5 : timeRange === "1h" ? 5 : 30);

  // Get audit logs grouped by timestamp
  const { data: logs, error } = await supabase
    .from('audit_logs')
    .select('timestamp, status_code')
    .gte('timestamp', new Date(Date.now() - timeRangeMs).toISOString())
    .order('timestamp', { ascending: true })
    .limit(1000);

  if (error || !logs || logs.length === 0) return [];

  // Group into 5-minute buckets with accurate time labels
  const buckets = new Map<string, { granted: number; denied: number }>();
  
  logs.forEach(log => {
    const date = new Date(log.timestamp);
    let bucketKey: string;
    
    if (timeRange.includes("d")) {
      // For days, show date
      const dayName = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      bucketKey = dayName;
    } else if (timeRange === "12h" || timeRange === "24h" || timeRange === "8h") {
      // For hours, show hour:minute
      const minutes = Math.floor(date.getMinutes() / bucketSizeMinutes) * bucketSizeMinutes;
      const hour24 = date.getHours();
      const hour12 = hour24 % 12 || 12;
      const ampm = hour24 >= 12 ? 'PM' : 'AM';
      bucketKey = `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    } else {
      // For minutes, show hour:minute
      const minutes = Math.floor(date.getMinutes() / bucketSizeMinutes) * bucketSizeMinutes;
      const hour24 = date.getHours();
      const hour12 = hour24 % 12 || 12;
      const ampm = hour24 >= 12 ? 'PM' : 'AM';
      bucketKey = `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    }
    
    if (!buckets.has(bucketKey)) {
      buckets.set(bucketKey, { granted: 0, denied: 0 });
    }
    const stats = buckets.get(bucketKey)!;
    
    // Status code 2xx = granted, 4xx/5xx = denied
    if (log.status_code >= 200 && log.status_code < 300) {
      stats.granted++;
    } else {
      stats.denied++;
    }
  });

  // Convert to array and sort by time
  const sortedBuckets = Array.from(buckets.entries())
    .sort(([a], [b]) => {
      // If it's a date string, sort chronologically
      if (timeRange.includes("d")) {
        const dateA = new Date(a);
        const dateB = new Date(b);
        return dateA.getTime() - dateB.getTime();
      }
      
      // Otherwise, parse time format (e.g., "4:50 PM")
      const [aTime, aAmPm] = a.split(' ');
      const [bTime, bAmPm] = b.split(' ');
      const [aHour, aMin] = aTime.split(':').map(Number);
      const [bHour, bMin] = bTime.split(':').map(Number);
      
      // Convert to 24-hour for proper sorting
      const aHour24 = aAmPm === 'PM' && aHour !== 12 ? aHour + 12 : (aAmPm === 'AM' && aHour === 12 ? 0 : aHour);
      const bHour24 = bAmPm === 'PM' && bHour !== 12 ? bHour + 12 : (bAmPm === 'AM' && bHour === 12 ? 0 : bHour);
      
      if (aHour24 !== bHour24) return aHour24 - bHour24;
      return aMin - bMin;
    });

  return sortedBuckets.map(([t, stats]) => ({
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

