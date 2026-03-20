import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

/**
 * Auth-aware Supabase browser client.
 * createBrowserClient is a singleton per URL+key — calling it multiple
 * times returns the same instance, so there are no duplicate listeners.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

/**
 * Alias for createClient — kept for backward compat with pages that import
 * createTypedClient. Same singleton instance, fully typed and auth-aware.
 */
export function createTypedClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
