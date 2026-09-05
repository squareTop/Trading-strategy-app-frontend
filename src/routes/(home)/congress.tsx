import { queryOptions, useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
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
  ArrowUpRight,
  X,
  Landmark
} from 'lucide-react'
import { API_URL } from '../../lib/config'
import { formatPrice } from '../../lib/utils'

export interface CongressDisclosure {
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

export const congressQueryOptions = (chamber: 'all' | 'senate' | 'house' = 'all') =>
  queryOptions({
    queryKey: ['congressLatest', chamber],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/api/congress-latest?chamber=${chamber}&limit=150`)
      if (!response.ok) {
        throw new Error(`Failed to fetch congress disclosures: status ${response.status}`)
      }
      return response.json() as Promise<CongressDisclosure[]>
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
    refetchInterval: 30 * 60 * 1000, // 30 minutes background refetch
  })

export const Route = createFileRoute('/(home)/congress')({
  head: () => ({
    meta: [
      {
        title: 'Congress Trades & STOCK Act Disclosures | FoxelSignal',
      },
      {
        name: 'description',
        content: 'Real-time tracking of U.S. Senate and House financial disclosures, Nancy Pelosi stock trades, congressional insider trades, and post-trade performance analytics.',
      },
    ],
  }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(congressQueryOptions('all')).catch(() => {})
  },
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

// Politician Avatar with support for Senate image URLs and House initials
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
  const imageUrl = senateID ? `https://images.financialmodelingprep.com/senate/${senateID}.jpg` : ''

  const sizeClasses = {
    sm: 'w-7 h-7 text-[10px]',
    md: 'w-10 h-10 text-xs',
    lg: 'w-12 h-12 text-sm',
  }[size]

  const cleanName = name.replace(/^(Hon\.|Senator|Representative|Rep\.|Sen\.)\s+/i, '').trim()
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
      {/* Placeholder with initials rendered underneath */}
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

      {/* Senator Image with zero alt text to prevent browser title pop-in */}
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

// Company Logo with multi-tier source resolution and contrast protection
function CompanyLogo({ symbol }: { symbol: string }) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [srcIndex, setSrcIndex] = useState(0)

  // 1. High-contrast / brand colored logo via Parqet
  // 2. FMP symbol logo with contrast shadow fallback
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
      {/* Placeholder with ticker initials rendered underneath */}
      {(!isLoaded || hasFailedAll || !symbol) && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center font-mono text-[11px] font-bold text-gray-600">
          {symbol?.slice(0, 4) || <Building2 className="w-4 h-4 text-gray-400" />}
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
  // Chamber query state
  const [selectedChamber, setSelectedChamber] = useState<'all' | 'senate' | 'house'>('all')

  const {
    data: disclosures = [],
    isLoading,
    isRefetching,
    refetch,
    dataUpdatedAt,
  } = useQuery(congressQueryOptions(selectedChamber))

  // Filters state
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'Purchase' | 'Sale' | 'Exchange'>('all')
  const [assetTypeFilter, setAssetTypeFilter] = useState<string>('all')
  const [ownerFilter, setOwnerFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'feed' | 'table'>('feed')

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 21

  // Derived unique asset types
  const assetTypes = useMemo(() => {
    const set = new Set<string>()
    disclosures.forEach((d) => {
      if (d.assetType) set.add(d.assetType)
    })
    return Array.from(set).sort()
  }, [disclosures])

  // Chamber counts
  const { totalCount, senateCount, houseCount } = useMemo(() => {
    let s = 0
    let h = 0
    disclosures.forEach((d) => {
      if (d.chamber === 'Senate') s++
      if (d.chamber === 'House') h++
    })
    return { totalCount: disclosures.length, senateCount: s, houseCount: h }
  }, [disclosures])

  // Filtered disclosures
  const filteredDisclosures = useMemo(() => {
    return disclosures.filter((item) => {
      // Transaction type filter
      if (typeFilter !== 'all') {
        if (typeFilter === 'Purchase' && !item.type.toLowerCase().includes('purchase')) return false
        if (typeFilter === 'Sale' && !item.type.toLowerCase().includes('sale')) return false
        if (typeFilter === 'Exchange' && !item.type.toLowerCase().includes('exchange')) return false
      }

      if (assetTypeFilter !== 'all' && item.assetType !== assetTypeFilter) return false
      if (ownerFilter !== 'all' && item.owner !== ownerFilter) return false

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim()
        const name = (item.name || '').toLowerCase()
        const office = (item.office || '').toLowerCase()
        const symbol = (item.symbol || '').toLowerCase()
        const assetDesc = (item.assetDescription || '').toLowerCase()
        const district = (item.district || '').toLowerCase()
        const chamber = (item.chamber || '').toLowerCase()

        const matches =
          name.includes(query) ||
          office.includes(query) ||
          symbol.includes(query) ||
          assetDesc.includes(query) ||
          district.includes(query) ||
          chamber.includes(query)

        if (!matches) return false
      }

      return true
    })
  }, [disclosures, typeFilter, assetTypeFilter, ownerFilter, searchTerm])

  // Paginated disclosures
  const totalPages = Math.ceil(filteredDisclosures.length / pageSize) || 1
  const paginatedDisclosures = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredDisclosures.slice(start, start + pageSize)
  }, [filteredDisclosures, currentPage, pageSize])

  const handleResetFilters = () => {
    setSearchTerm('')
    setTypeFilter('all')
    setAssetTypeFilter('all')
    setOwnerFilter('all')
    setCurrentPage(1)
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
                  STOCK Act Disclosures
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
                Real-time tracking of U.S. Senate and House of Representatives stock transactions, including Nancy Pelosi and Capitol Hill members, with live quotes and returns since trade date.
              </p>
            </div>

            {/* Refresh & Last Updated Button */}
            <div className="flex items-center gap-3 shrink-0">
              {lastUpdatedTime && (
                <span className="hidden sm:inline text-xs text-gray-500 font-mono">
                  Updated: {lastUpdatedTime}
                </span>
              )}
              <button
                onClick={() => refetch()}
                disabled={isRefetching}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-mono font-bold bg-white border border-brand-border hover:border-brand-primary text-gray-700 hover:text-brand-primary transition-all shadow-xs disabled:opacity-60 cursor-pointer"
                title="Refresh disclosures"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin text-brand-primary' : ''}`} />
                <span>{isRefetching ? 'Updating...' : 'Refresh'}</span>
              </button>
            </div>
          </div>

          {/* Chamber Toggle Pills */}
          <div className="flex items-center gap-2 mt-6 pt-4 border-t border-brand-border/60">
            <span className="text-xs font-mono text-gray-400 font-semibold mr-1">Chamber:</span>
            <button
              onClick={() => {
                setSelectedChamber('all')
                setCurrentPage(1)
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                selectedChamber === 'all'
                  ? 'bg-brand-dark text-white shadow-xs'
                  : 'bg-brand-bg/60 hover:bg-brand-bg text-gray-600 hover:text-brand-dark border border-brand-border'
              }`}
            >
              <Landmark className="w-3.5 h-3.5" />
              <span>All Congress</span>
              {selectedChamber === 'all' && (
                <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 text-white font-mono">
                  {totalCount}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setSelectedChamber('house')
                setCurrentPage(1)
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                selectedChamber === 'house'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'bg-brand-bg/60 hover:bg-brand-bg text-purple-800 hover:text-purple-900 border border-purple-200'
              }`}
            >
              <span>🏛️ House (e.g. Pelosi)</span>
              {selectedChamber === 'house' && (
                <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 text-white font-mono">
                  {houseCount || totalCount}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setSelectedChamber('senate')
                setCurrentPage(1)
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                selectedChamber === 'senate'
                  ? 'bg-sky-700 text-white shadow-xs'
                  : 'bg-brand-bg/60 hover:bg-brand-bg text-sky-800 hover:text-sky-900 border border-sky-200'
              }`}
            >
              <span>🏛️ Senate</span>
              {selectedChamber === 'senate' && (
                <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 text-white font-mono">
                  {senateCount || totalCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-360 mx-auto px-3 sm:px-4 md:px-8 pt-6">
        {/* Filter and Search Bar */}
        <div className="bg-white border border-brand-border rounded-xl p-3.5 sm:p-4 mb-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
              placeholder="Search by Politician (e.g. Pelosi), ticker (e.g. NVDA), company, or state..."
              className="w-full pl-9 pr-8 py-2 bg-brand-bg/40 border border-brand-border rounded-lg text-xs font-sans text-brand-dark placeholder-gray-400 focus:outline-none focus:border-brand-primary focus:bg-white transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Controls: Type, Asset Type, Owner, View Mode */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Transaction Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value as any)
                setCurrentPage(1)
              }}
              className="px-2.5 py-1.5 bg-brand-bg/40 border border-brand-border rounded-lg text-xs font-mono font-medium text-gray-700 focus:outline-none focus:border-brand-primary"
            >
              <option value="all">All Actions</option>
              <option value="Purchase">Purchases (Buy)</option>
              <option value="Sale">Sales (Sell)</option>
              <option value="Exchange">Exchanges</option>
            </select>

            {/* Asset Type Filter */}
            <select
              value={assetTypeFilter}
              onChange={(e) => {
                setAssetTypeFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="px-2.5 py-1.5 bg-brand-bg/40 border border-brand-border rounded-lg text-xs font-mono font-medium text-gray-700 focus:outline-none focus:border-brand-primary"
            >
              <option value="all">All Asset Types</option>
              {assetTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            {/* Owner Filter */}
            <select
              value={ownerFilter}
              onChange={(e) => {
                setOwnerFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="px-2.5 py-1.5 bg-brand-bg/40 border border-brand-border rounded-lg text-xs font-mono font-medium text-gray-700 focus:outline-none focus:border-brand-primary"
            >
              <option value="all">All Owners</option>
              <option value="Self">Self</option>
              <option value="Spouse">Spouse</option>
              <option value="Joint">Joint</option>
            </select>

            {/* View Mode Toggle (Feed vs Table) */}
            <div className="flex items-center border border-brand-border rounded-lg overflow-hidden bg-brand-bg/50 p-0.5 ml-auto sm:ml-0">
              <button
                onClick={() => setViewMode('feed')}
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
                onClick={() => setViewMode('table')}
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
        <div className="flex items-center justify-between text-xs text-gray-500 font-mono mb-3 px-1">
          <div>
            Showing <span className="font-bold text-brand-dark">{paginatedDisclosures.length}</span> of{' '}
            <span className="font-bold text-brand-dark">{filteredDisclosures.length}</span> records
            {searchTerm && ` for "${searchTerm}"`}
          </div>
          {(searchTerm || typeFilter !== 'all' || assetTypeFilter !== 'all' || ownerFilter !== 'all') && (
            <button
              onClick={handleResetFilters}
              className="text-brand-primary hover:underline cursor-pointer flex items-center gap-1 font-semibold"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Loading Skeleton */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="bg-white border border-brand-border rounded-xl p-4 animate-pulse space-y-3"
              >
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
        {!isLoading && filteredDisclosures.length === 0 && (
          <div className="bg-white border border-brand-border rounded-xl p-12 text-center my-6">
            <Filter className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-display font-bold text-brand-dark mb-1">
              No Disclosures Found
            </h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mb-4">
              We couldn&apos;t find any disclosures matching your filter criteria. Try adjusting your search term or filters.
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
        {!isLoading && viewMode === 'feed' && filteredDisclosures.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
            {paginatedDisclosures.map((item, idx) => {
              const politicianName = item.name
              const isBuy = item.type.toLowerCase().includes('purchase')
              const isSale = item.type.toLowerCase().includes('sale')
              const isHouse = item.chamber === 'House'

              // Performance and timing metrics
              const returnVal = item.changeSinceTrade
              const hasReturn = returnVal !== null && returnVal !== undefined
              const isPositive = hasReturn && returnVal >= 0
              const filingGap = getDaysBetween(item.transactionDate, item.disclosureDate)

              return (
                <div
                  key={`${item.chamber}-${item.senateID || item.name}-${item.symbol}-${item.disclosureDate}-${idx}`}
                  className="bg-white border border-brand-border hover:border-brand-primary/40 rounded-xl p-4 transition-all hover:shadow-xs flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Politician Avatar, Name, Chamber Badge, District */}
                    <div className="flex items-start gap-3 mb-3">
                      <PoliticianAvatar
                        name={politicianName}
                        senateID={item.senateID}
                        chamber={item.chamber}
                        size="md"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h3 className="text-sm font-display font-bold text-brand-dark truncate">
                            {politicianName}
                          </h3>
                          <div className="flex items-center gap-1 shrink-0">
                            {/* Chamber Badge */}
                            <span
                              className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                                isHouse
                                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                                  : 'bg-sky-50 text-sky-700 border-sky-200'
                              }`}
                            >
                              {item.chamber}
                            </span>
                            {item.district && (
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">
                                {item.district}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Relative timing metadata */}
                        <div className="flex items-center gap-1.5 text-[11px] font-mono text-gray-500 mt-0.5">
                          <span>disclosed {getRelativeTime(item.disclosureDate)}</span>
                          <span>•</span>
                          <span>traded {getRelativeTime(item.transactionDate)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Trade Headline: Bought / Sold Amount of Ticker */}
                    <div className="text-xs font-sans mb-3">
                      <span
                        className={`font-bold ${
                          isBuy ? 'text-emerald-700' : isSale ? 'text-rose-700' : 'text-amber-700'
                        }`}
                      >
                        {isBuy ? 'Bought' : isSale ? 'Sold' : item.type}{' '}
                      </span>
                      <span className="font-semibold text-brand-dark">{item.amount}</span>
                      <span className="text-gray-500"> of </span>
                      <Link
                        to="/"
                        search={{ ticker: item.symbol }}
                        className="font-mono font-bold text-brand-dark hover:text-brand-primary hover:underline inline-flex items-center gap-0.5"
                        title={`Open ${item.symbol} valuation`}
                      >
                        {item.symbol}
                        <ArrowUpRight className="w-3 h-3 text-brand-primary inline" />
                      </Link>
                    </div>

                    {/* Asset Box - Clickable valuation link */}
                    <Link
                      to="/"
                      search={{ ticker: item.symbol }}
                      className="group bg-brand-bg/40 hover:bg-brand-bg/80 border border-brand-border/80 hover:border-brand-primary/40 rounded-xl p-3 flex items-center justify-between gap-3 mb-2 transition-all cursor-pointer block text-inherit"
                      title={`Open ${item.symbol} Intrinsic Value model`}
                    >
                      {/* Left: Company Logo + Symbol + Description */}
                      <div className="flex items-center gap-3 min-w-0">
                        <CompanyLogo symbol={item.symbol} />

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-sm text-brand-dark group-hover:text-brand-primary transition-colors">
                              {item.symbol}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white text-gray-500 border border-gray-200">
                              {item.assetType || 'Stock'}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-500 truncate max-w-[150px] sm:max-w-[180px]">
                            {item.assetDescription}
                          </p>
                          {item.tradePrice ? (
                            <p className="text-[10px] font-mono text-gray-400 mt-0.5">
                              Traded at {formatPrice(item.tradePrice)}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      {/* Right: Current Price & Return Since Trade */}
                      <div className="text-right shrink-0">
                        <div className="text-[10px] font-mono text-gray-400 uppercase tracking-wider font-semibold">
                          Current price
                        </div>
                        <div className="font-mono font-bold text-sm text-brand-dark group-hover:text-brand-primary transition-colors">
                          {item.currentPrice ? formatPrice(item.currentPrice) : '—'}
                        </div>
                        {hasReturn ? (
                          <div
                            className={`text-[11px] font-mono font-semibold ${
                              isPositive ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {`Since trade ${isPositive ? '+' : ''}${returnVal?.toFixed(2)}%`}
                          </div>
                        ) : (
                          <div className="text-[10px] font-mono text-gray-400">
                            {item.amount}
                          </div>
                        )}
                      </div>
                    </Link>

                    {/* Comment snippet if present */}
                    {item.comment && (
                      <p className="text-[10px] text-gray-500 italic bg-gray-50 p-1.5 rounded border border-gray-100 mb-2 truncate">
                        &quot;{item.comment}&quot;
                      </p>
                    )}
                  </div>

                  {/* Card Footer: Owner badge, filing delay & Official PTR Doc link */}
                  <div className="flex items-center justify-between pt-2 border-t border-brand-border/60 text-[11px] font-mono text-gray-500 mt-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1">
                        <span className="text-gray-400">Owner:</span>
                        <span className="font-semibold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded text-[10px] border border-gray-200">
                          {item.owner || 'Self'}
                        </span>
                      </span>
                      {filingGap !== null && (
                        <span
                          className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100"
                          title={`Disclosed ${filingGap} days after trade`}
                        >
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
        {!isLoading && viewMode === 'table' && filteredDisclosures.length > 0 && (
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
                  {paginatedDisclosures.map((item, idx) => {
                    const politicianName = item.name
                    const isBuy = item.type.toLowerCase().includes('purchase')
                    const isSale = item.type.toLowerCase().includes('sale')
                    const isHouse = item.chamber === 'House'
                    const returnVal = item.changeSinceTrade
                    const hasReturn = returnVal !== null && returnVal !== undefined
                    const isPositive = hasReturn && returnVal >= 0

                    return (
                      <tr
                        key={`${item.chamber}-${item.senateID || item.name}-${item.symbol}-${idx}`}
                        className="hover:bg-brand-bg/30 transition-colors"
                      >
                        {/* Politician */}
                        <td className="py-2.5 px-4 min-w-[220px] whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <PoliticianAvatar
                              name={politicianName}
                              senateID={item.senateID}
                              chamber={item.chamber}
                              size="sm"
                            />
                            <div className="min-w-0">
                              <div className="font-semibold text-brand-dark flex items-center gap-1 whitespace-nowrap">
                                <span>{politicianName}</span>
                                {item.district && (
                                  <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-gray-100 text-gray-500 shrink-0">
                                    {item.district}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Chamber */}
                        <td className="py-2.5 px-2.5 font-mono whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                              isHouse
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : 'bg-sky-50 text-sky-700 border-sky-200'
                            }`}
                          >
                            {item.chamber}
                          </span>
                        </td>

                        {/* Symbol & Company */}
                        <td className="py-2.5 px-3 min-w-[220px]">
                          <Link
                            to="/"
                            search={{ ticker: item.symbol }}
                            className="group flex items-center gap-2 text-inherit"
                            title={`Open ${item.symbol} valuation`}
                          >
                            <CompanyLogo symbol={item.symbol} />
                            <div className="min-w-0">
                              <div className="font-mono font-bold text-xs text-brand-dark group-hover:text-brand-primary group-hover:underline flex items-center gap-0.5 whitespace-nowrap">
                                {item.symbol}
                                <ArrowUpRight className="w-2.5 h-2.5 text-brand-primary" />
                              </div>
                              <div className="text-[10px] text-gray-500 truncate max-w-[160px]">
                                {item.assetDescription}
                              </div>
                            </div>
                          </Link>
                        </td>

                        {/* Type (Action) */}
                        <td className="py-2.5 px-3 font-mono whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              isBuy
                                ? 'bg-emerald-100 text-emerald-800'
                                : isSale
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {item.type}
                          </span>
                        </td>

                        {/* Amount */}
                        <td className="py-2.5 px-3 font-mono font-semibold text-gray-800 whitespace-nowrap">
                          {item.amount}
                        </td>

                        {/* Trade Price */}
                        <td className="py-2.5 px-3 font-mono text-gray-600 whitespace-nowrap">
                          {item.tradePrice ? formatPrice(item.tradePrice) : '—'}
                        </td>

                        {/* Current Price */}
                        <td className="py-2.5 px-3 font-mono font-semibold text-brand-dark whitespace-nowrap">
                          {item.currentPrice ? formatPrice(item.currentPrice) : '—'}
                        </td>

                        {/* Return Since Trade */}
                        <td className="py-2.5 px-3 font-mono whitespace-nowrap">
                          {hasReturn ? (
                            <span
                              className={`font-semibold ${
                                isPositive ? 'text-emerald-600' : 'text-rose-600'
                              }`}
                            >
                              {isPositive ? '+' : ''}
                              {returnVal?.toFixed(2)}%
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>

                        {/* Owner */}
                        <td className="py-2.5 px-3 font-mono text-gray-600 text-[11px] whitespace-nowrap">
                          {item.owner || 'Self'}
                        </td>

                        {/* Traded Date */}
                        <td className="py-2.5 px-3 font-mono text-[11px] text-gray-600 whitespace-nowrap">
                          <div>{item.transactionDate}</div>
                          <div className="text-[9px] text-gray-400">
                            {getRelativeTime(item.transactionDate)}
                          </div>
                        </td>

                        {/* Disclosure Date */}
                        <td className="py-2.5 px-3 font-mono text-[11px] text-gray-600 whitespace-nowrap">
                          <div>{item.disclosureDate}</div>
                          <div className="text-[9px] text-gray-400">
                            {getRelativeTime(item.disclosureDate)}
                          </div>
                        </td>

                        {/* Official Document Link */}
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

        {/* Pagination Controls */}
        {!isLoading && filteredDisclosures.length > pageSize && (
          <div className="flex items-center justify-between mt-6 bg-white border border-brand-border rounded-xl px-4 py-3 shadow-xs">
            <span className="text-xs text-gray-500 font-mono">
              Page <span className="font-bold text-brand-dark">{currentPage}</span> of{' '}
              <span className="font-bold text-brand-dark">{totalPages}</span>
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-brand-border text-xs font-mono font-semibold text-gray-700 hover:bg-brand-bg disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Previous
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-brand-border text-xs font-mono font-semibold text-gray-700 hover:bg-brand-bg disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
