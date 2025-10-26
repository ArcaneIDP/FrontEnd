# How to Get Your Supabase Credentials

## Step 1: Go to Your Supabase Project
1. Go to https://supabase.com/dashboard
2. Login if needed
3. Click on your project: **"Arcane Prod"**

## Step 2: Go to API Settings
1. In the left sidebar, click on **"Settings"** (gear icon at the bottom)
2. Click on **"API"** in the settings menu

## Step 3: Copy Your Credentials
You'll see:
- **Project URL** - Copy this entire URL
- **anon public key** - Copy this key (starts with `eyJ...`)

## Step 4: Create Your .env File
In the root directory of your project, create a `.env` file:

```bash
# In your terminal (from /Users/aaronsharif/frontend/FrontEnd/)
cat > .env << 'EOF'
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
EOF
```

Or create it manually and add:
```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Replace with your actual values from Supabase!**

## Step 5: Restart Your Dev Server
After creating the .env file, restart the dev server:

```bash
# Stop the current server (Ctrl+C)
npm run dev
```

The dashboard will now connect to your Supabase database and show real data!

