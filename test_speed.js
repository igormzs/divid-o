const fs = require('fs');
const dotenv = require('dotenv');
const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
const supabaseUrl = envConfig.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function check() {
  console.log("Checking Supabase latency...");
  try {
    const start = Date.now();
    const res = await fetch(`${supabaseUrl}/rest/v1/groups?select=*`, {
      method: 'GET',
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const duration = Date.now() - start;
    if (res.ok) {
      const data = await res.json();
      console.log(`Fetch ok in ${duration}ms! Results:`, data);
    } else {
      console.log(`Fetch failed in ${duration}ms with status:`, res.status, await res.text());
    }
  } catch (e) {
    console.error("Fetch threw error:", e.message);
  }
}
check();
