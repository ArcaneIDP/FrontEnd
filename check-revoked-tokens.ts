import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function checkRevokedTokens() {
  const { data, error } = await supabase
    .from('ephemeral_tokens')
    .select('id, is_revoked, created_at, justification')
    .order('created_at', { ascending: false })
    .limit(20);

  console.log('Total tokens:', data?.length);
  console.log('Revoked tokens:', data?.filter(t => t.is_revoked).length);
  console.log('Granted tokens:', data?.filter(t => !t.is_revoked).length);
  
  if (data?.filter(t => t.is_revoked).length! > 0) {
    console.log('\nRevoked tokens:');
    data?.filter(t => t.is_revoked).forEach(t => {
      console.log(`- ${t.id}: ${t.justification}`);
    });
  }
}

checkRevokedTokens();
