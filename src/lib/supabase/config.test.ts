import { describe, expect, it } from 'vitest'
import { getSupabaseConfig } from './config'

describe('Supabase configuration', () => {
  it('returns the public project configuration', () => {
    expect(
      getSupabaseConfig({
        NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'publishable-key',
      }),
    ).toEqual({
      url: 'https://example.supabase.co',
      publishableKey: 'publishable-key',
    })
  })

  it('does not allow an incomplete configuration', () => {
    expect(() => getSupabaseConfig({})).toThrow('Supabase is not configured')
    expect(() => getSupabaseConfig({ NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co' })).toThrow(
      'Supabase is not configured',
    )
  })
})
