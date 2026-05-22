const EXPLORER = 'https://solscan.io'

export default function ResultCard({ result, onReset }) {
  return (
    <div className="result-card">
      <div className="result-icon">🦅</div>
      <h2 className="result-title">Token Launched!</h2>
      <p className="result-sub">Your token is live on Solana · God Bless America 🇺🇸</p>

      <div className="result-rows">
        <div className="result-row">
          <span className="result-label">Mint Address</span>
          <a
            className="result-link"
            href={`${EXPLORER}/token/${result.mint_address}`}
            target="_blank"
            rel="noreferrer"
          >
            {result.mint_address.slice(0, 8)}…{result.mint_address.slice(-6)}
          </a>
        </div>

        <div className="result-row">
          <span className="result-label">Transaction</span>
          <a
            className="result-link"
            href={`${EXPLORER}/tx/${result.tx_signature}`}
            target="_blank"
            rel="noreferrer"
          >
            {result.tx_signature.slice(0, 8)}…{result.tx_signature.slice(-6)}
          </a>
        </div>

        {result.pool && (
          <div className="result-row">
            <span className="result-label">Pool</span>
            <a
              className="result-link"
              href={`${EXPLORER}/account/${result.pool}`}
              target="_blank"
              rel="noreferrer"
            >
              {result.pool.slice(0, 8)}…{result.pool.slice(-6)}
            </a>
          </div>
        )}

        <div className="result-row">
          <span className="result-label">Metadata</span>
          <span className={`badge ${result.metadata_persisted ? 'badge-green' : 'badge-gray'}`}>
            {result.metadata_persisted ? '✓ Persisted' : 'Pending'}
          </span>
        </div>
      </div>

      <div className="result-actions">
        <a
          className="btn btn-outline"
          href={`https://america.fun/token/${result.mint_address}`}
          target="_blank"
          rel="noreferrer"
        >
          View on America.Fun ↗
        </a>
        <button className="btn btn-primary" onClick={onReset}>
          🚀 Launch Another
        </button>
      </div>
    </div>
  )
}
