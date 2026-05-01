import { Link } from '@tanstack/react-router'
import ThemeToggle from './ThemeToggle'

export default function Header() {
  return (
    <header>
      <div className="nav">
        <Link to="/" className="brand">
          <div className="logo-mark">F</div>
          <span>FoxelSignal</span>
        </Link>
        <nav>
          <ul>
            <li>
              <Link to="/vmi">VMI</Link>
            </li>
            <li>
              <Link to="/backtest">Backtest</Link>
            </li>
            <li>
              <a href="#workflow">How it works</a>
            </li>
            <li>
              <a className="nav-cta" href="#start">
                Launch Demo
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  )
}
