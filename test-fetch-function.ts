import { fetchEphemeralTokens } from './src/lib/supabase-queries';

async function test() {
  const data = await fetchEphemeralTokens();
  
  console.log('\n📊 Fetched tokens:');
  console.log(`Total: ${data.length}`);
  console.log(`Granted: ${data.filter(t => t.decision === 'GRANTED').length}`);
  console.log(`Denied: ${data.filter(t => t.decision === 'DENIED').length}`);
  
  console.log('\n❌ DENIED tokens:');
  data.filter(t => t.decision === 'DENIED').forEach(t => {
    console.log(`  - ID: ${t.id}`);
    console.log(`    Agent: ${t.agent}`);
    console.log(`    Decision: ${t.decision}`);
    console.log(`    Reason: ${t.reason}`);
  });
}

test();
