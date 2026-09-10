import { useState, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, Loader2 } from 'lucide-react'
import { API_URL } from '../lib/config'

export interface StockSearchResult {
  symbol: string
  name: string
  exchange: string
  currency?: string
}

interface TickerAutocompleteProps {
  value: string
  onChange: (val: string) => void
  onSelectTicker: (symbol: string) => void
  onSubmit?: () => void
  placeholder?: string
  className?: string
  inputClassName?: string
  disabled?: boolean
  autoFocus?: boolean
  id?: string
}

export function TickerAutocomplete({
  value,
  onChange,
  onSelectTicker,
  onSubmit,
  placeholder = 'Enter ticker or company name...',
  className = '',
  inputClassName = '',
  disabled = false,
  autoFocus = false,
  id,
}: TickerAutocompleteProps) {
  const [debouncedQuery, setDebouncedQuery] = useState(value)
  const [isOpen, setIsOpen] = useState(false)
  const [isUserTyping, setIsUserTyping] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const queryClient = useQueryClient()

  const cancelSearch = () => {
    setIsUserTyping(false)
    setIsOpen(false)
    setHighlightedIndex(-1)
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    queryClient.cancelQueries({ queryKey: ['stocks-search'] })
  }

  // Debounce input to avoid spamming the search API
  useEffect(() => {
    if (!isUserTyping) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }
      return
    }
    const handler = setTimeout(() => {
      setDebouncedQuery(value.trim())
    }, 200)
    debounceTimerRef.current = handler
    return () => clearTimeout(handler)
  }, [value, isUserTyping])

  // Query search endpoint only when user has actively typed
  const { data: suggestions = [], isFetching } = useQuery({
    queryKey: ['stocks-search', debouncedQuery],
    queryFn: async ({ signal }) => {
      if (!debouncedQuery || debouncedQuery.length < 1) return []
      const res = await fetch(
        `${API_URL}/stocks/search?query=${encodeURIComponent(debouncedQuery)}&limit=8`,
        { signal }
      )
      if (!res.ok) return []
      return (await res.json()) as StockSearchResult[]
    },
    enabled: isUserTyping && debouncedQuery.length >= 1,
    staleTime: 1000 * 60 * 10, // 10 minutes cache
  })

  // Close and cancel suggestions on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        cancelSearch()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Cancel suggestions when enclosing form is submitted (e.g. clicking execute / submit button)
  useEffect(() => {
    const form = inputRef.current?.form
    if (!form) return

    const handleSubmit = () => {
      cancelSearch()
    }

    form.addEventListener('submit', handleSubmit)
    return () => form.removeEventListener('submit', handleSubmit)
  }, [])

  // Open dropdown ONLY when the user is actively typing and results exist
  useEffect(() => {
    if (isUserTyping && debouncedQuery.length >= 1 && suggestions.length > 0) {
      setIsOpen(true)
    } else {
      setIsOpen(false)
    }
  }, [debouncedQuery, suggestions, isUserTyping])

  const handleSelect = (symbol: string) => {
    cancelSearch()
    onChange(symbol)
    onSelectTicker(symbol)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (isOpen && highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        e.preventDefault()
        handleSelect(suggestions[highlightedIndex].symbol)
      } else {
        // User pressed Enter to submit current input directly
        cancelSearch()
        if (onSubmit) {
          e.preventDefault()
          onSubmit()
        }
      }
      return
    }

    if (!isOpen || suggestions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1))
    } else if (e.key === 'Escape') {
      cancelSearch()
    }
  }

  const isFirstFocusRef = useRef(false)

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    isFirstFocusRef.current = true
    const input = e.currentTarget
    input.select()
    // requestAnimationFrame ensures selection stays active across mobile Safari/Chrome
    requestAnimationFrame(() => {
      input.select()
    })
  }

  const handleMouseUp = (e: React.MouseEvent<HTMLInputElement>) => {
    if (isFirstFocusRef.current) {
      isFirstFocusRef.current = false
      e.preventDefault()
    }
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          ref={inputRef}
          id={id}
          type="text"
          autoComplete="off"
          value={value}
          onFocus={handleFocus}
          onMouseUp={handleMouseUp}
          onChange={(e) => {
            const nextVal = e.target.value
            setIsUserTyping(true)
            onChange(nextVal)
            setHighlightedIndex(-1)
            if (!nextVal.trim()) {
              setIsOpen(false)
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          className={
            inputClassName ||
            'w-full pl-10 pr-9 py-2.5 bg-brand-bg/30 border border-brand-border rounded-xl text-xs sm:text-sm font-mono text-brand-dark focus:outline-none focus:border-brand-primary focus:bg-white transition-all'
          }
        />
        {isFetching && (
          <Loader2 className="w-3.5 h-3.5 text-brand-primary animate-spin absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        )}
      </div>

      {/* Floating suggestions dropdown - only renders when results exist */}
      {isOpen && isUserTyping && debouncedQuery.length >= 1 && suggestions.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-brand-border rounded-xl shadow-xl overflow-hidden py-1 max-h-72 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
          <ul className="divide-y divide-brand-border/40">
            {suggestions.map((item, index) => {
              const isHighlighted = index === highlightedIndex
              return (
                <li
                  key={`${item.symbol}-${index}`}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    handleSelect(item.symbol)
                  }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`px-3.5 py-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                    isHighlighted
                      ? 'bg-brand-primary/10 text-brand-dark'
                      : 'hover:bg-brand-bg/60 text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2 flex-1">
                    <span className="font-mono font-bold text-xs sm:text-sm text-brand-dark bg-brand-bg/60 px-1.5 py-0.5 rounded border border-brand-border/60 shrink-0 whitespace-nowrap">
                      {item.symbol}
                    </span>
                    <span className="text-xs truncate font-sans text-gray-600 font-medium min-w-0">
                      {item.name}
                    </span>
                  </div>
                  {item.exchange && (
                    <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 border border-gray-200/80 shrink-0 uppercase whitespace-nowrap ml-2">
                      {item.exchange}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
