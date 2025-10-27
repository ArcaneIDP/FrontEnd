import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function checkAllTokens() {
  const { data, error } = await supabase
    .from('ephemeral_tokens')
    .select('id, is_revoked, created_at, justification, scope')
    .order('created_at', { ascending: false })
    .limit(20);

  console.log('\n📊 Token Status Summary:');
  console.log(`Total tokens: ${data?.length}`);
  console.log(`Granted (is_revoked = false): ${data?.filter(t => !t.is_revoked).length}`);
  console.log(`Denied (is_revoked = true): ${data?.filter(t => t.is_revoked).length}\n`);
  
  if (data && data.filter(t => t.is_revoked).length > 0) {
    console.log('❌ DENIED Tokens:');
    data.filter(t => t.is_revoked).forEach(t => {
      console.log(`  - ${t.id}`);
      console.log(`    Created: ${t.created_at}`);
      console.log(`    Scope: ${t.scope}`);
      console.log(`    Justification: ${t.justification}`);
    });
  } else {
    console.log('ℹ️  No denied tokens found in database');
  }
}

checkAllTokens();
