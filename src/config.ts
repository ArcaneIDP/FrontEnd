// API Configuration
// Update these values to point to your backend

export const API_CONFIG = {
  // Supabase Configuration
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  
  // Base URL for REST API (legacy, if still using separate backend)
  baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  
  // WebSocket URL for live updates (legacy)
  wsUrl: import.meta.env.VITE_WS_URL || 'ws://localhost:3000',
  
  // API endpoints (legacy)
  endpoints: {
    tokenRequests: '/api/token-requests',
    signinAttempts: '/api/signin-attempts',
    agents: '/api/agents',
    usage: '/api/usage',
    traffic: '/api/traffic',
  },
};

// Helper to build full API URL (legacy)
export const buildApiUrl = (endpoint: string) => {
  return `${API_CONFIG.baseUrl}${endpoint}`;
};

// Helper to create WebSocket connection (legacy)
export const createWebSocket = (path: string = '/ws') => {
  return new WebSocket(`${API_CONFIG.wsUrl}${path}`);
};

