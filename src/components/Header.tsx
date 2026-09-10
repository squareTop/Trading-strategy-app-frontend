import { Link, useRouterState } from '@tanstack/react-router'
import { useState, useRef, useEffect } from 'react'
import {
  Menu,
  X,
  LogOut,
  User as UserIcon,
  Bookmark,
  Loader2,
} from 'lucide-react'
import { useAuth } from '../lib/auth'

const navLinks = [
  { to: '/', label: 'IV Valuation' },
  { to: '/daily-signals', label: 'Daily Signals' },
  { to: '/scoreboard', label: 'Scoreboard' },
  { to: '/thesis', label: 'Thesis AI' },
  { to: '/congress', label: 'Congress Trades' },
] as const

function getInitials(user: {
  full_name?: string | null
  username?: string | null
  email: string
}): string {
  if (user.full_name?.trim()) {
    const parts = user.full_name.trim().split(/\s+/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return parts[0].slice(0, 2).toUpperCase()
  }
  if (user.username?.trim()) {
    return user.username.trim().slice(0, 2).toUpperCase()
  }
  return user.email.slice(0, 2).toUpperCase()
}

interface UserMenuProps {
  onOpen?: () => void
  size?: 'sm' | 'md'
}

function UserMenu({ onOpen, size = 'md' }: UserMenuProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { user, isAuthenticated, isLoading, logout } = useAuth()

  // Close dropdown on click or tap outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [])

  if (isLoading) {
    return (
      <div
        className={`${
          size === 'sm' ? 'w-8 h-8' : 'w-8 h-8'
        } rounded-full bg-brand-bg/80 animate-pulse border border-brand-border`}
      />
    )
  }

  if (!isAuthenticated || !user) {
    return (
      <Link
        to="/login"
        search={{ redirect: undefined }}
        className={
          size === 'sm'
            ? 'px-2.5 py-1.5 rounded-lg bg-brand-dark text-white hover:bg-brand-primary transition-colors font-mono font-bold text-[11px] uppercase tracking-wider shadow-xs'
            : 'px-3.5 py-2 rounded-lg bg-brand-dark text-white hover:bg-brand-primary transition-colors font-mono font-bold text-[11px] uppercase tracking-wider shadow-xs'
        }
      >
        Sign In
      </Link>
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => {
          setDropdownOpen((prev) => {
            const next = !prev
            if (next && onOpen) onOpen()
            return next
          })
        }}
        className="flex items-center justify-center rounded-full hover:ring-2 hover:ring-brand-primary/40 focus:ring-2 focus:ring-brand-primary/50 transition-all cursor-pointer select-none focus:outline-none"
        aria-expanded={dropdownOpen}
        title={user.full_name || user.username || user.email}
      >
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt={user.full_name || user.email}
            className="w-8 h-8 rounded-full object-cover border border-brand-border"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-brand-primary/10 border border-brand-primary/30 text-brand-primary font-mono font-bold text-xs flex items-center justify-center">
            {getInitials(user)}
          </div>
        )}
      </button>

      {/* Dropdown Panel */}
      {dropdownOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-brand-border rounded-xl shadow-lg z-50 py-1.5 animate-slide-up text-xs">
          {/* User Header */}
          <div className="px-3.5 py-2.5 border-b border-brand-border bg-brand-bg/30">
            <p className="font-bold text-brand-dark truncate font-display text-xs">
              {user.full_name || user.username || 'Member'}
            </p>
            <p className="text-[11px] text-gray-500 font-mono truncate mt-0.5">
              {user.email}
            </p>
          </div>

          {/* Navigation items */}
          <div className="py-1">
            <Link
              to="/profile"
              onClick={() => setDropdownOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2 text-gray-700 hover:bg-brand-bg hover:text-brand-dark transition-colors font-sans text-xs"
            >
              <UserIcon className="w-4 h-4 text-brand-primary shrink-0" />
              <span>Profile</span>
            </Link>
            <Link
              to="/watchlist"
              onClick={() => setDropdownOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2 text-gray-700 hover:bg-brand-bg hover:text-brand-dark transition-colors font-sans text-xs"
            >
              <Bookmark className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Watchlist</span>
            </Link>
          </div>

          {/* Logout button */}
          <div className="border-t border-brand-border pt-1">
            <button
              type="button"
              onClick={() => {
                setDropdownOpen(false)
                logout()
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-rose-600 hover:bg-rose-50 transition-colors font-sans text-xs text-left cursor-pointer"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { isNavigating, targetPath } = useRouterState({
    select: (s) => ({
      isNavigating: s.isLoading,
      targetPath: s.location.pathname,
    }),
  })

  const isPendingLink = (to: string) =>
    isNavigating && (to === '/' ? targetPath === '/' : targetPath.startsWith(to))

  return (
    <header className="border-b border-brand-border bg-white px-3 sm:px-4 md:px-8 py-2.5 sm:py-3 sticky top-0 z-40 shadow-xs">
      <div className="max-w-360 mx-auto flex items-center justify-between gap-3 sm:gap-4">
        {/* Brand Wordmark */}
        <Link
          to="/"
          search={{ ticker: undefined }}
          className="flex items-center gap-2.5 hover:opacity-90 transition-opacity shrink-0"
        >
          <svg
            className="w-9 h-9 shrink-0 select-none drop-shadow-[0_4px_6px_rgba(249,115,22,0.12)]"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Left Ear/Face segment */}
            <path d="M 6,10 L 16,6 L 16,19 L 6,10 Z" fill="#f97316" />
            {/* Right Ear/Face segment (slightly darker for 3D depth) */}
            <path d="M 26,10 L 16,6 L 16,19 L 26,10 Z" fill="#c2410c" />
            {/* Snout */}
            <path d="M 16,19 L 12,23 L 16,27 L 20,23 Z" fill="#121d25" />
          </svg>
          <div className="hidden sm:block">
            <div className="flex items-center gap-0.5 font-display text-lg tracking-tight leading-none">
              <span className="font-black text-brand-dark">Foxel</span>
              <span className="font-medium text-brand-primary">Signal</span>
            </div>
            <p className="text-[10px] uppercase font-mono tracking-widest text-gray-400 font-bold mt-1.5 leading-none">
              Intelligence Terminal
            </p>
          </div>
          <div className="sm:hidden flex items-center gap-0.5 font-display text-base tracking-tight leading-none">
            <span className="font-black text-brand-dark">Foxel</span>
            <span className="font-medium text-brand-primary">Signal</span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-2 font-mono text-xs">
          {navLinks.map((link) => {
            const pending = isPendingLink(link.to)
            return (
              <Link
                key={link.to}
                to={link.to}
                activeProps={{
                  className:
                    'bg-brand-primary/10 text-brand-primary border-brand-primary/30',
                }}
                inactiveProps={{
                  className: pending
                    ? 'bg-brand-primary/5 text-brand-primary border-brand-primary/30'
                    : 'text-gray-600 hover:text-brand-primary hover:bg-brand-bg/50 border-transparent',
                }}
                className={`px-3.5 py-2 rounded-lg font-bold uppercase tracking-wider transition-all border border-solid text-[11px] whitespace-nowrap inline-flex items-center gap-1.5 ${
                  pending ? 'ring-1 ring-brand-primary/30' : ''
                }`}
              >
                <span>{link.label}</span>
                {pending && (
                  <Loader2 className="w-3 h-3 animate-spin text-brand-primary shrink-0" />
                )}
              </Link>
            )
          })}

          {/* Desktop User Menu Dropdown */}
          <div className="relative ml-2 pl-4 border-l border-brand-border">
            <UserMenu size="md" />
          </div>
        </nav>

        {/* Mobile controls (User Menu Avatar/Sign-in + Hamburger menu) */}
        <div className="flex items-center gap-2 md:hidden">
          <UserMenu
            size="sm"
            onOpen={() => setMenuOpen(false)}
          />
          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            className="p-2 rounded-lg text-gray-500 hover:bg-brand-bg/50 hover:text-brand-dark transition-all"
            aria-label="Toggle navigation"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav Dropdown */}
      {menuOpen && (
        <nav className="md:hidden mt-3 pt-3 border-t border-brand-border flex flex-col gap-1.5 font-mono text-xs animate-fade-in">
          {navLinks.map((link) => {
            const pending = isPendingLink(link.to)
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMenuOpen(false)}
                activeProps={{
                  className:
                    'bg-brand-primary/10 text-brand-primary border-brand-primary/30',
                }}
                inactiveProps={{
                  className: pending
                    ? 'bg-brand-primary/5 text-brand-primary border-brand-primary/30'
                    : 'text-gray-600 hover:text-brand-primary hover:bg-brand-bg/50 border-transparent',
                }}
                className={`px-3.5 py-2.5 rounded-lg font-bold uppercase tracking-wider transition-all border border-solid text-[11px] flex items-center justify-between ${
                  pending ? 'ring-1 ring-brand-primary/30' : ''
                }`}
              >
                <span>{link.label}</span>
                {pending && (
                  <Loader2 className="w-3 h-3 animate-spin text-brand-primary shrink-0" />
                )}
              </Link>
            )
          })}
        </nav>
      )}
    </header>
  )
}
