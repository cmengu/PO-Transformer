import { describe, expect, it } from 'vitest'
import { parseCredentials } from './credentials'

describe('pilot login credentials', () => {
  it('normalizes valid pilot emails', () => {
    expect(parseCredentials({ email: ' Pilot@Example.com ', password: 'temporary-password' })).toEqual({
      email: 'pilot@example.com',
      password: 'temporary-password',
    })
  })

  it('rejects missing, malformed, and blank credentials', () => {
    expect(parseCredentials({ email: 'not-an-email', password: 'password' })).toBeNull()
    expect(parseCredentials({ email: 'pilot@example.com', password: '' })).toBeNull()
    expect(parseCredentials({ email: 'pilot@example.com' })).toBeNull()
  })
})
