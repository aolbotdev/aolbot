export default function FeeCard({ fee }) {
  return (
    <div className="fee-card">
      <div className="fee-card-title">Launch Fee</div>
      <div className="fee-row">
        <span className="fee-label">Fee (USD)</span>
        <span className="fee-value">${fee.fee_usd.toFixed(2)}</span>
      </div>
      <div className="fee-row">
        <span className="fee-label">AOL Amount</span>
        <span className="fee-value">{fee.aol_amount_ui} AOL</span>
      </div>
      {fee.is_exempt && (
        <div className="fee-row">
          <span className="fee-badge">Fee Exempt</span>
        </div>
      )}
      <p className="fee-note">Quote locked for 60 seconds · Nonce: {fee.nonce.slice(0, 8)}…</p>
    </div>
  )
}
