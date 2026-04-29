import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  console.log("Signing up dummy user...");
  // generate random email
  const email = 'test' + Date.now() + '@divid-o.com';
  const { data: auth, error: err } = await supabase.auth.signUp({
    email,
    password: 'password123'
  });
  
  if (err) {
    console.error("Signup failed:", err);
    return;
  }
  
  const token = auth.session?.access_token;
  console.log("Got token length:", token?.length);
  
  console.log("Testing insert group...");
  const start = Date.now();
  const { data: group, error: insertErr } = await supabase
    .from('groups')
    .insert({ name: 'Speed Test', created_by: auth.user.id })
    .select()
    .single();
    
  console.log("Insert took", Date.now() - start, "ms", insertErr || "Success");
  
  console.log("Testing select groups...");
  const s2 = Date.now();
  const { data: groups, error: selErr } = await supabase
    .from('groups')
    .select('*');
  console.log("Select took", Date.now() - s2, "ms", selErr || `Found ${groups?.length}`);
}
run();
