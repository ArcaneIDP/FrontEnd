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

### Setup Environment with Supabase

Create a `.env` file in the root directory:

```bash
# Create .env file
cat > .env << 'EOF'
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
EOF
```

**Get your Supabase credentials:**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to Settings → API
4. Copy the "Project URL" → `VITE_SUPABASE_URL`
5. Copy the "anon public" key → `VITE_SUPABASE_ANON_KEY`

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

## Database Schema

This dashboard connects to Supabase and uses the following tables:

- **`ephemeral_tokens`** - Token requests/just-in-time access tokens
- **`audit_logs`** - Authentication and API access logs  
- **`data_sources`** - Data sources (shown as "agents" in the UI)
- **`global_tokens`** - Global authentication tokens
- **`user_api_tokens`** - User API tokens

The dashboard automatically maps these tables to the UI:
- Ephemeral tokens → "Live token requests"
- Audit logs → "Auth attempts"
- Data sources → "Agents" filter dropdown

## Connecting to Your Supabase Database

The dashboard will automatically connect to Supabase when you add your credentials to `.env`. If Supabase is not configured, it will fall back to mock data for demos.

**Enable Realtime in Supabase:**
1. Go to your Supabase Dashboard
2. Database → Replication
3. Enable replication for:
   - `ephemeral_tokens`
   - `audit_logs`

This enables live updates when new data is inserted.

## Technologies

- React 18
- TypeScript
- TailwindCSS
- Recharts
- Vite

## License

MIT

