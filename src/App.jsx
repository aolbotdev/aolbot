import { useMemo } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react'
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TrustWalletAdapter,
  CoinbaseWalletAdapter,
} from '@solana/wallet-adapter-wallets'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import '@solana/wallet-adapter-react-ui/styles.css'

import Header from './components/Header'
import AgentBuilder from './components/AgentBuilder'
import AboutPage from './components/AboutPage'

export default function App() {
  const endpoint =
    import.meta.env.VITE_SOLANA_RPC ||
    'https://rpc.ankr.com/solana'
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new TrustWalletAdapter(),
      new CoinbaseWalletAdapter(),
    ],
    [],
  )

  return (
    <BrowserRouter>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            <div className="app">
              <Header />
              <div className="security-trust-bar">
                <div className="security-trust-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  Non-Custodial — we never access your private keys
                </div>
                <span className="security-trust-dot">·</span>
                <div className="security-trust-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  Powered by Solana Wallet Adapter
                </div>
                <span className="security-trust-dot">·</span>
                <div className="security-trust-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13"><polyline points="20 6 9 17 4 12"/></svg>
                  All transactions signed locally in your wallet
                </div>
                <span className="security-trust-dot">·</span>
                <div className="security-trust-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  Supports Phantom · Solflare · Coinbase · Trust
                </div>
              </div>
              <Routes>
                <Route path="/" element={
                  <main className="main">
                    <div className="main-layout">
                      <AgentBuilder />
                    </div>
                  </main>
                } />
                <Route path="/about" element={<AboutPage />} />
              </Routes>
              <footer className="footer">
                <span>© {new Date().getFullYear()} AOLBOT. All rights reserved.</span>
              </footer>
            </div>
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </BrowserRouter>
  )
}
