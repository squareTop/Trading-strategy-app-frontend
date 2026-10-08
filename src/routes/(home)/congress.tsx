import { queryOptions, useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useMemo, useRef, useEffect } from 'react'
import {
  Search,
  RefreshCw,
  ExternalLink,
  Filter,
  LayoutGrid,
  Table as TableIcon,
  Building2,
  User,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpRight,
  X,
  Landmark,
} from 'lucide-react'
import { API_URL } from '../../lib/config'
import { formatPrice } from '../../lib/utils'
import CongressSkeleton from '../../components/skeletons/CongressSkeleton'
import { TickerAutocomplete } from '../../components/TickerAutocomplete'

export interface CongressDisclosure {
  id?: string
  chamber: 'Senate' | 'House'
  name: string
  firstName?: string
  lastName?: string
  office?: string
  symbol: string
  disclosureDate: string
  transactionDate: string
  type: string
  amount: string
  owner: string
  assetDescription: string
  assetType: string
  district: string
  link: string
  senateID?: string
  comment?: string
  currentPrice?: number | null
  tradePrice?: number | null
  changeSinceTrade?: number | null
}

export interface CongressMember {
  bioguideId: string
  name: string
  chamber: 'Senate' | 'House'
  state: string
  district: string
  party: string
  imageUrl: string
  tradesCount: number
}

export interface CongressEnvelope {
  items: CongressDisclosure[]
  total: number
  page: number
  limit: number
  total_pages: number
}

export interface CongressSearchParams {
  chamber?: 'all' | 'senate' | 'house'
  member?: string
  bioguideId?: string
  symbol?: string
  type?: 'all' | 'Purchase' | 'Sale' | 'Exchange'
  assetType?: string
  owner?: string
  dateRange?: string
  sortBy?: 'disclosure_date' | 'transaction_date' | 'change_since_trade'
  sortOrder?: 'desc' | 'asc'
  page?: number
  pageSize?: number
  view?: 'feed' | 'table'
}

export interface CongressFilterApiParams {
  chamber: 'all' | 'senate' | 'house'
  bioguideId?: string
  member?: string
  symbol?: string
  type?: string
  assetType?: string
  owner?: string
  startDate?: string
  endDate?: string
  sortBy?: 'disclosure_date' | 'transaction_date' | 'change_since_trade'
  sortOrder?: 'desc' | 'asc'
  page: number
  limit: number
}

export const congressQueryOptions = (params: CongressFilterApiParams) =>
  queryOptions({
    queryKey: ['congressLatest', params],
    queryFn: async () => {
      const sp = new URLSearchParams()
      sp.append('envelope', 'true')
      if (params.chamber && params.chamber !== 'all') sp.append('chamber', params.chamber)
      if (params.bioguideId) sp.append('bioguide_id', params.bioguideId)
      if (params.member) sp.append('member', params.member)
      if (params.symbol) sp.append('symbol', params.symbol.trim())
      if (params.type && params.type !== 'all') sp.append('type', params.type)
      if (params.assetType && params.assetType !== 'all') sp.append('asset_type', params.assetType)
      if (params.owner && params.owner !== 'all') sp.append('owner', params.owner)
      if (params.startDate) sp.append('start_date', params.startDate)
      if (params.endDate) sp.append('end_date', params.endDate)
      if (params.sortBy) sp.append('sort_by', params.sortBy)
      if (params.sortOrder) sp.append('sort_order', params.sortOrder)
      sp.append('page', String(params.page))
      sp.append('limit', String(params.limit))

      const response = await fetch(`${API_URL}/api/congress-latest?${sp.toString()}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch congress disclosures: status ${response.status}`)
      }
      return response.json() as Promise<CongressEnvelope>
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  })

export const congressMembersQueryOptions = (query: string = '', chamber: string = 'all') =>
  queryOptions({
    queryKey: ['congressMembers', { query, chamber }],
    queryFn: async () => {
      const sp = new URLSearchParams()
      if (query.trim()) sp.append('query', query.trim())
      if (chamber && chamber !== 'all') sp.append('chamber', chamber)
      sp.append('limit', '40')
      const response = await fetch(`${API_URL}/api/congress/members?${sp.toString()}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch congress members: status ${response.status}`)
      }
      return response.json() as Promise<CongressMember[]>
    },
    staleTime: 10 * 60 * 1000,
  })

export const Route = createFileRoute('/(home)/congress')({
  validateSearch: (search: Record<string, unknown>): CongressSearchParams => ({
    chamber: (search.chamber as 'all' | 'senate' | 'house') || 'all',
    member: (search.member as string) || undefined,
    bioguideId: (search.bioguideId as string) || undefined,
    symbol: (search.symbol as string) || undefined,
    type: (search.type as any) || undefined,
    assetType: (search.assetType as string) || undefined,
    owner: (search.owner as string) || undefined,
    dateRange: (search.dateRange as string) || undefined,
    sortBy: (search.sortBy as any) || undefined,
    sortOrder: (search.sortOrder as any) || undefined,
    page: typeof search.page === 'number' ? search.page : Number(search.page) || 0,
    pageSize: typeof search.pageSize === 'number' ? search.pageSize : Number(search.pageSize) || 24,
    view: (search.view as 'feed' | 'table') || 'feed',
  }),
  head: () => ({
    meta: [
      {
        title: 'Congress Trades & STOCK Act Disclosures | FoxelSignal',
      },
      {
        name: 'description',
        content:
          'Real-time tracking of U.S. Senate and House financial disclosures, congressional stock transactions, Capitol Hill insider filings, and post-trade performance analytics.',
      },
    ],
  }),
  loader: async ({ context }) => {
    await context.queryClient
      .ensureQueryData(
        congressQueryOptions({
          chamber: 'all',
          page: 0,
          limit: 24,
        })
      )
      .catch(() => {})
  },
  pendingComponent: CongressSkeleton,
  pendingMs: 50,
  pendingMinMs: 300,
  component: CongressDisclosuresPage,
})

// Helper to calculate relative time (e.g. "1d ago", "2w ago")
function getRelativeTime(dateStr: string): string {
  if (!dateStr) return 'N/A'
  try {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return dateStr
    if (diffDays === 0) return 'today'
    if (diffDays === 1) return '1d ago'
    if (diffDays < 7) return `${diffDays}d ago`
    const diffWeeks = Math.floor(diffDays / 7)
    if (diffWeeks < 4) return `${diffWeeks}w ago`
    const diffMonths = Math.floor(diffDays / 30)
    if (diffMonths < 12) return `${diffMonths}mo ago`
    const diffYears = Math.floor(diffDays / 365)
    return `${diffYears}y ago`
  } catch {
    return dateStr
  }
}

// Helper to calculate days between two dates (filing lag)
function getDaysBetween(date1: string, date2: string): number | null {
  if (!date1 || !date2) return null
  try {
    const d1 = new Date(date1)
    const d2 = new Date(date2)
    const diffTime = Math.abs(d2.getTime() - d1.getTime())
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))
    return isNaN(diffDays) ? null : diffDays
  } catch {
    return null
  }
}

// Fallback Bioguide IDs for active Congress members
const BIOGUIDE_FALLBACKS: Record<string, string> = {
  'cory booker': 'B001288',
  'john fetterman': 'F000479',
  'lloyd doggett': 'D000399',
  'david taylor': 'T000490',
  'michael rulli': 'R000619',
  'nancy pelosi': 'P000197',
  'ro khanna': 'K000389',
  'marjorie taylor greene': 'G000596',
  'tommy tuberville': 'T000278',
  'markwayne mullin': 'M001190',
  'mitch mcconnell': 'M000355',
  'bernie sanders': 'S000033',
  'ted cruz': 'C001098',
}

// Politician Avatar with headshots
function PoliticianAvatar({
  name,
  senateID,
  chamber,
  size = 'md',
}: {
  name: string
  senateID?: string
  chamber: 'Senate' | 'House'
  size?: 'sm' | 'md' | 'lg'
}) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)

  const cleanName = name.replace(/^(Hon\.|Senator|Representative|Rep\.|Sen\.)\s+/i, '').trim()
  const resolvedId = senateID || BIOGUIDE_FALLBACKS[cleanName.toLowerCase()]
  const imageUrl = resolvedId ? `https://images.financialmodelingprep.com/senate/${resolvedId}.jpg` : ''

  const sizeClasses = {
    sm: 'w-7 h-7 text-[10px]',
    md: 'w-10 h-10 text-xs',
    lg: 'w-12 h-12 text-sm',
  }[size]
  const initials = cleanName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

  const isHouse = chamber === 'House'

  return (
    <div
      className={`relative ${sizeClasses} rounded-full overflow-hidden shrink-0 border border-brand-border/80 shadow-xs bg-gray-100 select-none`}
      title={`${name} (${chamber})`}
    >
      {(!isLoaded || hasError || !imageUrl) && (
        <div
          className={`absolute inset-0 flex items-center justify-center font-bold font-mono ${
            isHouse
              ? 'bg-linear-to-br from-purple-100 to-indigo-200 text-purple-900'
              : 'bg-linear-to-br from-brand-primary/15 to-brand-primary/35 text-brand-dark'
          }`}
        >
          {initials || <User className="w-3.5 h-3.5 opacity-60" />}
        </div>
      )}

      {imageUrl && !hasError && (
        <img
          src={imageUrl}
          alt=""
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-250 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          loading="lazy"
        />
      )}
    </div>
  )
}

// Company Logo
function CompanyLogo({ symbol }: { symbol: string }) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [srcIndex, setSrcIndex] = useState(0)

  const sources = useMemo(() => {
    if (!symbol) return []
    const clean = symbol.trim().toUpperCase()
    return [
      `https://assets.parqet.com/logos/symbol/${clean}?format=png`,
      `https://images.financialmodelingprep.com/symbol/${clean}.png`,
    ]
  }, [symbol])

  const currentSrc = sources[srcIndex]
  const hasFailedAll = srcIndex >= sources.length

  const handleError = () => {
    setSrcIndex((prev) => prev + 1)
    setIsLoaded(false)
  }

  return (
    <div className="relative w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 overflow-hidden shrink-0 shadow-2xs select-none flex items-center justify-center">
      {(!isLoaded || hasFailedAll || !symbol) && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center font-mono text-[11px] font-bold text-gray-600 whitespace-nowrap select-none">
          {symbol?.slice(0, 4) || <Building2 className="w-4 h-4 text-gray-400 shrink-0" />}
        </div>
      )}

      {symbol && !hasFailedAll && currentSrc && (
        <img
          key={currentSrc}
          src={currentSrc}
          alt=""
          onLoad={() => setIsLoaded(true)}
          onError={handleError}
          className={`absolute inset-0 w-full h-full object-contain p-1.5 transition-opacity duration-200 [filter:drop-shadow(0_0_1px_rgba(0,0,0,0.3))] ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          loading="lazy"
        />
      )}
    </div>
  )
}

function CongressDisclosuresPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  // Derive all filter states from URL search params
  const selectedChamber = search.chamber || 'all'
  const symbol = search.symbol || ''
  const selectedBioguideId = search.bioguideId
  const memberName = search.member || ''
  const typeFilter = search.type || 'all'
  const assetTypeFilter = search.assetType || 'all'
  const ownerFilter = search.owner || 'all'
  const dateRangeFilter = search.dateRange || 'all'
  const sortBy = search.sortBy || 'disclosure_date'
  const sortOrder = search.sortOrder || 'desc'
  const page = search.page || 0
  const pageSize = search.pageSize || 24
  const viewMode = search.view || 'feed'

  // Local state for politician search input & dropdown
  const [memberSearchInput, setMemberSearchInput] = useState('')
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false)
  const memberDropdownRef = useRef<HTMLDivElement>(null)

  // Helper to update URL search parameters
  const updateSearch = (newParams: Partial<CongressSearchParams>) => {
    navigate({
      search: (prev) => {
        const merged: Record<string, any> = { ...prev, ...newParams }
        // Clean default/empty values to keep URL concise
        if (merged.chamber === 'all') delete merged.chamber
        if (!merged.member) delete merged.member
        if (!merged.bioguideId) delete merged.bioguideId
        if (!merged.symbol) delete merged.symbol
        if (merged.type === 'all' || !merged.type) delete merged.type
        if (merged.assetType === 'all' || !merged.assetType) delete merged.assetType
        if (merged.owner === 'all' || !merged.owner) delete merged.owner
        if (merged.dateRange === 'all' || !merged.dateRange) delete merged.dateRange
        if (merged.sortBy === 'disclosure_date' || !merged.sortBy) delete merged.sortBy
        if (merged.sortOrder === 'desc' || !merged.sortOrder) delete merged.sortOrder
        if (merged.page === 0 || !merged.page) delete merged.page
        if (merged.pageSize === 24 || !merged.pageSize) delete merged.pageSize
        if (merged.view === 'feed' || !merged.view) delete merged.view
        return merged
      },
      replace: true,
    })
  }

  // Calculate start/end date from date range preset
  const { startDate, endDate } = useMemo(() => {
    const now = new Date()
    if (dateRangeFilter === '30d') {
      const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      return { startDate: past.toISOString().slice(0, 10), endDate: undefined }
    }
    if (dateRangeFilter === '90d') {
      const past = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      return { startDate: past.toISOString().slice(0, 10), endDate: undefined }
    }
    if (dateRangeFilter === '2026') {
      return { startDate: '2026-01-01', endDate: '2026-12-31' }
    }
    if (dateRangeFilter === '2025') {
      return { startDate: '2025-01-01', endDate: '2025-12-31' }
    }
    if (dateRangeFilter === '2024') {
      return { startDate: '2024-01-01', endDate: '2024-12-31' }
    }
    return { startDate: undefined, endDate: undefined }
  }, [dateRangeFilter])

  // Query disclosures with server-side pagination & filters
  const filterParams: CongressFilterApiParams = useMemo(
    () => ({
      chamber: selectedChamber,
      bioguideId: selectedBioguideId,
      member: memberName || undefined,
      symbol: symbol ? symbol.toUpperCase().trim() : undefined,
      type: typeFilter !== 'all' ? typeFilter : undefined,
      assetType: assetTypeFilter !== 'all' ? assetTypeFilter : undefined,
      owner: ownerFilter !== 'all' ? ownerFilter : undefined,
      startDate,
      endDate,
      sortBy,
      sortOrder,
      page,
      limit: pageSize,
    }),
    [
      selectedChamber,
      selectedBioguideId,
      memberName,
      symbol,
      typeFilter,
      assetTypeFilter,
      ownerFilter,
      startDate,
      endDate,
      sortBy,
      sortOrder,
      page,
      pageSize,
    ]
  )

  const {
    data: envelope,
    isLoading,
    isRefetching,
    refetch,
    dataUpdatedAt,
  } = useQuery(congressQueryOptions(filterParams))

  // Query members for the member filter dropdown
  const { data: membersList = [], isLoading: isLoadingMembers } = useQuery(
    congressMembersQueryOptions(memberSearchInput, selectedChamber)
  )

  // Close member dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (memberDropdownRef.current && !memberDropdownRef.current.contains(event.target as Node)) {
        setIsMemberDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const disclosures = envelope?.items || []
  const totalRecords = envelope?.total || 0
  const totalPages = envelope?.total_pages || 1

  const handleResetFilters = () => {
    setMemberSearchInput('')
    navigate({
      search: {},
      replace: true,
    })
  }

  const handleSelectMember = (member: CongressMember) => {
    setMemberSearchInput('')
    setIsMemberDropdownOpen(false)
    updateSearch({
      member: member.name,
      bioguideId: member.bioguideId,
      page: 0,
    })
  }

  const handleClearMember = () => {
    updateSearch({
      member: undefined,
      bioguideId: undefined,
      page: 0,
    })
  }

  const lastUpdatedTime = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : null

  return (
    <div className="min-h-screen bg-brand-bg text-brand-dark pb-16">
      {/* Page Header */}
      <section className="border-b border-brand-border bg-white px-3 sm:px-4 md:px-8 py-6 md:py-8">
        <div className="max-w-360 mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  STOCK Act Historical Database
                </span>
                <div className="flex items-center gap-1.5 text-xs text-gray-500 font-mono">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span>Live Disclosures</span>
                </div>
              </div>

              <h1 className="text-2xl sm:text-3xl font-display font-bold text-brand-dark tracking-tight">
                Congressional Financial Disclosures
              </h1>
              <p className="text-gray-600 text-xs sm:text-sm mt-1 max-w-2xl">
                Real-time and historical tracking of U.S. Senate and House of Representatives stock trades across Capitol Hill members, with live quotes and return analytics since trade date.
              </p>
            </div>

            {/* Refresh Button & Time */}
            <div className="flex items-center gap-3 shrink-0">
              {lastUpdatedTime && (
                <span className="hidden sm:inline text-xs text-gray-500 font-mono">
                  Updated: {lastUpdatedTime}
                </span>
              )}
              <button
                onClick={() => refetch()}
                disabled={isRefetching}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-mono font-bold bg-white border border-brand-border hover:border-brand-primary text-gray-700 hover:text-brand-primary active:bg-brand-bg active:scale-95 transition-all shadow-xs disabled:opacity-60 cursor-pointer select-none touch-manipulation whitespace-nowrap shrink-0"
                title="Refresh disclosures"
              >
                <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isRefetching ? 'animate-spin text-brand-primary' : ''}`} />
                <span>{isRefetching ? 'Updating...' : 'Refresh'}</span>
              </button>
            </div>
          </div>

          {/* Chamber Toggle Pills (Clean pills without confusing count numbers) */}
          <div className="flex items-center gap-1.5 sm:gap-2 mt-6 pt-4 border-t border-brand-border/60 overflow-x-auto">
            <span className="text-xs font-mono text-gray-400 font-semibold mr-1 shrink-0 whitespace-nowrap">Chamber:</span>

            {/* All Congress */}
            <button
              onClick={() => updateSearch({ chamber: 'all', page: 0 })}
              className={`inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap select-none ${
                selectedChamber === 'all'
                  ? 'bg-brand-dark text-white shadow-xs'
                  : 'bg-brand-bg/60 hover:bg-brand-bg text-gray-600 hover:text-brand-dark border border-brand-border'
              }`}
            >
              <Landmark className="w-3.5 h-3.5 shrink-0" />
              <span>All Congress</span>
            </button>

            {/* House */}
            <button
              onClick={() => updateSearch({ chamber: 'house', page: 0 })}
              className={`inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap select-none ${
                selectedChamber === 'house'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'bg-brand-bg/60 hover:bg-brand-bg text-purple-800 hover:text-purple-900 border border-purple-200'
              }`}
            >
              <span>🏛️ House</span>
            </button>

            {/* Senate */}
            <button
              onClick={() => updateSearch({ chamber: 'senate', page: 0 })}
              className={`inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap select-none ${
                selectedChamber === 'senate'
                  ? 'bg-sky-700 text-white shadow-xs'
                  : 'bg-brand-bg/60 hover:bg-brand-bg text-sky-800 hover:text-sky-900 border border-sky-200'
              }`}
            >
              <span>🏛️ Senate</span>
            </button>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-360 mx-auto px-3 sm:px-4 md:px-8 pt-6">
        {/* Comprehensive Filter Bar */}
        <div className="bg-white border border-brand-border rounded-xl p-3.5 sm:p-4 mb-6 shadow-xs space-y-3.5">
          {/* Row 1: Politician Search Dropdown & Ticker Autocomplete with Suggestions */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
            {/* Member Search / Dropdown Autocomplete */}
            <div className="relative flex-1 min-w-[280px]" ref={memberDropdownRef}>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                {memberName ? (
                  <div className="w-full flex items-center justify-between pl-9 pr-3 py-2 bg-brand-primary/5 border border-brand-primary/40 rounded-lg text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <PoliticianAvatar
                        name={memberName}
                        senateID={selectedBioguideId}
                        chamber={selectedChamber !== 'all' ? (selectedChamber === 'senate' ? 'Senate' : 'House') : 'House'}
                        size="sm"
                      />
                      <span className="font-bold text-brand-dark truncate">{memberName}</span>
                    </div>
                    <button
                      onClick={handleClearMember}
                      className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded cursor-pointer"
                      title="Clear politician filter"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <input
                    type="text"
                    value={memberSearchInput}
                    onChange={(e) => {
                      setMemberSearchInput(e.target.value)
                      setIsMemberDropdownOpen(true)
                    }}
                    onFocus={() => setIsMemberDropdownOpen(true)}
                    placeholder="Search Congress member (e.g. Pelosi, Tuberville, Ro Khanna)..."
                    className="w-full pl-9 pr-8 py-2 bg-brand-bg/40 border border-brand-border rounded-lg text-xs font-sans text-brand-dark placeholder-gray-400 focus:outline-none focus:border-brand-primary focus:bg-white transition-all"
                  />
                )}
                {memberSearchInput && !memberName && (
                  <button
                    onClick={() => setMemberSearchInput('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Members Dropdown Menu */}
              {isMemberDropdownOpen && !memberName && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-brand-border rounded-xl shadow-lg z-30 max-h-72 overflow-y-auto divide-y divide-gray-100">
                  <div className="p-2 bg-gray-50 text-[10px] font-mono font-bold text-gray-500 uppercase tracking-wider">
                    {memberSearchInput ? 'Matching Congress Members' : 'Most Active Stock Traders'}
                  </div>
                  {isLoadingMembers ? (
                    <div className="p-4 text-center text-xs text-gray-400">Loading members...</div>
                  ) : membersList.length === 0 ? (
                    <div className="p-4 text-center text-xs text-gray-400">No members found</div>
                  ) : (
                    membersList.map((m) => (
                      <button
                        key={m.bioguideId}
                        onClick={() => handleSelectMember(m)}
                        className="w-full px-3 py-2 text-left hover:bg-brand-bg/60 flex items-center justify-between gap-2 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <PoliticianAvatar name={m.name} senateID={m.bioguideId} chamber={m.chamber} size="sm" />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-brand-dark truncate">{m.name}</div>
                            <div className="text-[10px] font-mono text-gray-500">
                              {m.chamber} • {m.party} • {m.state}{m.district ? `-${m.district}` : ''}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded-full">
                            {m.tradesCount.toLocaleString()} trades
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Ticker Autocomplete Input with Real-time Suggestions (like home page) */}
            <div className="relative flex-1 min-w-[240px]">
              <TickerAutocomplete
                className="w-full"
                value={symbol}
                onChange={(val) => updateSearch({ symbol: val, page: 0 })}
                onSelectTicker={(sym) => updateSearch({ symbol: sym, page: 0 })}
                placeholder="Search stock ticker (e.g. NVDA, AAPL)..."
                inputClassName="w-full pl-9 pr-8 py-2 bg-brand-bg/40 border border-brand-border rounded-lg text-xs font-mono uppercase text-brand-dark placeholder-gray-400 focus:outline-none focus:border-brand-primary focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Row 2: Secondary Filters (Action, Asset, Owner, Date Range, Sort, View Mode) */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-brand-border/50">
            {/* Transaction Action */}
            <select
              value={typeFilter}
              onChange={(e) => updateSearch({ type: e.target.value as any, page: 0 })}
              className="px-2.5 py-1.5 bg-brand-bg/40 border border-brand-border rounded-lg text-xs font-mono font-medium text-gray-700 focus:outline-none focus:border-brand-primary cursor-pointer"
            >
              <option value="all">All Actions</option>
              <option value="Purchase">Purchases (Buy)</option>
              <option value="Sale">Sales (Sell)</option>
              <option value="Exchange">Exchanges</option>
            </select>

            {/* Asset Type */}
            <select
              value={assetTypeFilter}
              onChange={(e) => updateSearch({ assetType: e.target.value, page: 0 })}
              className="px-2.5 py-1.5 bg-brand-bg/40 border border-brand-border rounded-lg text-xs font-mono font-medium text-gray-700 focus:outline-none focus:border-brand-primary cursor-pointer"
            >
              <option value="all">All Asset Types</option>
              <option value="Stock">Stock</option>
              <option value="Option">Option</option>
              <option value="Corporate Bond">Corporate Bond</option>
              <option value="Municipal Security">Municipal Security</option>
              <option value="Non-Public Stock">Non-Public Stock</option>
            </select>

            {/* Owner */}
            <select
              value={ownerFilter}
              onChange={(e) => updateSearch({ owner: e.target.value, page: 0 })}
              className="px-2.5 py-1.5 bg-brand-bg/40 border border-brand-border rounded-lg text-xs font-mono font-medium text-gray-700 focus:outline-none focus:border-brand-primary cursor-pointer"
            >
              <option value="all">All Owners</option>
              <option value="Self">Self</option>
              <option value="Spouse">Spouse</option>
              <option value="Joint">Joint</option>
              <option value="Dependent">Dependent</option>
            </select>

            {/* Timeframe Presets */}
            <select
              value={dateRangeFilter}
              onChange={(e) => updateSearch({ dateRange: e.target.value, page: 0 })}
              className="px-2.5 py-1.5 bg-brand-bg/40 border border-brand-border rounded-lg text-xs font-mono font-medium text-gray-700 focus:outline-none focus:border-brand-primary cursor-pointer"
            >
              <option value="all">All Historical Time</option>
              <option value="30d">Past 30 Days</option>
              <option value="90d">Past 90 Days</option>
              <option value="2026">Year 2026</option>
              <option value="2025">Year 2025</option>
              <option value="2024">Year 2024</option>
            </select>

            {/* Sort By Field */}
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, ord] = e.target.value.split('-') as [any, any]
                updateSearch({ sortBy: field, sortOrder: ord, page: 0 })
              }}
              className="px-2.5 py-1.5 bg-brand-bg/40 border border-brand-border rounded-lg text-xs font-mono font-medium text-gray-700 focus:outline-none focus:border-brand-primary cursor-pointer"
            >
              <option value="disclosure_date-desc">Newest Disclosed</option>
              <option value="transaction_date-desc">Newest Traded</option>
              <option value="change_since_trade-desc">Highest Performance</option>
              <option value="change_since_trade-asc">Lowest Performance</option>
            </select>

            {/* View Mode Toggle (Feed vs Table) */}
            <div className="flex items-center border border-brand-border rounded-lg overflow-hidden bg-brand-bg/50 p-0.5 sm:ml-auto">
              <button
                onClick={() => updateSearch({ view: 'feed' })}
                className={`p-1.5 rounded-md transition-all cursor-pointer ${
                  viewMode === 'feed'
                    ? 'bg-white text-brand-primary shadow-2xs font-bold'
                    : 'text-gray-500 hover:text-brand-dark'
                }`}
                title="Feed View (Card layout)"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => updateSearch({ view: 'table' })}
                className={`p-1.5 rounded-md transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white text-brand-primary shadow-2xs font-bold'
                    : 'text-gray-500 hover:text-brand-dark'
                }`}
                title="Table View (Data grid)"
              >
                <TableIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Results Counter & Active Filter Indicators */}
        <div className="flex flex-wrap items-center justify-between text-xs text-gray-500 font-mono mb-3 px-1 gap-2">
          <div>
            Showing{' '}
            <span className="font-bold text-brand-dark">
              {totalRecords > 0 ? page * pageSize + 1 : 0} - {Math.min((page + 1) * pageSize, totalRecords)}
            </span>{' '}
            of <span className="font-bold text-brand-dark">{totalRecords.toLocaleString()}</span> disclosures
            {memberName && ` for ${memberName}`}
            {symbol && ` for ticker "${symbol.toUpperCase()}"`}
          </div>

          {(memberName ||
            symbol ||
            typeFilter !== 'all' ||
            assetTypeFilter !== 'all' ||
            ownerFilter !== 'all' ||
            dateRangeFilter !== 'all' ||
            sortBy !== 'disclosure_date') && (
            <button
              onClick={handleResetFilters}
              className="text-brand-primary hover:underline cursor-pointer flex items-center gap-1 font-semibold"
            >
              Reset All Filters
            </button>
          )}
        </div>

        {/* Loading Skeleton */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white border border-brand-border rounded-xl p-4 animate-pulse space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200"></div>
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3.5 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-2.5 bg-gray-100 rounded w-1/3"></div>
                  </div>
                </div>
                <div className="h-16 bg-gray-100 rounded-lg"></div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && disclosures.length === 0 && (
          <div className="bg-white border border-brand-border rounded-xl p-12 text-center my-6">
            <Filter className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-display font-bold text-brand-dark mb-1">No Disclosures Found</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mb-4">
              We couldn&apos;t find any disclosures matching your filter criteria. Try adjusting your search term or clearing filters.
            </p>
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 bg-brand-primary text-white rounded-lg text-xs font-mono font-bold hover:bg-brand-primary-hover transition-all cursor-pointer shadow-xs"
            >
              Clear All Filters
            </button>
          </div>
        )}

        {/* 1. FEED VIEW */}
        {!isLoading && viewMode === 'feed' && disclosures.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
            {disclosures.map((item, idx) => {
              const politicianName = item.name
              const isBuy = item.type.toLowerCase().includes('purchase')
              const isSale = item.type.toLowerCase().includes('sale')
              const isHouse = item.chamber === 'House'

              const returnVal = item.changeSinceTrade
              const hasReturn = returnVal !== null && returnVal !== undefined
              const isPositive = hasReturn && returnVal >= 0
              const filingGap = getDaysBetween(item.transactionDate, item.disclosureDate)
              const hasTicker = Boolean(item.symbol && item.symbol.trim() && item.symbol !== '--' && item.symbol !== 'N/A')

              return (
                <div
                  key={`${item.chamber}-${item.senateID || item.name}-${item.symbol}-${item.disclosureDate}-${idx}`}
                  className="bg-white border border-brand-border hover:border-brand-primary/40 rounded-xl p-4 transition-all hover:shadow-xs flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Politician Avatar, Name, Chamber Badge, District */}
                    <div className="flex items-start gap-3 mb-3">
                      <PoliticianAvatar name={politicianName} senateID={item.senateID} chamber={item.chamber} size="md" />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h3 className="text-sm font-display font-bold text-brand-dark truncate">{politicianName}</h3>
                          <div className="flex items-center gap-1 shrink-0">
                            <span
                              className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border whitespace-nowrap ${
                                isHouse ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-sky-50 text-sky-700 border-sky-200'
                              }`}
                            >
                              {item.chamber}
                            </span>
                            {item.district && (
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200 whitespace-nowrap">
                                {item.district}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 text-[11px] font-mono text-gray-500 mt-0.5">
                          <span>disclosed {getRelativeTime(item.disclosureDate)}</span>
                          <span>•</span>
                          <span>traded {getRelativeTime(item.transactionDate)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Trade Headline */}
                    <div className="text-xs font-sans mb-3">
                      <span className={`font-bold ${isBuy ? 'text-emerald-700' : isSale ? 'text-rose-700' : 'text-amber-700'}`}>
                        {isBuy ? 'Bought' : isSale ? 'Sold' : item.type}{' '}
                      </span>
                      <span className="font-semibold text-brand-dark">{item.amount}</span>
                      <span className="text-gray-500"> of </span>
                      {hasTicker ? (
                        <Link
                          to="/"
                          search={{ ticker: item.symbol }}
                          className="font-mono font-bold text-brand-dark hover:text-brand-primary hover:underline inline-flex items-center gap-0.5 whitespace-nowrap shrink-0"
                          title={`Open ${item.symbol} valuation`}
                        >
                          <span className="whitespace-nowrap">{item.symbol}</span>
                          <ArrowUpRight className="w-3 h-3 text-brand-primary inline shrink-0" />
                        </Link>
                      ) : (
                        <span className="font-semibold text-brand-dark">{item.assetDescription || item.assetType || 'Debt Security'}</span>
                      )}
                    </div>

                    {/* Asset Box */}
                    {hasTicker ? (
                      <Link
                        to="/"
                        search={{ ticker: item.symbol }}
                        className="group bg-brand-bg/40 hover:bg-brand-bg/80 border border-brand-border/80 hover:border-brand-primary/40 rounded-xl p-3 flex items-center justify-between gap-3 mb-2 transition-all cursor-pointer block text-inherit"
                        title={`Open ${item.symbol} Intrinsic Value model`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <CompanyLogo symbol={item.symbol} />

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
                              <span className="font-mono font-bold text-sm text-brand-dark group-hover:text-brand-primary transition-colors whitespace-nowrap shrink-0">
                                {item.symbol}
                              </span>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white text-gray-500 border border-gray-200 shrink-0 whitespace-nowrap">
                                {item.assetType || 'Stock'}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-500 truncate max-w-[150px] sm:max-w-[180px]">{item.assetDescription}</p>
                            {item.tradePrice ? (
                              <p className="text-[10px] font-mono text-gray-400 mt-0.5">Traded at {formatPrice(item.tradePrice)}</p>
                            ) : null}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-[10px] font-mono text-gray-400 uppercase tracking-wider font-semibold">Current price</div>
                          <div className="font-mono font-bold text-sm text-brand-dark group-hover:text-brand-primary transition-colors">
                            {item.currentPrice ? formatPrice(item.currentPrice) : '—'}
                          </div>
                          {hasReturn ? (
                            <div className={`text-[11px] font-mono font-semibold ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {`Since trade ${isPositive ? '+' : ''}${returnVal?.toFixed(2)}%`}
                            </div>
                          ) : (
                            <div className="text-[10px] font-mono text-gray-400">{item.amount}</div>
                          )}
                        </div>
                      </Link>
                    ) : (
                      <div className="bg-brand-bg/40 border border-brand-border/80 rounded-xl p-2.5 sm:p-3 flex items-center justify-between gap-2.5 sm:gap-3 mb-2">
                        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                          <CompanyLogo symbol="" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white text-gray-500 border border-gray-200 shrink-0 whitespace-nowrap">
                                {item.assetType || 'Bond'}
                              </span>
                            </div>
                            <p className="font-semibold text-xs sm:text-sm text-brand-dark truncate" title={item.assetDescription}>
                              {item.assetDescription || 'Fixed Income / Bond'}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-[10px] font-mono text-gray-400 uppercase tracking-wider font-semibold">Filing value</div>
                          <div className="font-mono font-bold text-xs sm:text-sm text-brand-dark whitespace-nowrap">{item.amount}</div>
                        </div>
                      </div>
                    )}

                    {item.comment && (
                      <p className="text-[10px] text-gray-500 italic bg-gray-50 p-1.5 rounded border border-gray-100 mb-2 truncate">
                        &quot;{item.comment}&quot;
                      </p>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-brand-border/60 text-[11px] font-mono text-gray-500 mt-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1">
                        <span className="text-gray-400">Owner:</span>
                        <span className="font-semibold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded text-[10px] border border-gray-200">
                          {item.owner || 'Self'}
                        </span>
                      </span>
                      {filingGap !== null && (
                        <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                          {filingGap}d lag
                        </span>
                      )}
                    </div>

                    {item.link ? (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-gray-400 hover:text-brand-primary transition-colors"
                        title={`View official disclosure PDF on ${isHouse ? 'House.gov' : 'Senate.gov'}`}
                      >
                        <span>Official PTR</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-gray-300">No doc</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* 2. TABLE VIEW */}
        {!isLoading && viewMode === 'table' && disclosures.length > 0 && (
          <div className="bg-white border border-brand-border rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1300px] text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-brand-border bg-brand-bg/60 font-mono text-[11px] uppercase tracking-wider text-gray-600 whitespace-nowrap">
                    <th className="py-3 px-4 font-bold min-w-[220px]">Politician</th>
                    <th className="py-3 px-2.5 font-bold min-w-[90px]">Chamber</th>
                    <th className="py-3 px-3 font-bold min-w-[220px]">Symbol / Asset</th>
                    <th className="py-3 px-3 font-bold min-w-[90px]">Action</th>
                    <th className="py-3 px-3 font-bold min-w-[140px]">Amount</th>
                    <th className="py-3 px-3 font-bold min-w-[100px]">Trade Price</th>
                    <th className="py-3 px-3 font-bold min-w-[100px]">Current Price</th>
                    <th className="py-3 px-3 font-bold min-w-[110px]">Since Trade</th>
                    <th className="py-3 px-3 font-bold min-w-[90px]">Owner</th>
                    <th className="py-3 px-3 font-bold min-w-[110px]">Traded</th>
                    <th className="py-3 px-3 font-bold min-w-[110px]">Disclosed</th>
                    <th className="py-3 px-4 font-bold text-right min-w-[110px]">Official Doc</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/60 font-sans">
                  {disclosures.map((item, idx) => {
                    const politicianName = item.name
                    const isBuy = item.type.toLowerCase().includes('purchase')
                    const isSale = item.type.toLowerCase().includes('sale')
                    const isHouse = item.chamber === 'House'
                    const returnVal = item.changeSinceTrade
                    const hasReturn = returnVal !== null && returnVal !== undefined
                    const isPositive = hasReturn && returnVal >= 0
                    const hasTicker = Boolean(item.symbol && item.symbol.trim() && item.symbol !== '--' && item.symbol !== 'N/A')

                    return (
                      <tr key={`${item.chamber}-${item.name}-${idx}`} className="hover:bg-brand-bg/40 transition-colors">
                        {/* Politician */}
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <PoliticianAvatar name={politicianName} senateID={item.senateID} chamber={item.chamber} size="sm" />
                            <div className="min-w-0">
                              <div className="font-bold text-brand-dark truncate">{politicianName}</div>
                              {item.district && <div className="text-[10px] font-mono text-gray-500">{item.district}</div>}
                            </div>
                          </div>
                        </td>

                        {/* Chamber */}
                        <td className="py-2.5 px-2.5 whitespace-nowrap">
                          <span
                            className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                              isHouse ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-sky-50 text-sky-700 border-sky-200'
                            }`}
                          >
                            {item.chamber}
                          </span>
                        </td>

                        {/* Symbol / Asset */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2 min-w-0">
                            {hasTicker ? (
                              <Link
                                to="/"
                                search={{ ticker: item.symbol }}
                                className="font-mono font-bold text-brand-dark hover:text-brand-primary hover:underline inline-flex items-center gap-0.5 shrink-0"
                              >
                                <span>{item.symbol}</span>
                                <ArrowUpRight className="w-3 h-3 text-brand-primary" />
                              </Link>
                            ) : null}
                            <span className="text-[11px] text-gray-600 truncate max-w-[160px]" title={item.assetDescription}>
                              {item.assetDescription || item.assetType}
                            </span>
                          </div>
                        </td>

                        {/* Action */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span
                            className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded ${
                              isBuy
                                ? 'bg-emerald-50 text-emerald-700'
                                : isSale
                                ? 'bg-rose-50 text-rose-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {isBuy ? 'BUY' : isSale ? 'SELL' : item.type}
                          </span>
                        </td>

                        {/* Amount */}
                        <td className="py-2.5 px-3 font-mono text-[11px] text-gray-700 whitespace-nowrap">{item.amount}</td>

                        {/* Trade Price */}
                        <td className="py-2.5 px-3 font-mono text-gray-600 whitespace-nowrap">
                          {item.tradePrice ? formatPrice(item.tradePrice) : '—'}
                        </td>

                        {/* Current Price */}
                        <td className="py-2.5 px-3 font-mono font-bold text-brand-dark whitespace-nowrap">
                          {item.currentPrice ? formatPrice(item.currentPrice) : '—'}
                        </td>

                        {/* Return */}
                        <td className="py-2.5 px-3 font-mono whitespace-nowrap">
                          {hasReturn ? (
                            <span className={`font-semibold ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {isPositive ? '+' : ''}
                              {returnVal?.toFixed(2)}%
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>

                        {/* Owner */}
                        <td className="py-2.5 px-3 font-mono text-gray-600 text-[11px] whitespace-nowrap">{item.owner || 'Self'}</td>

                        {/* Traded Date */}
                        <td className="py-2.5 px-3 font-mono text-[11px] text-gray-600 whitespace-nowrap">
                          <div>{item.transactionDate}</div>
                          <div className="text-[9px] text-gray-400">{getRelativeTime(item.transactionDate)}</div>
                        </td>

                        {/* Disclosure Date */}
                        <td className="py-2.5 px-3 font-mono text-[11px] text-gray-600 whitespace-nowrap">
                          <div>{item.disclosureDate}</div>
                          <div className="text-[9px] text-gray-400">{getRelativeTime(item.disclosureDate)}</div>
                        </td>

                        {/* Official Doc */}
                        <td className="py-2.5 px-4 text-right font-mono whitespace-nowrap">
                          {item.link ? (
                            <a
                              href={item.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-brand-primary hover:underline font-semibold"
                            >
                              <span>Official PTR</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-gray-300 text-[11px]">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Server-Side Pagination Bar */}
        {totalRecords > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 bg-white border border-brand-border rounded-xl px-4 py-3 shadow-xs">
            {/* Page Size & Status */}
            <div className="flex items-center gap-3 text-xs text-gray-500 font-mono">
              <span>
                Page <span className="font-bold text-brand-dark">{page + 1}</span> of{' '}
                <span className="font-bold text-brand-dark">{totalPages.toLocaleString()}</span>
              </span>
              <span className="text-gray-300">•</span>
              <div className="flex items-center gap-1.5">
                <span>Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => updateSearch({ pageSize: Number(e.target.value), page: 0 })}
                  className="px-2 py-0.5 bg-brand-bg/60 border border-brand-border rounded text-xs font-mono font-bold text-brand-dark focus:outline-none cursor-pointer"
                >
                  <option value={24}>24</option>
                  <option value={48}>48</option>
                  <option value={96}>96</option>
                </select>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              {/* First Page */}
              <button
                onClick={() => updateSearch({ page: 0 })}
                disabled={page === 0}
                className="hidden sm:inline-flex p-1.5 rounded-lg border border-brand-border text-gray-600 hover:bg-brand-bg disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                title="First page"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>

              {/* Prev Page */}
              <button
                onClick={() => updateSearch({ page: Math.max(0, page - 1) })}
                disabled={page === 0}
                className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg border border-brand-border text-xs font-mono font-semibold text-gray-700 hover:bg-brand-bg disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Prev</span>
              </button>

              {/* Page Number Chips */}
              {(() => {
                const pagesToShow: (number | string)[] = []
                const maxButtons = 3
                let startPage = Math.max(0, page - 1)
                let endPage = Math.min(totalPages - 1, startPage + maxButtons - 1)

                if (endPage - startPage < maxButtons - 1) {
                  startPage = Math.max(0, endPage - maxButtons + 1)
                }

                if (startPage > 0) {
                  pagesToShow.push(0)
                  if (startPage > 1) pagesToShow.push('...')
                }

                for (let i = startPage; i <= endPage; i++) {
                  pagesToShow.push(i)
                }

                if (endPage < totalPages - 1) {
                  if (endPage < totalPages - 2) pagesToShow.push('...')
                  pagesToShow.push(totalPages - 1)
                }

                return pagesToShow.map((pNum, index) => {
                  if (typeof pNum === 'string') {
                    return (
                      <span key={`ellipsis-${index}`} className="px-1 text-xs text-gray-400 font-mono">
                        ...
                      </span>
                    )
                  }
                  const isCurrent = pNum === page
                  return (
                    <button
                      key={pNum}
                      onClick={() => updateSearch({ page: pNum })}
                      className={`min-w-[30px] sm:min-w-[32px] h-8 px-1.5 sm:px-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-brand-primary text-white shadow-xs'
                          : 'border border-brand-border text-gray-700 hover:bg-brand-bg'
                      }`}
                    >
                      {pNum + 1}
                    </button>
                  )
                })
              })()}

              {/* Next Page */}
              <button
                onClick={() => updateSearch({ page: Math.min(totalPages - 1, page + 1) })}
                disabled={page >= totalPages - 1}
                className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg border border-brand-border text-xs font-mono font-semibold text-gray-700 hover:bg-brand-bg disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              {/* Last Page */}
              <button
                onClick={() => updateSearch({ page: totalPages - 1 })}
                disabled={page >= totalPages - 1}
                className="hidden sm:inline-flex p-1.5 rounded-lg border border-brand-border text-gray-600 hover:bg-brand-bg disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                title="Last page"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
