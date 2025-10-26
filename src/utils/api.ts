import { buildApiUrl } from '../config';

// API client helpers
export const apiClient = {
  async fetchTokenRequests() {
    const response = await fetch(buildApiUrl('/api/token-requests'));
    if (!response.ok) throw new Error('Failed to fetch token requests');
    return response.json();
  },

  async fetchSigninAttempts() {
    const response = await fetch(buildApiUrl('/api/signin-attempts'));
    if (!response.ok) throw new Error('Failed to fetch signin attempts');
    return response.json();
  },

  async fetchAgents() {
    const response = await fetch(buildApiUrl('/api/agents'));
    if (!response.ok) throw new Error('Failed to fetch agents');
    return response.json();
  },

  async fetchUsage() {
    const response = await fetch(buildApiUrl('/api/usage'));
    if (!response.ok) throw new Error('Failed to fetch usage data');
    return response.json();
  },

  async fetchTraffic() {
    const response = await fetch(buildApiUrl('/api/traffic'));
    if (!response.ok) throw new Error('Failed to fetch traffic data');
    return response.json();
  },
};

// Example WebSocket usage
export const setupWebSocket = (onMessage: (data: any) => void) => {
  const ws = new WebSocket(import.meta.env.VITE_WS_URL || 'ws://localhost:3000/ws');
  
  ws.onopen = () => {
    console.log('WebSocket connected');
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    onMessage(data);
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  ws.onclose = () => {
    console.log('WebSocket disconnected');
  };

  return ws;
};

