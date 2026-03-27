import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

/**
 * Auth-aware Supabase browser client.
 * Returns a cached singleton instance to avoid duplicate listeners and infinite loops.
 */
export function createClient() {
  if (client) return client;
  
  client = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  return client;
}

/**
 * Alias for createClient - fully typed and auth-aware.
 */
export function createTypedClient() {
  return createClient();
}
