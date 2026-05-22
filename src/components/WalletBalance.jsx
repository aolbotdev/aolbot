import { useEffect, useState, useRef } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import solIcon  from '../assets/sol.png'
import usd1Icon from '../assets/usd1.png'

// USD1 stablecoin by WLFI on Solana mainnet
const USD1_MINT = 'USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB'

export default function WalletBalance() {
  const { publicKey, connected } = useWallet()
  const { connection } = useConnection()

  const [sol, setSol]   = useState(null)
  const [usd1, setUsd1] = useState(null)
  const subIds = useRef([])

  useEffect(() => {
    if (!connected || !publicKey) {
      setSol(null)
      setUsd1(null)
      return
    }

    let cancelled = false

    // Remove any previous subscriptions
    subIds.current.forEach(id => {
      try { connection.removeAccountChangeListener(id) } catch {}
    })
    subIds.current = []

    async function init() {
      try {
        // ── SOL ────────────────────────────────────────────────────────────
        const lamports = await connection.getBalance(publicKey, 'confirmed')
        if (!cancelled) setSol(lamports / 1e9)

        // Real-time SOL updates via WebSocket
        const solSub = connection.onAccountChange(
          publicKey,
          (info) => setSol(info.lamports / 1e9),
          'confirmed',
        )
        subIds.current.push(solSub)

        // ── USD1 ───────────────────────────────────────────────────────────
        const accounts = await connection.getParsedTokenAccountsByOwner(
          publicKey,
          { mint: new PublicKey(USD1_MINT) },
        )

        const tokenAccount = accounts.value[0]
        if (!cancelled) {
          const amount = tokenAccount
            ?.account.data.parsed.info.tokenAmount.uiAmount ?? 0
          setUsd1(amount)
        }

        // Real-time USD1 updates via WebSocket
        if (tokenAccount) {
          const tokenPubkey = tokenAccount.pubkey
          const usd1Sub = connection.onAccountChange(
            tokenPubkey,
            async () => {
              // Re-fetch parsed data so we get the correct uiAmount
              try {
                const info = await connection.getParsedAccountInfo(tokenPubkey)
                const uiAmount =
                  info.value?.data?.parsed?.info?.tokenAmount?.uiAmount ?? 0
                setUsd1(uiAmount)
              } catch {}
            },
            'confirmed',
          )
          subIds.current.push(usd1Sub)
        }
      } catch { /* ignore RPC errors */ }
    }

    init()

    // Fallback poll every 8s in case WebSocket misses an event
    const poll = setInterval(async () => {
      if (cancelled) return
      try {
        const lamports = await connection.getBalance(publicKey, 'confirmed')
        if (!cancelled) setSol(lamports / 1e9)
      } catch {}
    }, 8_000)

    return () => {
      cancelled = true
      clearInterval(poll)
      subIds.current.forEach(id => {
        try { connection.removeAccountChangeListener(id) } catch {}
      })
      subIds.current = []
    }
  }, [connected, publicKey, connection])

  if (!connected || sol === null) return null

  const fmtSol  = sol.toFixed(3)
  const fmtUsd1 = usd1 !== null
    ? usd1.toLocaleString(undefined, { maximumFractionDigits: 2 })
    : '—'

  return (
    <div className="wallet-balances">
      {/* SOL */}
      <div className="wallet-balance-item">
        <img src={solIcon} alt="SOL" className="balance-token-icon" />
        <span className="balance-amount">{fmtSol}</span>
        <span className="balance-ticker">SOL</span>
      </div>

      <div className="wallet-balance-divider" />

      {/* USD1 */}
      <div className="wallet-balance-item">
        <img src={usd1Icon} alt="USD1" className="balance-token-icon" />
        <span className="balance-amount">{fmtUsd1}</span>
        <span className="balance-ticker">USD1</span>
      </div>
    </div>
  )
}
