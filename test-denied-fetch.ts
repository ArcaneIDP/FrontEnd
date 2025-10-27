import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function testFetch() {
  const { data, error } = await supabase
    .from('ephemeral_tokens')
    .select('*, data_sources!left(id, name), user_api_tokens!left(id, name)')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Error:', error);
    return;
  }

  const transformed = (data || []).map(token => ({
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
    },
  }));

  console.log('\n📊 Transformed data:');
  console.log(`Total: ${transformed.length}`);
  console.log(`Granted: ${transformed.filter(t => t.decision === 'GRANTED').length}`);
  console.log(`Denied: ${transformed.filter(t => t.decision === 'DENIED').length}`);
  
  console.log('\n❌ DENIED tokens in transformed data:');
  transformed.filter(t => t.decision === 'DENIED').forEach(t => {
    console.log(`  - ID: ${t.id}`);
    console.log(`    Agent: ${t.agent}`);
    console.log(`    Decision: ${t.decision}`);
    console.log(`    Reason: ${t.reason}`);
  });
}

testFetch();
