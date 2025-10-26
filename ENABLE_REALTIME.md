# How to Enable Realtime in Supabase

## Step 1: Go to Database Settings
1. Open https://supabase.com/dashboard
2. Select your project: **Arcane Prod**
3. Click **"Database"** in the left sidebar
4. Click **"Replication"** in the submenu

## Step 2: Enable Replication
For each table, click the toggle to enable replication:

✅ **ephemeral_tokens** - Enable this
✅ **audit_logs** - Enable this

If you see "Realtime not available" or "Using Supabase Realtime", it's already active.

## Step 3: Verify
After enabling, new records inserted into these tables will automatically appear in your dashboard!

## Alternative: Use SQL to Check Realtime Status

You can run this in Supabase SQL Editor:

```sql
-- Check if replication is enabled
SELECT 
    schemaname,
    tablename,
    relreplident
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE relkind = 'r' 
  AND n.nspname = 'public'
  AND tablename IN ('ephemeral_tokens', 'audit_logs', 'data_sources')
ORDER BY tablename;
```

If `relreplident = 'd'` or `relreplident = 'f'`, replication is enabled.

