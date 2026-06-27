import { Link } from '@tanstack/react-router'

export default function Header() {
  return (
    <header className="border-b border-brand-border bg-white px-4 md:px-8 py-4 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Brand Wordmark */}
        <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
          <div className="w-9 h-9 rounded-lg bg-brand-primary flex items-center justify-center text-white font-extrabold text-lg tracking-wider select-none shadow-md shadow-brand-primary/20">
            FS
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-display font-black text-lg tracking-tight text-brand-dark">FC</span>
              <span className="font-display font-medium text-lg tracking-tight text-brand-dark">FoxelSignal</span>
            </div>
            <p className="text-[10px] uppercase font-mono tracking-widest text-gray-400 font-bold">
              Intelligence Terminal
            </p>
          </div>
        </Link>

        {/* Global Navigation Links on the Right */}
        <nav className="flex items-center gap-2 sm:gap-4 font-mono text-xs">
          <Link
            to="/"
            activeProps={{ className: 'bg-brand-primary/10 text-brand-primary border-brand-primary/30' }}
            inactiveProps={{ className: 'text-gray-600 hover:text-brand-primary hover:bg-brand-bg/50 border-transparent' }}
            className="px-3.5 py-2 rounded-lg font-bold uppercase tracking-wider transition-all border border-solid text-[11px]"
          >
            IV Valuation
          </Link>
          <Link
            to="/daily-signals"
            activeProps={{ className: 'bg-brand-primary/10 text-brand-primary border-brand-primary/30' }}
            inactiveProps={{ className: 'text-gray-600 hover:text-brand-primary hover:bg-brand-bg/50 border-transparent' }}
            className="px-3.5 py-2 rounded-lg font-bold uppercase tracking-wider transition-all border border-solid text-[11px]"
          >
            Daily Signals
          </Link>

          {/* Quick heartbeat status indicator to preserve premium financial terminal feel */}
          <div className="hidden md:flex items-center gap-2 ml-2 pl-4 border-l border-brand-border py-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-gray-400 uppercase tracking-widest text-[9px] font-bold">Live</span>
          </div>
        </nav>
      </div>
    </header>
  )
}
