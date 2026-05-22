import { Link, useLocation } from 'react-router-dom'
import WalletBalance from './WalletBalance'
import SecureWalletButton from './SecureWalletButton'

export default function Header() {
  const { pathname } = useLocation()

  return (
    <header className="header">
      <div className="header-launch-banner">
        🚀 Official Launch — <strong>Monday, May 25, 2026</strong>
      </div>
      <div className="header-inner">
        <div className="header-left">
          <Link to="/" className="logo" style={{ textDecoration: 'none' }}>
            <img src="/aolbot.png" alt="AOLBOT" className="logo-img" />
            <div className="logo-info">
              <span className="logo-name">AOLBOT</span>
              <span className="logo-desc">Launch tokens & deploy AI agents on X — in one click</span>
            </div>
          </Link>

          <nav className="header-nav">
            <Link to="/" className={`header-nav-link ${pathname === '/' ? 'active' : ''}`}>App</Link>
            <Link to="/about" className={`header-nav-link ${pathname === '/about' ? 'active' : ''}`}>About Us</Link>
            <a href="https://america.fun" target="_blank" rel="noopener noreferrer" className="header-nav-link header-nav-usa">America.Fun</a>
          </nav>
        </div>

        <div className="header-right">
          <div className="header-security-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            Non-custodial
          </div>
          <WalletBalance />
          <SecureWalletButton />
        </div>
      </div>
    </header>
  )
}
