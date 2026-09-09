import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getGoogleAuthUrl, authUserQueryOptions, verifyEmail, resendVerificationEmail } from './auth'
import { API_URL } from './config'

describe('Auth Client Lib', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('generates correct Google OAuth login URL', () => {
    const url = getGoogleAuthUrl()
    expect(url).toBe(`${API_URL}/auth/google/login`)
  })

  it('defines valid auth query options', () => {
    expect(authUserQueryOptions.queryKey).toEqual(['auth', 'me'])
    expect(authUserQueryOptions.staleTime).toBe(1000 * 60 * 5)
    expect(authUserQueryOptions.retry).toBe(false)
  })

  it('calls verifyEmail with correct endpoint and payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'Email verified successfully.' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await verifyEmail('test-token-123')
    expect(fetchMock).toHaveBeenCalledWith(
      `${API_URL}/auth/verify-email`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ token: 'test-token-123' }),
      })
    )
    expect(result).toBe('Email verified successfully.')
  })

  it('calls resendVerificationEmail with correct endpoint and payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'Confirmation link sent.' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await resendVerificationEmail('user@foxelsignal.io')
    expect(fetchMock).toHaveBeenCalledWith(
      `${API_URL}/auth/resend-verification`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'user@foxelsignal.io' }),
      })
    )
    expect(result).toBe('Confirmation link sent.')
  })
})

