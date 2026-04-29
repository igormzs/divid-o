import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dkberpcxqyatoswilgxz.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrYmVycGN4cXlhdG9zd2lsZ3h6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MjU0OTAsImV4cCI6MjA4OTUwMTQ5MH0.Gp3ZpTKE1ZdlzjQ5Wz00Ymt0uggbjWPXh4Ym0EERR4M'
);

async function test() {
  console.log("Creating dummy user for testing...");
  const dummyEmail = `test_${Date.now()}@example.com`;
  
  const { data: authData, error: authErr } = await supabase.auth.signUp({
    email: dummyEmail,
    password: 'password123',
  });
  
  if (authErr) {
    console.error("Auth Error:", authErr);
    return;
  }
  
  console.log("Logged in. User ID:", authData.user?.id);
  
  console.log("Attempting to insert into groups...");
  // Try inserting
  const { data: group, error: groupErr } = await supabase.from('groups').insert({
    name: 'Test Setup',
    description: 'Testing if it hangs',
    created_by: authData.user?.id
  }).select().single();
  
  if (groupErr) {
    console.error("Group Error:", groupErr);
    return;
  }
  
  console.log("Successfully inserted group:", group.name);
  console.log("Exiting test.");
}

test().catch(console.error);
