import { Link } from '@tanstack/react-router'

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-brand-border/60 bg-white/40 backdrop-blur-xs py-8 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Navigation & Brand Links */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-brand-border/40">
          <div className="flex items-center gap-2 font-display text-sm tracking-tight">
            <span className="font-black text-brand-dark">Foxel</span>
            <span className="font-medium text-brand-primary">Signal</span>
            <span className="text-[10px] uppercase font-mono tracking-widest text-gray-400 font-bold ml-1">
              Terminal
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-mono text-gray-500">
            <Link to="/" className="hover:text-brand-primary transition-colors">
              IV Valuation
            </Link>
            <Link to="/daily-signals" className="hover:text-brand-primary transition-colors">
              Daily Signals
            </Link>
            <Link to="/scoreboard" className="hover:text-brand-primary transition-colors">
              Scoreboard
            </Link>
            <Link to="/thesis" className="hover:text-brand-primary transition-colors">
              Thesis AI
            </Link>
            <Link to="/congress" className="hover:text-brand-primary transition-colors">
              Congress Trades
            </Link>
            <Link to="/about" className="hover:text-brand-primary transition-colors">
              About
            </Link>
          </div>
        </div>

        {/* Regulatory & Risk Disclaimer */}
        <div className="text-center max-w-3xl mx-auto">
          <p className="text-[10px] text-gray-400 font-mono leading-relaxed">
            <span className="font-semibold text-gray-500">Disclaimer:</span> The
            information provided on this platform is for educational and
            informational purposes only and does not constitute financial,
            investment, or legal advice. Trading financial instruments involves
            significant risk of loss. Past performance is not indicative of
            future results. Always consult with a licensed professional before
            making investment decisions.
          </p>
          <p className="text-[10px] text-gray-400 font-mono mt-3">
            &copy; {new Date().getFullYear()} FoxelSignal &bull; Quantitative Strategy &amp; Market Intelligence
          </p>
        </div>
      </div>
    </footer>
  )
}
