import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { API_URL } from './config'

export interface WatchlistItem {
  id: string
  symbol: string
  name: string | null
  price: number | null
  day_pct: number | null
  market_cap: number | null
  ps: number | null
  pe: number | null
  ytd: number | null
  one_yr: number | null
  pct_from_52w_high: number | null
  intrinsic_value: number | null
  over_under_pct: number | null
  iv_status?: 'ready' | 'pending' | 'not_applicable'
  created_at: string
}

export async function fetchWatchlist(): Promise<WatchlistItem[]> {
  const res = await fetch(`${API_URL}/watchlist`, {
    credentials: 'include',
  })
  if (res.status === 401 || res.status === 403) {
    throw new Error('Not authenticated')
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Failed to fetch watchlist')
  }
  return await res.json()
}

export async function addToWatchlist(symbol: string): Promise<WatchlistItem> {
  const res = await fetch(`${API_URL}/watchlist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ symbol }),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.detail || 'Failed to add ticker to watchlist')
  }
  return data
}

export async function removeFromWatchlist(symbol: string): Promise<void> {
  const res = await fetch(`${API_URL}/watchlist/${encodeURIComponent(symbol)}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.detail || 'Failed to remove ticker from watchlist')
  }
}

export const watchlistQueryOptions = queryOptions({
  queryKey: ['watchlist'],
  queryFn: fetchWatchlist,
  staleTime: 1000 * 60 * 2, // 2 minutes
})

export function useWatchlist() {
  const queryClient = useQueryClient()
  const { data, isLoading, isError, error, refetch } = useQuery({
    ...watchlistQueryOptions,
    refetchInterval: (query) => {
      const items = query.state.data
      if (!items) return false
      const hasPending = items.some(
        (item) =>
          item.iv_status === 'pending' ||
          (item.intrinsic_value === null && item.iv_status !== 'not_applicable')
      )
      return hasPending ? 3000 : false
    },
  })

  const addMutation = useMutation({
    mutationFn: addToWatchlist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] })
    },
  })

  const removeMutation = useMutation({
    mutationFn: removeFromWatchlist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] })
    },
  })

  return {
    watchlist: data ?? [],
    isLoading,
    isError,
    error,
    refetch,
    addStock: addMutation.mutateAsync,
    isAdding: addMutation.isPending,
    addError: addMutation.error,
    removeStock: removeMutation.mutateAsync,
    isRemoving: removeMutation.isPending,
  }
}
