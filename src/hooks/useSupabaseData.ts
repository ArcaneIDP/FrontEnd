import { useState, useEffect } from 'react';
import { fetchEphemeralTokens, fetchAuditLogs, fetchDataSources, subscribeToEphemeralTokens, subscribeToAuditLogs } from '../lib/supabase-queries';

// Hook to manage Supabase data with fallback to mock data
export function useSupabaseData() {
  const [tokenRequests, setTokenRequests] = useState<any[]>([]);
  const [signinAttempts, setSigninAttempts] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [useMockData, setUseMockData] = useState(false);

  // Check if Supabase credentials are configured
  useEffect(() => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.warn('Supabase not configured, using mock data');
      setUseMockData(true);
      setLoading(false);
      return;
    }

    setUseMockData(false);
  }, []);

  // Fetch data from Supabase
  useEffect(() => {
    if (useMockData) {
      console.log('Using mock data - Supabase not configured');
      setLoading(false);
      return;
    }

    async function loadData() {
      try {
        console.log('Loading data from Supabase...');
        const [requests, signins, agts] = await Promise.all([
          fetchEphemeralTokens(),
          fetchAuditLogs(),
          fetchDataSources(),
        ]);

        console.log('Supabase data loaded:', {
          tokens: requests.length,
          audits: signins.length,
          agents: agts.length,
        });

        setTokenRequests(requests);
        setSigninAttempts(signins);
        setAgents(agts);
        setLoading(false);
      } catch (error) {
        console.error('Error loading data from Supabase:', error);
        setUseMockData(true);
        setLoading(false);
      }
    }

    loadData();
  }, [useMockData]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (useMockData) return;

    const channel1 = subscribeToEphemeralTokens((newRequest: any) => {
      console.log('New ephemeral token received:', newRequest);
      // Transform the new request to match the dashboard format
      const transformed = {
        id: newRequest.id,
        ts: newRequest.created_at,
        agent: 'Unknown', // Will be populated if data_sources relation works
        ttlSec: newRequest.expires_at ? Math.floor((new Date(newRequest.expires_at).getTime() - new Date(newRequest.created_at).getTime()) / 1000) : 0,
        decision: newRequest.is_revoked ? 'DENIED' : 'GRANTED',
        reason: newRequest.justification || 'Generated for data access',
        ip: 'N/A',
        token: {
          action: 'READ',
          resource_type: 'data-source',
          resource_id: 'Unknown',
          justification: newRequest.justification,
          scope: newRequest.scope,
        },
      };
      setTokenRequests((prev) => [transformed, ...prev]);
    });

    const channel2 = subscribeToAuditLogs((newAttempt: any) => {
      console.log('New audit log received:', newAttempt);
      // Transform the audit log to match the dashboard format
      const transformed = {
        id: newAttempt.id,
        ts: newAttempt.timestamp,
        subject: newAttempt.user_id,
        method: newAttempt.method || 'UNKNOWN',
        status: newAttempt.status_code >= 200 && newAttempt.status_code < 300 ? 'SUCCESS' : 
                newAttempt.status_code >= 400 && newAttempt.status_code < 500 ? 'FAILED' : 'BLOCKED',
        reason: newAttempt.action || `${newAttempt.method} ${newAttempt.path}`,
        ip: newAttempt.ip_address,
      };
      setSigninAttempts((prev) => [transformed, ...prev]);
    });

    return () => {
      channel1.unsubscribe();
      channel2.unsubscribe();
    };
  }, [useMockData]);

  return {
    tokenRequests,
    signinAttempts,
    agents,
    loading,
    useMockData,
    // Helper to manually refresh data
    refreshData: async () => {
      if (useMockData) return;
      setLoading(true);
      const [requests, signins, agts] = await Promise.all([
        fetchEphemeralTokens(),
        fetchAuditLogs(),
        fetchDataSources(),
      ]);
      setTokenRequests(requests);
      setSigninAttempts(signins);
      setAgents(agts);
      setLoading(false);
    },
  };
}

