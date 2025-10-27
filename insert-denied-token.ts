import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function insertDeniedToken() {
  // Get a data source
  const { data: dataSource } = await supabase
    .from('data_sources')
    .select('id')
    .limit(1)
    .single();

  if (!dataSource) {
    console.log('No data source found');
    return;
  }

  // Insert a revoked (DENIED) token
  const { data, error } = await supabase
    .from('ephemeral_tokens')
    .insert({
      token_value: `denied-token-${Date.now()}`,
      user_id: '00000000-0000-0000-0000-000000000000',
      data_source_id: dataSource.id,
      scope: 'read:all',
      justification: 'This request was denied due to excessive scope',
      expires_at: new Date(Date.now() + 3600000).toISOString(),
      is_revoked: true, // THIS MAKES IT DENIED
      metadata: { reason: 'overscope', policy_violation: true },
    })
    .select()
    .single();

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('✅ Denied token inserted:', data.id);
    console.log('   Justification:', data.justification);
    console.log('   Is revoked:', data.is_revoked);
  }
}

insertDeniedToken();
