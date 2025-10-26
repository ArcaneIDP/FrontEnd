# AI Agent IDP Dashboard

A beautiful, real-time dashboard for monitoring AI agent identity and access control.

## Features

- **Live Token Request Stream** - Monitor agent requests in real-time
- **Interactive Analytics** - Visualize requests over time and resource usage
- **Security Controls** - Filter by agent, search requests, and view detailed policy evaluations
- **Attack Simulation** - Demo security controls with simulated malicious requests
- **Detailed Inspection** - Click any request to view full policy evaluation and JSON details

## Getting Started

### Install Dependencies

```bash
npm install
```

### Setup Environment

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Update `.env` with your backend API URL:
```
VITE_API_BASE_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
```

### Run the Development Server

```bash
npm run dev
```

The dashboard will be available at `http://localhost:5173`

### Connect to GitHub

If you haven't initialized git yet:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-github-org>/<your-frontend-repo>.git
git push -u origin main
```

### Build for Production

```bash
npm run build
```

## Project Structure

```
src/
├── components/
│   └── AgentIdpDashboard.tsx  # Main dashboard component
├── App.tsx                     # Root app component
├── main.tsx                    # Entry point
└── index.css                   # TailwindCSS styles
```

## Customization

### Connecting to Your Backend

The dashboard uses mock data by default. To connect to your backend:

1. **Set up environment variables**:
   - Create a `.env` file in the root directory
   - Add your backend API URL: `VITE_API_BASE_URL=https://your-backend.com`
   - Add WebSocket URL if using live updates: `VITE_WS_URL=wss://your-backend.com`

2. **Replace mock data with API calls**:
   - Import the API helpers: `import { apiClient } from './utils/api'`
   - Use `useEffect` to fetch data on mount:
   ```typescript
   useEffect(() => {
     const loadData = async () => {
       const data = await apiClient.fetchTokenRequests();
       setRequests(data);
     };
     loadData();
   }, []);
   ```

3. **Add WebSocket support for live updates**:
   - Import the WebSocket helper: `import { setupWebSocket } from './utils/api'`
   - Set up connection in `useEffect`:
   ```typescript
   useEffect(() => {
     const ws = setupWebSocket((data) => {
       // Handle live updates
       setRequests(prev => [data, ...prev]);
     });
     return () => ws.close();
   }, []);
   ```

## Technologies

- React 18
- TypeScript
- TailwindCSS
- Recharts
- Vite

## License

MIT

