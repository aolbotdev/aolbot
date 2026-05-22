import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'

export default function SecureWalletButton() {
  const { connected, publicKey, disconnect, wallet } = useWallet()
  const { setVisible } = useWalletModal()
  const [showSecurity, setShowSecurity] = useState(false)

  const short = publicKey
    ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
    : ''

  const handleProceed = () => {
    setShowSecurity(false)
    setVisible(true)
  }

  if (connected && publicKey) {
    return (
      <div className="swb-connected">
        {wallet?.adapter?.icon && (
          <img src={wallet.adapter.icon} alt={wallet.adapter.name} className="swb-wallet-icon" />
        )}
        <span className="swb-address">{short}</span>
        <span className="swb-divider" />
        <button className="swb-disconnect" onClick={disconnect}>Disconnect</button>
      </div>
    )
  }

  return (
    <>
      <button className="swb-connect-btn" onClick={() => setShowSecurity(true)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
          <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-4 0v2"/><line x1="12" y1="12" x2="12" y2="16"/>
        </svg>
        Connect Wallet
      </button>

      {showSecurity && (
        <div className="swb-overlay" onClick={() => setShowSecurity(false)}>
          <div className="swb-modal" onClick={e => e.stopPropagation()}>

            <div className="swb-modal-shield">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="36" height="36">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>

            <h2 className="swb-modal-title">Your wallet is safe</h2>
            <p className="swb-modal-sub">
              AOLBOT uses the official <strong>Solana Wallet Adapter</strong> — an open-source,
              community-audited library maintained by Anza (Solana Labs).
            </p>

            <ul className="swb-modal-list">
              <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>
                <span><strong>Non-custodial</strong> — we never store or access your private keys</span>
              </li>
              <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>
                <span>All transactions are <strong>signed locally</strong> inside your wallet app</span>
              </li>
              <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>
                <span><strong>No funds</strong> are held or moved without your explicit approval</span>
              </li>
              <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>
                <span>Connection is <strong>SSL-encrypted</strong> end-to-end</span>
              </li>
            </ul>

            <div className="swb-modal-wallets">
              <span>Supported wallets:</span>
              <span className="swb-wallet-tag">Phantom</span>
              <span className="swb-wallet-tag">Solflare</span>
              <span className="swb-wallet-tag">Coinbase</span>
              <span className="swb-wallet-tag">Trust</span>
            </div>

            <button className="swb-modal-proceed" onClick={handleProceed}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              Connect Wallet Securely
            </button>
            <button className="swb-modal-cancel" onClick={() => setShowSecurity(false)}>
              Cancel
            </button>

          </div>
        </div>
      )}
    </>
  )
}
