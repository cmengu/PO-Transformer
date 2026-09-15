export type SupabaseConfig = {
  url: string
  publishableKey: string
}

export function getSupabaseConfig(
  env: Record<string, string | undefined> = process.env,
): SupabaseConfig {
  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!url || !publishableKey) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.',
    )
  }

  return { url, publishableKey }
}
