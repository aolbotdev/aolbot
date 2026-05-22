import { useState, useCallback, useRef } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { Transaction, VersionedTransaction } from '@solana/web3.js'
import {
  getFeeEstimate,
  launchToken,
  confirmLaunch,
  uploadImageToPinata,
  uploadMetadata,
} from '../services/api'
import FeeCard from './FeeCard'
import StepIndicator from './StepIndicator'
import ResultCard from './ResultCard'

const MODES = [
  { value: 0, label: 'America Mode' },
  { value: 1, label: 'Crack Mode' },
]

const STEPS = ['Fill Details', 'Confirm Fee', 'Sign & Submit', 'Done']

const DEFAULT_FORM = {
  name: '',
  symbol: '',
  description: '',
  website: '',
  twitter: '',
  telegram: '',
  discord: '',
  mode: 0,
  anti_sniper: true,
  initial_buy_usd1: '',
  initial_buy_slippage: '500',
  tip_lamports: '',
  api_key: '',
}

const STAGE_LABELS = {
  image:     'Uploading image to IPFS…',
  metadata:  'Saving metadata…',
  fee:       'Getting fee estimate…',
  launching: 'Submitting to blockchain…',
  signing:   'Waiting for wallet signature…',
  confirming:'Confirming transaction…',
}

export default function TokenLaunchForm() {
  const { publicKey, sendTransaction, signAllTransactions, connected } = useWallet()
  const { connection } = useConnection()

  const [form, setForm] = useState(DEFAULT_FORM)

  // Image state
  const [imageFile, setImageFile]       = useState(null)
  const [imagePreview, setImagePreview] = useState(null)  // object URL
  const [imageUrl, setImageUrl]         = useState('')     // typed fallback
  const fileInputRef = useRef()

  const [step, setStep]           = useState(0)
  const [loadingStage, setStage]  = useState(null)
  const [feeData, setFeeData]     = useState(null)
  const [pinnedUri, setPinnedUri] = useState(null)
  const [txCount, setTxCount]     = useState(1)
  const [error, setError]         = useState(null)
  const [result, setResult]       = useState(null)

  const creator = publicKey?.toBase58() ?? ''
  const previewSrc = imagePreview || imageUrl || null
  const isLoading = Boolean(loadingStage)

  // ── image handlers ──────────────────────────────────────────────────────────
  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPG, GIF, WebP…)')
      return
    }
    setImageFile(file)
    setError(null)
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImagePreview(URL.createObjectURL(file))
    setImageUrl('')
  }

  function handleDrop(e) {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) handleFileChange({ target: { files: [file] } })
  }

  function clearImage() {
    setImageFile(null)
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImagePreview(null)
    setImageUrl('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    let finalValue = type === 'checkbox' ? checked : value
    // Symbol must be uppercase alphanumeric only
    if (name === 'symbol') {
      finalValue = value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    }
    setForm(f => ({ ...f, [name]: finalValue }))
  }

  // ── metadata preview ─────────────────────────────────────────────────────────
  const metadata = buildMetadata(form, imageUrl)
  const jsonStr  = JSON.stringify(metadata, null, 2)

  // ── step 1: upload + fee estimate ────────────────────────────────────────────
  const handlePrepare = useCallback(async () => {
    if (!connected) return setError('Connect your wallet first.')
    if (!form.name || !form.symbol || !form.description) {
      return setError('Name, Symbol and Description are required.')
    }
    if (form.symbol.length < 3 || form.symbol.length > 10) {
      return setError('Symbol must be 3–10 characters.')
    }
    if (!imageFile && !imageUrl) {
      return setError('Add a token image (upload from computer or paste a URL).')
    }

    setError(null)
    setFeeData(null)
    setPinnedUri(null)

    try {
      // 1. Upload image to Pinata IPFS → real HTTPS URL (required by Axiom/GMGM/etc.)
      let finalImageUrl = imageUrl
      if (imageFile) {
        setStage('image')
        finalImageUrl = await uploadImageToPinata(imageFile)
      }

      // 2. Upload metadata JSON
      setStage('metadata')
      const meta = buildMetadata(form, finalImageUrl)
      const uri  = await uploadMetadata(meta, form.symbol)
      setPinnedUri(uri)

      // 3. Fee estimate
      setStage('fee')
      const fee = await getFeeEstimate(creator, form.api_key)
      setFeeData(fee)
      setStep(1)
    } catch (e) {
      setError(e.message)
    } finally {
      setStage(null)
    }
  }, [connected, form, imageFile, imageUrl, creator])

  // ── step 2: launch + sign + confirm ──────────────────────────────────────────
  const handleLaunch = useCallback(async () => {
    if (!feeData || !pinnedUri) return
    setError(null)

    try {
      const payload = {
        name:         form.name,
        symbol:       form.symbol,
        uri:          pinnedUri,
        creator,
        mode:         Number(form.mode),
        anti_sniper:  form.anti_sniper,
        fee_nonce:    feeData.nonce,
      }
      const usd1Amount = parseFloat(form.initial_buy_usd1)
      if (usd1Amount > 0) {
        // USD1 has 6 decimals (same as USDC)
        const usd1Units = Math.round(usd1Amount * 1_000_000)
        payload.initial_buy = {
          amount:       String(usd1Units),
          slippage_bps: Number(form.initial_buy_slippage),
        }
      }
      if (form.tip_lamports) payload.tip_lamports = form.tip_lamports

      setStage('launching')
      const launchData = await launchToken(payload, form.api_key)
      setTxCount(launchData.messages?.length ?? 1)
      setStep(2)

      // Deserialize transactions
      const txs = launchData.messages.map(b64 => {
        const bytes = Buffer.from(b64, 'base64')
        try { return VersionedTransaction.deserialize(bytes) }
        catch { return Transaction.from(bytes) }
      })

      // Only send transactions that actually require the user's signature.
      // America.Fun bundles several txs for Jito — most are pre-signed by
      // their backend. Sending all of them would charge the user multiple fees.
      const userKey = publicKey.toBase58()
      const txsForUser = txs.filter(tx => needsUserSignature(tx, userKey))

      // If none matched (unexpected), fall back to first tx only
      const txsToSend = txsForUser.length > 0 ? txsForUser : [txs[0]]
      setTxCount(txsToSend.length)

      setStage('signing')
      let signatures = []

      if (txsToSend.length === 1) {
        // Single tx — just use sendTransaction (one popup)
        const sig = await sendTransaction(txsToSend[0], connection, {
          skipPreflight: true,
          maxRetries: 5,
        })
        signatures = [sig]
      } else {
        // Multiple txs — sign all at once (one popup), then broadcast separately
        const signed = await signAllTransactions(txsToSend)
        for (const tx of signed) {
          const sig = await connection.sendRawTransaction(tx.serialize(), {
            skipPreflight: true,
            maxRetries: 5,
          })
          signatures.push(sig)
        }
      }

      setStage('confirming')
      const primarySig = signatures[0]

      // Wait for on-chain confirmation (up to ~60 s)
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
      await connection.confirmTransaction(
        { signature: primarySig, blockhash, lastValidBlockHeight },
        'confirmed',
      )

      const confirmData = await confirmLaunch(
        {
          id:           launchData.allocation_id,
          tx_signature: primarySig,
          mint_address: launchData.mint_address,
          metadata_url: pinnedUri,
        },
        form.api_key,
      )

      setResult({
        mint_address:       launchData.mint_address,
        tx_signature:       primarySig,
        pool:               launchData.pool,
        confirmed:          confirmData.success,
        metadata_persisted: confirmData.metadata_persisted,
      })
      setStep(3)
    } catch (e) {
      let msg = e.message || String(e)

      // User cancelled the wallet popup — go back to step 1 silently
      if (
        msg.includes('User rejected') ||
        msg.includes('user rejected') ||
        msg.includes('Transaction cancelled') ||
        msg.includes('Transaction was not confirmed') ||
        msg.includes('Rejected by user') ||
        msg.includes('cancelled')
      ) {
        setError('Transaction cancelled. You can try again below.')
        setStep(1)
        return
      }

      if (msg.includes('AccountOwnedByWrongProgram') || msg.includes('custom program error: 0xbbf')) {
        msg = 'America.Fun simulation error (0xbbf).\nTry switching to "Crack Mode" and launch again.'
      }

      setError(msg)
      // Any other error on step 2 — go back to step 1 to retry
      if (step === 2) setStep(1)
    } finally {
      setStage(null)
    }
  }, [feeData, pinnedUri, form, creator, connection, sendTransaction, signAllTransactions, step])

  function resetAll() {
    setForm(DEFAULT_FORM)
    clearImage()
    setStep(0)
    setFeeData(null)
    setPinnedUri(null)
    setError(null)
    setResult(null)
    setStage(null)
  }

  // ── result ───────────────────────────────────────────────────────────────────
  if (result) {
    return (
      <div className="form-container">
        <ResultCard result={result} onReset={resetAll} />
      </div>
    )
  }

  const canPrepare = connected && form.name && form.symbol && form.description && (imageFile || imageUrl)
  const loadingLabel = STAGE_LABELS[loadingStage] ?? 'Loading…'

  return (
    <div className="form-container">
      <div className="form-card">
        <h2 className="form-title">🚀 Launch Your Token</h2>
        <p className="form-subtitle">Fill in the details — image, metadata & blockchain handled automatically.</p>

        <StepIndicator steps={STEPS} current={step} />

        {/* ── STEP 0: fill form ───────────────────────────────────────────── */}
        {step === 0 && (
          <>
            {/* Basic info */}
            <div className="section-label">Token Info</div>
            <div className="field-row">
              <div className="field-group">
                <label className="label">Token Name <span className="required">*</span></label>
                <input className="input" name="name" placeholder="e.g. Freedom Coin" value={form.name} onChange={handleChange} />
              </div>
              <div className="field-group">
                <label className="label">Symbol <span className="required">*</span></label>
                <input className="input" name="symbol" placeholder="e.g. FREE" value={form.symbol} onChange={handleChange} maxLength={10} style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }} />
              <p className="hint" style={{ color: form.symbol.length > 0 && (form.symbol.length < 3 || form.symbol.length > 10) ? 'var(--red)' : undefined }}>
                {form.symbol.length}/10 · 3–10 uppercase letters or numbers
              </p>
              </div>
            </div>

            <div className="field-group">
              <label className="label">Description <span className="required">*</span></label>
              <textarea className="input textarea" name="description" placeholder="What is this token about?" value={form.description} onChange={handleChange} rows={2} />
            </div>

            {/* Image */}
            <div className="field-group">
              <label className="label">Token Image <span className="required">*</span></label>
              <div
                className={`drop-zone drop-zone-sm ${previewSrc ? 'has-image' : ''}`}
                onClick={!previewSrc ? () => fileInputRef.current?.click() : undefined}
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
              >
                {previewSrc ? (
                  <div className="drop-zone-preview drop-zone-preview-sm">
                    <img src={previewSrc} alt="Token" />
                    <button type="button" className="clear-image-btn" onClick={e => { e.stopPropagation(); clearImage() }}>✕</button>
                    {imageFile && <span className="file-badge">{imageFile.name}</span>}
                  </div>
                ) : (
                  <div className="drop-zone-empty">
                    <div className="drop-icon" style={{ fontSize: 20 }}>🖼</div>
                    <div className="drop-text" style={{ fontSize: 13 }}><strong>Click</strong> or drag & drop</div>
                    <div className="drop-hint">PNG, JPG, GIF, WebP</div>
                  </div>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
            </div>

            {/* Socials */}
            <div className="section-label">Social Links <span className="optional">(optional)</span></div>
            <div className="field-row">
              <div className="field-group">
                <label className="label">Website</label>
                <input className="input" name="website" placeholder="https://mytoken.xyz" value={form.website} onChange={handleChange} />
              </div>
              <div className="field-group">
                <label className="label">Twitter / X</label>
                <input className="input" name="twitter" placeholder="https://x.com/mytoken" value={form.twitter} onChange={handleChange} />
              </div>
            </div>
            <div className="field-row">
              <div className="field-group">
                <label className="label">Telegram</label>
                <input className="input" name="telegram" placeholder="https://t.me/mytoken" value={form.telegram} onChange={handleChange} />
              </div>
              <div className="field-group">
                <label className="label">Discord</label>
                <input className="input" name="discord" placeholder="https://discord.gg/..." value={form.discord} onChange={handleChange} />
              </div>
            </div>

            {/* Launch options */}
            <div className="section-label">Launch Options</div>
            <div className="field-group">
              <label className="label">Launch Mode</label>
              <div className="radio-group">
                {MODES.map(m => (
                  <label key={m.value} className={`radio-option ${Number(form.mode) === m.value ? 'active' : ''}`}>
                    <input type="radio" name="mode" value={m.value} checked={Number(form.mode) === m.value} onChange={handleChange} />
                    {m.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="field-group">
              <label className="label">
                Initial Buy <span className="optional">(USD1, optional)</span>
              </label>
              <div className="input-prefix-wrap">
                <input
                  className="input input-prefixed"
                  name="initial_buy_usd1"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={form.initial_buy_usd1}
                  onChange={handleChange}
                  style={{ paddingLeft: 14 }}
                />
                <span style={{ position:'absolute', right:12, color:'var(--text-muted)', fontSize:13, pointerEvents:'none' }}>USD1</span>
              </div>
              {parseFloat(form.initial_buy_usd1) > 0 && (
                <p className="hint">= ${parseFloat(form.initial_buy_usd1).toFixed(2)} (1 USD1 ≈ $1)</p>
              )}
            </div>

            <div className="checkbox-field" style={{ marginBottom: 10 }}>
              <label className="checkbox-label">
                <input type="checkbox" name="anti_sniper" checked={form.anti_sniper} onChange={handleChange} />
                <span>Enable Anti-Sniper <span className="optional">— blocks bots in the first blocks</span></span>
              </label>
            </div>
          </>
        )}

        {/* ── STEP 1: fee confirmation ─────────────────────────────────────── */}
        {step === 1 && feeData && (
          <>
            <div className="section-label">Review & Confirm</div>
            <div className="token-summary">
              {previewSrc && <img src={previewSrc} alt="" className="summary-img" />}
              <div>
                <div className="summary-name">{form.name} <span className="summary-symbol">{form.symbol}</span></div>
                <div className="summary-desc">{form.description}</div>
                {pinnedUri && (
                  <a className="summary-uri" href={pinnedUri} target="_blank" rel="noreferrer">
                    View metadata ↗
                  </a>
                )}
              </div>
            </div>
            <FeeCard fee={feeData} />

            {/* Anti-sniper warning: multiple txs = multiple network fees */}
            <div className="info-box">
              <div className="info-row">
                <span>🔏 Wallet signatures needed</span>
                <strong>{txCount}</strong>
              </div>
              {form.anti_sniper && (
                <div className="info-row">
                  <span>🛡 Anti-sniper is ON — requires {txCount} transaction{txCount > 1 ? 's' : ''}, each costs a small Solana network fee</span>
                </div>
              )}
              {parseFloat(form.initial_buy_usd1) > 0 && (
                <div className="info-row">
                  <span>💰 Initial buy</span>
                  <strong>{parseFloat(form.initial_buy_usd1).toFixed(2)} USD1</strong>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── errors ──────────────────────────────────────────────────────── */}
        {error && (
          <div className="error-box" style={{ whiteSpace: 'pre-wrap' }}>
            <span className="error-icon">⚠</span> {error}
          </div>
        )}

        {/* ── loading progress ─────────────────────────────────────────────── */}
        {isLoading && (
          <div className="loading-stage">
            <span className="spinner" />
            {loadingLabel}
          </div>
        )}

        {/* ── buttons ──────────────────────────────────────────────────────── */}
        <div className="button-row">
          {step === 0 && (
            <button className="btn btn-primary" onClick={handlePrepare} disabled={isLoading || !canPrepare}>
              {isLoading ? <span className="spinner" /> : '🚀'}
              {isLoading ? loadingLabel : 'Launch Token'}
            </button>
          )}
          {step === 1 && (
            <>
              <button className="btn btn-secondary" onClick={() => { setStep(0); setFeeData(null) }} disabled={isLoading}>
                ← Edit
              </button>
              <button className="btn btn-primary" onClick={handleLaunch} disabled={isLoading}>
                {isLoading ? <span className="spinner" /> : null}
                {isLoading ? loadingLabel : 'Confirm & Sign →'}
              </button>
            </>
          )}
          {step === 2 && (
            <div className="signing-info">
              <span className="spinner" /> {loadingLabel || 'Processing…'}
            </div>
          )}
        </div>

        {!connected && (
          <p className="wallet-hint">Connect your wallet using the button in the top right to get started.</p>
        )}
      </div>
    </div>
  )
}

// Returns true if this transaction has the user's wallet as a required signer
// (i.e. their signature slot is empty / zeroed out).
function needsUserSignature(tx, userKeyBase58) {
  try {
    if (tx instanceof VersionedTransaction) {
      const msg = tx.message
      const numSigners = msg.header.numRequiredSignatures
      // staticAccountKeys[0..numSigners-1] are the required signers
      for (let i = 0; i < numSigners; i++) {
        if (msg.staticAccountKeys[i].toBase58() === userKeyBase58) {
          // Check whether that signature slot is still zeroed (not yet signed)
          const sig = tx.signatures[i]
          const isZeroed = !sig || sig.every(b => b === 0)
          return isZeroed
        }
      }
      return false
    } else {
      // Legacy Transaction
      return tx.signatures.some(
        s => s.publicKey.toBase58() === userKeyBase58 && !s.signature,
      )
    }
  } catch {
    return true // if we can't tell, include it
  }
}

function buildMetadata(form, imageUrl) {
  // pump.fun / America.Fun compatible metadata format
  // aggregators (Axiom, GMGM, Birdeye, DexScreener) all read this layout
  const meta = {
    name:        form.name        || 'My Token',
    symbol:      form.symbol      || 'MYTKN',
    description: form.description || '',
    image:       imageUrl         || '',
    showName:    true,
    createdOn:   'https://america.fun',
  }
  if (form.website)  meta.website  = form.website
  if (form.twitter)  meta.twitter  = form.twitter
  if (form.telegram) meta.telegram = form.telegram
  if (form.discord)  meta.discord  = form.discord
  return meta
}
