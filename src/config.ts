// API Configuration
// Update these values to point to your backend

export const API_CONFIG = {
  // Base URL for REST API
  baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  
  // WebSocket URL for live updates
  wsUrl: import.meta.env.VITE_WS_URL || 'ws://localhost:3000',
  
  // API endpoints
  endpoints: {
    tokenRequests: '/api/token-requests',
    signinAttempts: '/api/signin-attempts',
    agents: '/api/agents',
    usage: '/api/usage',
    traffic: '/api/traffic',
  },
};

// Helper to build full API URL
export const buildApiUrl = (endpoint: string) => {
  return `${API_CONFIG.baseUrl}${endpoint}`;
};

// Helper to create WebSocket connection
export const createWebSocket = (path: string = '/ws') => {
  return new WebSocket(`${API_CONFIG.wsUrl}${path}`);
};

