// Test script to insert data into Supabase and check if frontend updates
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function insertTestData() {
  console.log('🧪 Inserting test data into Supabase...\n');

  // First, get a data source ID
  const { data: dataSources } = await supabase
    .from('data_sources')
    .select('id')
    .limit(1);

  if (!dataSources || dataSources.length === 0) {
    console.error('❌ No data sources found. Please create a data source first.');
    return;
  }

  const dataSourceId = dataSources[0].id;
  console.log(`📊 Using data source ID: ${dataSourceId}\n`);

  // Insert a test ephemeral token
  console.log('1️⃣ Inserting test ephemeral token...');
  const { data: token, error: tokenError } = await supabase
    .from('ephemeral_tokens')
    .insert({
      token_value: `test-token-${Date.now()}`,
      user_id: '00000000-0000-0000-0000-000000000000', // Test user ID
      data_source_id: dataSourceId,
      scope: 'TEST_SCOPE',
      justification: 'Test insert to verify frontend real-time updates',
      expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      is_revoked: false,
      metadata: { test: true, timestamp: new Date().toISOString() },
    })
    .select()
    .single();

  if (tokenError) {
    console.error('❌ Error inserting ephemeral token:', tokenError);
    return;
  }
  console.log('✅ Ephemeral token inserted:', token.id);
  console.log('   Created at:', token.created_at);
  console.log('   Expires at:', token.expires_at);
  console.log('   Justification:', token.justification);

  // Insert a test audit log
  console.log('\n2️⃣ Inserting test audit log...');
  const { data: auditLog, error: auditError } = await supabase
    .from('audit_logs')
    .insert({
      user_id: '00000000-0000-0000-0000-000000000000',
      data_source_id: dataSourceId,
      ephemeral_token_id: token.id,
      action: 'TEST_ACTION',
      method: 'TEST',
      path: '/test/endpoint',
      status_code: 200,
      ip_address: '127.0.0.1',
      user_agent: 'test-script',
      duration_ms: 123,
      metadata: { test: true, timestamp: new Date().toISOString() },
    })
    .select()
    .single();

  if (auditError) {
    console.error('❌ Error inserting audit log:', auditError);
  } else {
    console.log('✅ Audit log inserted:', auditLog.id);
    console.log('   Timestamp:', auditLog.timestamp);
    console.log('   Action:', auditLog.action);
    console.log('   Status:', auditLog.status_code);
  }

  console.log('\n🎯 Check your frontend now! The new records should appear automatically.');
  console.log('   If you see the new records in the dashboard, real-time is working! ✅\n');

  // Clean up after 5 seconds
  console.log('🧹 Will clean up test data in 30 seconds...');
  setTimeout(async () => {
    console.log('\nDeleting test records...');
    await supabase.from('audit_logs').delete().eq('id', auditLog?.id);
    await supabase.from('ephemeral_tokens').delete().eq('id', token.id);
    console.log('✅ Test data cleaned up');
  }, 30000);
}

insertTestData().catch(console.error);

