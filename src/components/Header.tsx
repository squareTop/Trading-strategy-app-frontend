import { Link } from '@tanstack/react-router'
import { useState, useRef, useEffect } from 'react'
import {
  Menu,
  X,
  LogOut,
  User as UserIcon,
  ChevronDown,
  Shield,
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

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { user, isAuthenticated, isLoading, logout } = useAuth()

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              activeProps={{
                className:
                  'bg-brand-primary/10 text-brand-primary border-brand-primary/30',
              }}
              inactiveProps={{
                className:
                  'text-gray-600 hover:text-brand-primary hover:bg-brand-bg/50 border-transparent',
              }}
              className="px-3.5 py-2 rounded-lg font-bold uppercase tracking-wider transition-all border border-solid text-[11px] whitespace-nowrap"
            >
              {link.label}
            </Link>
          ))}

          {/* User Auth Section with Dropdown */}
          <div
            className="relative ml-2 pl-4 border-l border-brand-border"
            ref={dropdownRef}
          >
            {!isLoading && isAuthenticated && user ? (
              <>
                <button
                  type="button"
                  onClick={() => setDropdownOpen((prev) => !prev)}
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
                      <div className="mt-1.5">
                        <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-brand-bg text-gray-600 border border-brand-border">
                          {user.oauth_provider === 'google'
                            ? 'Google OAuth'
                            : 'Password Auth'}
                        </span>
                      </div>
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
                        to="/private"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3.5 py-2 text-gray-700 hover:bg-brand-bg hover:text-brand-dark transition-colors font-sans text-xs"
                      >
                        <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Private Page</span>
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
              </>
            ) : !isLoading ? (
              <Link
                to="/login"
                className="px-3.5 py-2 rounded-lg bg-brand-dark text-white hover:bg-brand-primary transition-colors font-mono font-bold text-[11px] uppercase tracking-wider shadow-xs"
              >
                Sign In
              </Link>
            ) : null}
          </div>
        </nav>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-brand-bg/50 hover:text-brand-dark transition-all"
          aria-label="Toggle navigation"
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Nav Dropdown */}
      {menuOpen && (
        <nav className="md:hidden mt-3 pt-3 border-t border-brand-border flex flex-col gap-1.5 font-mono text-xs animate-fade-in">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMenuOpen(false)}
              activeProps={{
                className:
                  'bg-brand-primary/10 text-brand-primary border-brand-primary/30',
              }}
              inactiveProps={{
                className:
                  'text-gray-600 hover:text-brand-primary hover:bg-brand-bg/50 border-transparent',
              }}
              className="px-3.5 py-2.5 rounded-lg font-bold uppercase tracking-wider transition-all border border-solid text-[11px]"
            >
              {link.label}
            </Link>
          ))}

          <div className="pt-2 border-t border-brand-border">
            {!isLoading && isAuthenticated && user ? (
              <div className="flex flex-col gap-1 px-1">
                {/* Mobile User Summary */}
                <div className="px-3 py-2 rounded-lg bg-brand-bg/50 border border-brand-border/60 flex items-center gap-2.5 mb-1">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover border border-brand-border shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-brand-primary/10 border border-brand-primary/30 text-brand-primary font-mono font-bold text-xs flex items-center justify-center shrink-0">
                      {getInitials(user)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-brand-dark text-xs truncate">
                      {user.full_name || user.username || 'Member'}
                    </p>
                    <p className="text-[10px] text-gray-500 font-mono truncate">
                      {user.email}
                    </p>
                  </div>
                </div>

                <Link
                  to="/profile"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-brand-bg text-brand-dark text-xs font-sans transition-colors"
                >
                  <UserIcon className="w-4 h-4 text-brand-primary" />
                  <span>Profile</span>
                </Link>

                <Link
                  to="/private"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-brand-bg text-brand-dark text-xs font-sans transition-colors"
                >
                  <Shield className="w-4 h-4 text-emerald-600" />
                  <span>Private Page</span>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    logout()
                    setMenuOpen(false)
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-rose-600 hover:bg-rose-50 text-xs font-sans transition-colors text-left cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : !isLoading ? (
              <div className="flex gap-2 px-1">
                <Link
                  to="/login"
                  onClick={() => setMenuOpen(false)}
                  className="flex-1 text-center py-2 rounded-lg bg-brand-dark text-white font-mono font-bold text-xs uppercase tracking-wider"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMenuOpen(false)}
                  className="flex-1 text-center py-2 rounded-lg border border-brand-border text-brand-dark font-mono font-bold text-xs uppercase tracking-wider hover:bg-brand-bg"
                >
                  Sign Up
                </Link>
              </div>
            ) : null}
          </div>
        </nav>
      )}
    </header>
  )
}
