const url = process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/groups?select=*';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log("Testing latency...");
const start = Date.now();
fetch(url, { headers: { 'apikey': anonKey, 'Authorization': 'Bearer ' + anonKey } })
  .then(res => res.json())
  .then(data => console.log('Groups fetch took', Date.now() - start, 'ms', data))
  .catch(console.error);
