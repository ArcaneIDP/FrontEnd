import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function debugTokenTransform() {
  const { data, error } = await supabase
    .from('ephemeral_tokens')
    .select('*, data_sources!left(id, name), user_api_tokens!left(id, name)')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\n🔍 Raw Data from Supabase:');
  data?.forEach((token, i) => {
    console.log(`\n--- Token ${i + 1} ---`);
    console.log(`ID: ${token.id}`);
    console.log(`is_revoked: ${token.is_revoked}`);
    console.log(`data_sources: ${JSON.stringify(token.data_sources)}`);
    
    const decision = token.is_revoked ? 'DENIED' : 'GRANTED';
    const agent = token.data_sources?.name || 'Unknown Agent';
    
    console.log(`→ Transformed decision: ${decision}`);
    console.log(`→ Transformed agent: ${agent}`);
  });
}

debugTokenTransform();
