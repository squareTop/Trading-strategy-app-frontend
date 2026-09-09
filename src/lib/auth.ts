import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { API_URL } from './config'

export interface User {
  id: string
  email: string
  username?: string | null
  full_name?: string | null
  avatar_url?: string | null
  is_active: boolean
  is_verified: boolean
  is_superuser: boolean
  oauth_provider?: string | null
  created_at: string
}

export async function fetchCurrentUser(): Promise<User | null> {
  try {
    const res = await fetch(`${API_URL}/auth/me`, {
      credentials: 'include',
    })
    if (res.status === 401 || res.status === 403) {
      return null
    }
    if (!res.ok) {
      return null
    }
    return await res.json()
  } catch {
    return null
  }
}

export async function loginUser(creds: {
  login: string
  password: string
}): Promise<User> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(creds),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.detail || 'Login failed')
  }
  return data.user
}

export async function registerUser(creds: {
  email: string
  password: string
  username?: string
  full_name?: string
}): Promise<User> {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(creds),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.detail || 'Registration failed')
  }
  return data.user
}

export async function verifyEmail(token: string): Promise<string> {
  const res = await fetch(`${API_URL}/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ token }),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.detail || 'Failed to verify email')
  }
  return data.message || 'Email verified successfully.'
}

export async function resendVerificationEmail(email: string): Promise<string> {
  const res = await fetch(`${API_URL}/auth/resend-verification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email }),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.detail || 'Failed to resend verification email')
  }
  return data.message || 'Verification link sent.'
}

export async function logoutUser(): Promise<void> {
  await fetch(`${API_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  })
}

export function getGoogleAuthUrl(): string {
  return `${API_URL}/auth/google/login`
}

export const authUserQueryOptions = queryOptions({
  queryKey: ['auth', 'me'],
  queryFn: fetchCurrentUser,
  staleTime: 1000 * 60 * 5,
  retry: false,
})

export function useAuth() {
  const queryClient = useQueryClient()
  const {
    data: user,
    isLoading,
    isError,
    refetch,
  } = useQuery(authUserQueryOptions)

  const loginMutation = useMutation({
    mutationFn: loginUser,
    onSuccess: (newUser) => {
      queryClient.setQueryData(['auth', 'me'], newUser)
    },
  })

  const registerMutation = useMutation({
    mutationFn: registerUser,
    onSuccess: (newUser) => {
      queryClient.setQueryData(['auth', 'me'], newUser)
    },
  })

  const logoutMutation = useMutation({
    mutationFn: logoutUser,
    onSuccess: () => {
      queryClient.setQueryData(['auth', 'me'], null)
    },
  })

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user,
    isError,
    refetchUser: refetch,
    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error,
    register: registerMutation.mutateAsync,
    isRegistering: registerMutation.isPending,
    registerError: registerMutation.error,
    logout: logoutMutation.mutateAsync,
    isLoggingOut: logoutMutation.isPending,
  }
}
