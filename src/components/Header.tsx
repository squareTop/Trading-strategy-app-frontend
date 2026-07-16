import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'

const navLinks = [
  { to: '/', label: 'IV Valuation' },
  { to: '/daily-signals', label: 'Daily Signals' },
  { to: '/scoreboard', label: 'Scoreboard' },
  { to: '/thesis', label: 'Thesis AI' },
] as const

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="border-b border-brand-border bg-white px-4 md:px-8 py-3 sticky top-0 z-40 shadow-xs">
      <div className="max-w-360 mx-auto flex items-center justify-between gap-4">
        {/* Brand Wordmark */}
        <Link to="/" search={{ ticker: undefined }} className="flex items-center gap-2.5 hover:opacity-90 transition-opacity shrink-0">
          <svg className="w-9 h-9 shrink-0 select-none drop-shadow-[0_4px_6px_rgba(249,115,22,0.12)]" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
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
              activeProps={{ className: 'bg-brand-primary/10 text-brand-primary border-brand-primary/30' }}
              inactiveProps={{ className: 'text-gray-600 hover:text-brand-primary hover:bg-brand-bg/50 border-transparent' }}
              className="px-3.5 py-2 rounded-lg font-bold uppercase tracking-wider transition-all border border-solid text-[11px] whitespace-nowrap"
            >
              {link.label}
            </Link>
          ))}
          <div className="flex items-center gap-2 ml-2 pl-4 border-l border-brand-border py-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-gray-400 uppercase tracking-widest text-[9px] font-bold">Live</span>
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
              activeProps={{ className: 'bg-brand-primary/10 text-brand-primary border-brand-primary/30' }}
              inactiveProps={{ className: 'text-gray-600 hover:text-brand-primary hover:bg-brand-bg/50 border-transparent' }}
              className="px-3.5 py-2.5 rounded-lg font-bold uppercase tracking-wider transition-all border border-solid text-[11px]"
            >
              {link.label}
            </Link>
          ))}
          <div className="flex items-center gap-2 px-3.5 py-2 text-gray-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="uppercase tracking-widest text-[9px] font-bold">Live</span>
          </div>
        </nav>
      )}
    </header>
  )
}
