import { describe, it, expect } from 'vitest'
import { getGoogleAuthUrl, authUserQueryOptions } from './auth'
import { API_URL } from './config'

describe('Auth Client Lib', () => {
  it('generates correct Google OAuth login URL', () => {
    const url = getGoogleAuthUrl()
    expect(url).toBe(`${API_URL}/auth/google/login`)
  })

  it('defines valid auth query options', () => {
    expect(authUserQueryOptions.queryKey).toEqual(['auth', 'me'])
    expect(authUserQueryOptions.staleTime).toBe(1000 * 60 * 5)
    expect(authUserQueryOptions.retry).toBe(false)
  })
})
