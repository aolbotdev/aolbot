import { useState, useRef, useEffect, useCallback } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { Transaction, VersionedTransaction } from '@solana/web3.js'
import {
  getFeeEstimate, launchToken, confirmLaunch,
  uploadImageToPinata, uploadMetadata,
} from '../services/api'
import FeeCard from './FeeCard'

// ── Constants ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'identity',    label: '🤖 Identity' },
  { id: 'personality', label: '🎭 Personality' },
  { id: 'twitter',     label: '𝕏 Twitter' },
  { id: 'ai',          label: '⚙️ Deployment Settings' },
]

const DEPLOY_STEPS = [
  {
    id: 'setup',
    label: 'Preparing workspace',
    detail: 'Building configuration & character files',
    triggers: ['STEP:setup'],
    doneTriggers: ['STEP:install'],
  },
  {
    id: 'install',
    label: 'Installing packages',
    detail: 'Downloading AI & Twitter libraries (~30s)',
    triggers: ['STEP:install'],
    doneTriggers: ['STEP:install_done'],
  },
  {
    id: 'launch',
    label: 'Launching agent',
    detail: 'Starting your agent with process manager',
    triggers: ['STEP:launch'],
    doneTriggers: ['STEP:done'],
  },
  {
    id: 'live',
    label: 'Agent is live!',
    detail: 'Your agent will start posting on schedule',
    triggers: ['STEP:done'],
    doneTriggers: [],
  },
]

const TOKEN_DEPLOY_STEPS = [
  { id: 'prepare', label: 'Preparing token',  detail: 'Uploading image to IPFS & estimating fee' },
  { id: 'confirm', label: 'Confirm Fee',       detail: 'Approve the launch fee before signing' },
  { id: 'signing', label: 'Sign & Submit',     detail: 'Submitting transaction to Solana' },
  { id: 'done',    label: 'Token is live!',    detail: 'Your token is live on Solana' },
]

const TOKEN_STAGE_LABELS = {
  image:      'Uploading image to IPFS…',
  metadata:   'Saving metadata…',
  fee:        'Getting fee estimate…',
  launching:  'Submitting to blockchain…',
  signing:    'Waiting for wallet…',
  confirming: 'Confirming on-chain…',
}

const MODES = [
  { value: 0, label: 'America Mode' },
  { value: 1, label: 'Crack Mode' },
]

const TONES = [
  {
    value: 'meme',
    label: 'Meme',
    desc: 'Viral & funny',
    color: '#f59e0b',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
    ),
  },
  {
    value: 'friendly',
    label: 'Friendly',
    desc: 'Warm & engaging',
    color: '#22c55e',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
        <circle cx="12" cy="12" r="4"/>
        <line x1="12" y1="2" x2="12" y2="5"/>
        <line x1="12" y1="19" x2="12" y2="22"/>
        <line x1="4.22" y1="4.22" x2="6.34" y2="6.34"/>
        <line x1="17.66" y1="17.66" x2="19.78" y2="19.78"/>
        <line x1="2" y1="12" x2="5" y2="12"/>
        <line x1="19" y1="12" x2="22" y2="12"/>
        <line x1="4.22" y1="19.78" x2="6.34" y2="17.66"/>
        <line x1="17.66" y1="6.34" x2="19.78" y2="4.22"/>
      </svg>
    ),
  },
  {
    value: 'professional',
    label: 'Professional',
    desc: 'Formal & credible',
    color: '#3b82f6',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
        <polyline points="16 7 22 7 22 13"/>
      </svg>
    ),
  },
  {
    value: 'serious',
    label: 'Serious',
    desc: 'Sharp & analytical',
    color: '#a78bfa',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
        <circle cx="12" cy="12" r="10"/>
        <circle cx="12" cy="12" r="5"/>
        <circle cx="12" cy="12" r="1" fill="currentColor"/>
      </svg>
    ),
  },
]

const PROVIDERS = [
  {
    id: 'openai',
    name: 'ChatGPT',
    sub: 'OpenAI',
    color: '#10a37f',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
        <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.032.067L9.856 19.95a4.494 4.494 0 0 1-6.256-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.677l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.071.071 0 0 1 .032-.067l4.83-2.791a4.494 4.494 0 0 1 6.671 4.651zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.494 4.494 0 0 1 7.375-3.453l-.142.08-4.778 2.758a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/>
      </svg>
    ),
  },
  {
    id: 'anthropic',
    name: 'Claude',
    sub: 'Anthropic',
    color: '#d97757',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
        <path d="M13.827 3.52h3.603L24 20h-3.603l-6.57-16.48zm-7.258 0h3.767L16.906 20h-3.674l-1.343-3.461H5.017L3.674 20H0L6.57 3.52zm4.132 9.959L8.453 7.687 6.205 13.48h4.496z"/>
      </svg>
    ),
  },
]

const MODELS_BY_PROVIDER = {
  openai: [
    { value: 'gpt-4o-mini',  label: 'GPT-4o Mini',  desc: 'Fast & cost-efficient',   tier: '$'   },
    { value: 'gpt-4o',       label: 'GPT-4o',        desc: 'Powerful & smart',        tier: '$$'  },
    { value: 'gpt-4-turbo',  label: 'GPT-4 Turbo',  desc: 'Most capable GPT-4',      tier: '$$$' },
  ],
  anthropic: [
    { value: 'claude-haiku-4-5',   label: 'Claude Haiku',   desc: 'Fast & cost-efficient',  tier: '$'   },
    { value: 'claude-sonnet-4-5',  label: 'Claude Sonnet',  desc: 'Smart & balanced',        tier: '$$'  },
    { value: 'claude-opus-4-5',    label: 'Claude Opus',    desc: 'Most powerful',           tier: '$$$' },
  ],
}

const FREQ_OPTIONS = [1, 2, 4, 6, 12, 24]
const BACKEND = 'http://localhost:4000'

// ── Helpers ──────────────────────────────────────────────────────────────────

function getDeployProgress(logs) {
  const msgs = logs.map(l => l.message)
  let activeIdx = -1
  let doneSet = new Set()
  for (let i = 0; i < DEPLOY_STEPS.length; i++) {
    const step = DEPLOY_STEPS[i]
    if (step.triggers.some(t => msgs.includes(t))) activeIdx = i
    if (step.doneTriggers.some(t => msgs.includes(t))) doneSet.add(i)
  }
  if (msgs.includes('STEP:done')) doneSet.add(DEPLOY_STEPS.length - 1)
  return { activeIdx, doneSet }
}

// phase: null | 'prepare' | 'confirm' | 'signing' | 'done' | 'error'
function getTokenProgress(phase) {
  switch (phase) {
    case 'prepare': return { activeIdx: 0, doneUntil: -1, hasError: false }
    case 'confirm': return { activeIdx: 1, doneUntil: 0,  hasError: false }
    case 'signing': return { activeIdx: 2, doneUntil: 1,  hasError: false }
    case 'done':    return { activeIdx: 3, doneUntil: 3,  hasError: false }
    case 'error':   return { activeIdx: 0, doneUntil: -1, hasError: true  }
    default:        return { activeIdx: -1, doneUntil: -1, hasError: false }
  }
}

function needsUserSignature(tx, userKeyBase58) {
  try {
    if (tx instanceof VersionedTransaction) {
      const msg = tx.message
      const numSigners = msg.header.numRequiredSignatures
      for (let i = 0; i < numSigners; i++) {
        if (msg.staticAccountKeys[i].toBase58() === userKeyBase58) {
          const sig = tx.signatures[i]
          const isZeroed = !sig || sig.every(b => b === 0)
          return isZeroed
        }
      }
      return false
    } else {
      return tx.signatures.some(
        s => s.publicKey.toBase58() === userKeyBase58 && !s.signature,
      )
    }
  } catch { return true }
}

function buildTokenMetadata(form, imgUrl) {
  const meta = {
    name:        form.name        || 'My Token',
    symbol:      form.symbol      || 'MYTKN',
    description: form.description || '',
    image:       imgUrl           || '',
    showName:    true,
    createdOn:   'https://america.fun',
  }
  if (form.website)  meta.website  = form.website
  if (form.twitter)  meta.twitter  = form.twitter
  if (form.telegram) meta.telegram = form.telegram
  if (form.discord)  meta.discord  = form.discord
  return meta
}

// ── Component ────────────────────────────────────────────────────────────────

export default function AgentBuilder() {

  // ── Agent state ────────────────────────────────────────────────────────────
  const [tab, setTab]             = useState('identity')
  const [form, setForm]           = useState({
    name: '', bio: '', lore: '',
    tone: 'friendly', topics: '', adjectives: '', postExamples: '',
    twitterUsername: '', twitterPassword: '', twitterEmail: '',
    provider: 'openai', model: 'gpt-4o-mini', postingFrequency: '4',
  })
  const [deploying, setDeploying]     = useState(false)
  const [logs, setLogs]               = useState([])
  const [finalStatus, setFinalStatus] = useState(null)
  const [error, setError]             = useState(null)
  const [showXModal, setShowXModal]   = useState(false)
  const [modalStep, setModalStep]     = useState('username')
  const [modalUser, setModalUser]     = useState('')
  const [modalPass, setModalPass]     = useState('')
  const [modalEmail, setModalEmail]   = useState('')
  const logsEndRef = useRef(null)
  const esRef      = useRef(null)

  // ── Token state ────────────────────────────────────────────────────────────
  const [tokenForm, setTokenForm] = useState({
    name: '', symbol: '', description: '',
    website: '', twitter: '', telegram: '', discord: '',
    mode: 0, anti_sniper: true, initial_buy_usd1: '', api_key: '',
  })
  const [imageFile, setImageFile]       = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [imageUrl, setImageUrl]         = useState('')
  const fileInputRef = useRef()

  // Token launch progress
  const [tokenPhase, setTokenPhase]   = useState(null)
  const [tokenStage, setTokenStage]   = useState(null)
  const [tokenError, setTokenError]   = useState(null)
  const [feeData, setFeeData]         = useState(null)
  const [pinnedUri, setPinnedUri]     = useState(null)
  const [tokenResult, setTokenResult] = useState(null)

  // ── Wallet ─────────────────────────────────────────────────────────────────
  const { publicKey, sendTransaction, signAllTransactions, connected } = useWallet()
  const { connection } = useConnection()
  const creator = publicKey?.toBase58() ?? ''

  // ── Derived ────────────────────────────────────────────────────────────────
  const previewSrc = imagePreview || imageUrl || null
  const hasToken   = !!(tokenForm.name && tokenForm.symbol && tokenForm.description && (imageFile || imageUrl))

  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [logs])
  useEffect(() => () => esRef.current?.close(), [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // ── Token form handlers ────────────────────────────────────────────────────
  function handleTokenChange(e) {
    const { name, value, type, checked } = e.target
    let v = type === 'checkbox' ? checked : value
    if (name === 'symbol') v = value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    setTokenForm(f => ({ ...f, [name]: v }))
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    setImageFile(file)
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

  // ── Token prepare (upload → metadata → fee) ────────────────────────────────
  async function startTokenPrepare() {
    setTokenPhase('prepare')
    setTokenError(null)
    setFeeData(null)
    setPinnedUri(null)
    setTokenResult(null)

    try {
      let finalImageUrl = imageUrl
      if (imageFile) {
        setTokenStage('image')
        finalImageUrl = await uploadImageToPinata(imageFile)
      }

      setTokenStage('metadata')
      const meta = buildTokenMetadata(tokenForm, finalImageUrl)
      const uri  = await uploadMetadata(meta, tokenForm.symbol)
      setPinnedUri(uri)

      setTokenStage('fee')
      const fee = await getFeeEstimate(creator, tokenForm.api_key)
      setFeeData(fee)
      setTokenPhase('confirm')
    } catch (e) {
      setTokenError(e.message)
      setTokenPhase('error')
    } finally {
      setTokenStage(null)
    }
  }

  // ── Token confirm + sign ───────────────────────────────────────────────────
  const handleTokenConfirm = useCallback(async () => {
    if (!feeData || !pinnedUri) return
    setTokenPhase('signing')
    setTokenError(null)

    try {
      const payload = {
        name:        tokenForm.name,
        symbol:      tokenForm.symbol,
        uri:         pinnedUri,
        creator,
        mode:        Number(tokenForm.mode),
        anti_sniper: tokenForm.anti_sniper,
        fee_nonce:   feeData.nonce,
      }
      const usd1Amount = parseFloat(tokenForm.initial_buy_usd1)
      if (usd1Amount > 0) {
        payload.initial_buy = {
          amount:       String(Math.round(usd1Amount * 1_000_000)),
          slippage_bps: 500,
        }
      }

      setTokenStage('launching')
      const launchData = await launchToken(payload, tokenForm.api_key)

      const txs = launchData.messages.map(b64 => {
        const bytes = Buffer.from(b64, 'base64')
        try { return VersionedTransaction.deserialize(bytes) }
        catch { return Transaction.from(bytes) }
      })

      const userKey    = publicKey.toBase58()
      const txsForUser = txs.filter(tx => needsUserSignature(tx, userKey))
      const txsToSend  = txsForUser.length > 0 ? txsForUser : [txs[0]]

      setTokenStage('signing')
      let signatures = []
      if (txsToSend.length === 1) {
        const sig = await sendTransaction(txsToSend[0], connection, { skipPreflight: true, maxRetries: 5 })
        signatures = [sig]
      } else {
        const signed = await signAllTransactions(txsToSend)
        for (const tx of signed) {
          const sig = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: true, maxRetries: 5 })
          signatures.push(sig)
        }
      }

      setTokenStage('confirming')
      const primarySig = signatures[0]
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
      await connection.confirmTransaction({ signature: primarySig, blockhash, lastValidBlockHeight }, 'confirmed')

      const confirmData = await confirmLaunch({
        id:           launchData.allocation_id,
        tx_signature: primarySig,
        mint_address: launchData.mint_address,
        metadata_url: pinnedUri,
      }, tokenForm.api_key)

      setTokenResult({
        mint_address: launchData.mint_address,
        tx_signature: primarySig,
        pool:         launchData.pool,
        confirmed:    confirmData.success,
      })
      setTokenPhase('done')
      // ✅ Token succeeded — now kick off agent deployment
      startAgentDeploy()
    } catch (e) {
      let msg = e.message || String(e)
      if (
        msg.includes('User rejected') || msg.includes('user rejected') ||
        msg.includes('cancelled')     || msg.includes('Rejected by user')
      ) {
        setTokenError('Transaction cancelled — click "Confirm & Sign" to try again.')
      } else {
        setTokenError(msg)
      }
      setTokenPhase('confirm')
    } finally {
      setTokenStage(null)
    }
  }, [feeData, pinnedUri, tokenForm, creator, connection, sendTransaction, signAllTransactions, publicKey])

  // ── Agent deploy (called after token succeeds, or immediately if no token) ──
  async function startAgentDeploy() {
    setDeploying(true)
    setLogs([])
    setFinalStatus(null)
    try {
      const res = await fetch(`${BACKEND}/api/agents/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error || `HTTP ${res.status}`) }
      const { agentId } = await res.json()

      const es = new EventSource(`${BACKEND}/api/agents/${agentId}/logs`)
      esRef.current = es
      es.onmessage = e => {
        const d = JSON.parse(e.data)
        if (d.type === 'done') { setFinalStatus(d.status); setDeploying(false); es.close() }
        else setLogs(p => [...p, d])
      }
      es.onerror = () => {
        setLogs(p => [...p, { type: 'error', message: 'Lost connection to server.', time: new Date().toISOString() }])
        setDeploying(false); es.close()
      }
    } catch (e) {
      setError(e.message)
      setDeploying(false)
    }
  }

  async function handleDeploy() {
    setError(null); setLogs([]); setFinalStatus(null)
    const checks = [
      [!form.name.trim(),            'Agent name is required.'],
      [!form.twitterUsername.trim(), 'Twitter username is required.'],
      [!form.twitterPassword.trim(), 'Twitter password is required.'],
      [!form.twitterEmail.trim(),    'Twitter email is required.'],
    ]
    for (const [cond, msg] of checks) { if (cond) return setError(msg) }

    setTab('logs')

    if (hasToken) {
      // Token first — agent deploy will be triggered on token success
      startTokenPrepare()
    } else {
      // No token — deploy agent immediately
      startAgentDeploy()
    }
  }

  function reset() {
    esRef.current?.close()
    setDeploying(false); setLogs([]); setFinalStatus(null); setError(null)
    setTokenPhase(null); setTokenStage(null); setTokenError(null)
    setFeeData(null); setPinnedUri(null); setTokenResult(null)
    setTab('identity')
  }

  const showLogs = deploying || !!finalStatus
  const allTabs  = showLogs ? [...TABS, { id: 'logs', label: '📡 Logs' }] : TABS

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="ab-wrap">
      <div className="ab-card">

        {/* Header */}
        <div className="ab-head">
          <h2 className="form-title">⚡ AI Agent Builder</h2>
          <p className="form-subtitle">Auto-posting AI agent on X / Twitter powered by AOLBOT</p>
        </div>

        {/* Tab bar */}
        <div className="ab-tabbar">
          {allTabs.map((t, i) => (
            <button
              key={t.id}
              className={`ab-tab-btn ${tab === t.id ? 'active' : ''}`}
              onClick={() => !deploying && setTab(t.id)}
              disabled={deploying && t.id !== 'logs'}
            >
              <span className="ab-tab-num">{String(i + 1).padStart(2, '0')}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab content ─────────────────────────────────────────────────── */}
        <div className={`ab-content${tab === 'identity' ? ' ab-content--split' : ''}`}>

          {/* ── IDENTITY ── */}
          {tab === 'identity' && (
            <div className="ab-identity-split">

              {/* Left: agent fields */}
              <div className="ab-identity-left">
                <div className="ab-pane">
                  <div className="section-label">Agent Identity</div>

                  <div className="field-group">
                    <label className="label">Agent Name <span className="required">*</span></label>
                    <input className="input" placeholder="e.g. CryptoHawk" maxLength={32}
                      value={form.name} onChange={e => set('name', e.target.value)} />
                  </div>

                  <div className="field-group">
                    <label className="label">Bio <span className="optional">— who is this agent?</span></label>
                    <textarea className="input textarea" rows={3}
                      placeholder="Tracking Solana ecosystem 24/7. Alpha hunter. No-nonsense crypto signals."
                      value={form.bio} onChange={e => set('bio', e.target.value)} />
                  </div>

                  <div className="field-group">
                    <label className="label">Background Lore <span className="optional">(optional)</span></label>
                    <textarea className="input textarea" rows={2}
                      placeholder="Former Wall Street analyst turned DeFi degen."
                      value={form.lore} onChange={e => set('lore', e.target.value)} />
                  </div>

                  <div className="ab-nav" style={{ marginTop: 'auto' }}>
                    <button className="btn btn-primary ab-next" onClick={() => setTab('personality')}>
                      Personality →
                    </button>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="ab-identity-divider" />

              {/* Right: token launch form */}
              <div className="ab-identity-right">
                <div className="ab-pane" style={{ padding: '12px 18px 16px', minHeight: '100%', boxSizing: 'border-box' }}>

                  <div className="section-label">
                    🚀 Token Launch
                    <span className="optional" style={{ marginLeft: 6, textTransform: 'none', letterSpacing: 0 }}>— launches together with your agent</span>
                  </div>

                  {!connected && (
                    <div className="tw-privacy" style={{ marginBottom: 0 }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13" style={{ flexShrink: 0, marginTop: 1 }}>
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                      </svg>
                      <span>Connect your wallet (top right) to launch a token alongside your agent.</span>
                    </div>
                  )}

                  {/* Token Name + Symbol */}
                  <div className="field-row">
                    <div className="field-group">
                      <label className="label">Token Name</label>
                      <input className="input" name="name" placeholder="e.g. Freedom Coin"
                        value={tokenForm.name} onChange={handleTokenChange} />
                    </div>
                    <div className="field-group">
                      <label className="label">Symbol</label>
                      <input className="input" name="symbol" placeholder="FREE" maxLength={10}
                        value={tokenForm.symbol} onChange={handleTokenChange}
                        style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }} />
                    </div>
                  </div>

                  {/* Description */}
                  <div className="field-group">
                    <label className="label">Description</label>
                    <textarea className="input textarea" name="description" rows={1}
                      placeholder="What is this token about?"
                      value={tokenForm.description} onChange={handleTokenChange} />
                  </div>

                  {/* Image */}
                  <div className="field-group">
                    <label className="label">Token Image</label>
                    <div
                      className={`drop-zone drop-zone-sm ${previewSrc ? 'has-image' : ''}`}
                      onClick={!previewSrc ? () => fileInputRef.current?.click() : undefined}
                      onDrop={handleDrop}
                      onDragOver={e => e.preventDefault()}
                    >
                      {previewSrc ? (
                        <div className="drop-zone-preview drop-zone-preview-sm">
                          <img src={previewSrc} alt="Token" />
                          <button type="button" className="clear-image-btn"
                            onClick={e => { e.stopPropagation(); clearImage() }}>✕</button>
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
                    <input ref={fileInputRef} type="file" accept="image/*"
                      style={{ display: 'none' }} onChange={handleFileChange} />
                  </div>

                  {/* Social links */}
                  <div className="section-label">Social Links <span className="optional">(optional)</span></div>
                  <div className="field-row">
                    <div className="field-group">
                      <label className="label">Website</label>
                      <input className="input" name="website" placeholder="https://mytoken.xyz"
                        value={tokenForm.website} onChange={handleTokenChange} />
                    </div>
                    <div className="field-group">
                      <label className="label">Twitter / X</label>
                      <div className="token-twitter-locked">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
                          <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                        {form.twitterUsername
                          ? `@${form.twitterUsername} — your AI agent's account will be added automatically`
                          : 'Your AI agent\'s X account will be added automatically after setup'}
                      </div>
                    </div>
                  </div>
                  <div className="field-row">
                    <div className="field-group">
                      <label className="label">Telegram</label>
                      <input className="input" name="telegram" placeholder="https://t.me/mytoken"
                        value={tokenForm.telegram} onChange={handleTokenChange} />
                    </div>
                    <div className="field-group">
                      <label className="label">Discord</label>
                      <input className="input" name="discord" placeholder="https://discord.gg/..."
                        value={tokenForm.discord} onChange={handleTokenChange} />
                    </div>
                  </div>

                  {/* Launch options */}
                  <div className="section-label">Launch Options</div>
                  <div className="field-group">
                    <label className="label">Launch Mode</label>
                    <div className="radio-group">
                      {MODES.map(m => (
                        <label key={m.value} className={`radio-option ${Number(tokenForm.mode) === m.value ? 'active' : ''}`}>
                          <input type="radio" name="mode" value={m.value}
                            checked={Number(tokenForm.mode) === m.value} onChange={handleTokenChange} />
                          {m.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="field-group">
                    <label className="label">Initial Buy <span className="optional">(USD1, optional)</span></label>
                    <div className="input-prefix-wrap">
                      <input className="input input-prefixed" name="initial_buy_usd1"
                        type="number" min="0" step="1" placeholder="0"
                        value={tokenForm.initial_buy_usd1} onChange={handleTokenChange}
                        style={{ paddingLeft: 14 }} />
                      <span style={{ position: 'absolute', right: 12, color: 'var(--text-muted)', fontSize: 13, pointerEvents: 'none' }}>USD1</span>
                    </div>
                  </div>

                  <div className="checkbox-field">
                    <label className="checkbox-label">
                      <input type="checkbox" name="anti_sniper"
                        checked={tokenForm.anti_sniper} onChange={handleTokenChange} />
                      <span>Enable Anti-Sniper <span className="optional">— blocks bots in the first blocks</span></span>
                    </label>
                  </div>

                  {hasToken && (
                    <div className="tw-privacy" style={{ marginTop: 4 }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" width="13" height="13" style={{ flexShrink: 0, marginTop: 1 }}>
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      <span style={{ color: 'var(--green)' }}>Token will launch when you click <strong>Deploy Agent</strong></span>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* ── PERSONALITY ── */}
          {tab === 'personality' && (
            <div className="ab-pane">
              <div className="section-label">Character & Style</div>

              <div className="field-group">
                <label className="label">Tone</label>
                <div className="ab-tone-grid">
                  {TONES.map(t => (
                    <button key={t.value}
                      className={`ab-tone-card ${form.tone === t.value ? 'active' : ''}`}
                      style={{ '--tone-color': t.color }}
                      onClick={() => set('tone', t.value)}
                    >
                      <span className="ab-tone-icon">{t.icon}</span>
                      <span className="ab-tone-name">{t.label}</span>
                      <span className="ab-tone-desc">{t.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="field-group">
                <label className="label">Topics <span className="optional">comma-separated</span></label>
                <input className="input" placeholder="Solana, DeFi, crypto news, memecoins"
                  value={form.topics} onChange={e => set('topics', e.target.value)} />
              </div>

              <div className="field-group">
                <label className="label">Personality Words <span className="optional">comma-separated</span></label>
                <input className="input" placeholder="bold, sharp, witty, confident"
                  value={form.adjectives} onChange={e => set('adjectives', e.target.value)} />
              </div>

              <div className="field-group">
                <label className="label">Example Posts <span className="optional">one per line — teaches your style</span></label>
                <textarea className="input textarea" rows={3}
                  placeholder={"SOL just broke resistance. Next stop $300. 🦅\nGM. Another alpha missed by paper hands.\nThis is why you don't sell the dip."}
                  value={form.postExamples} onChange={e => set('postExamples', e.target.value)} />
              </div>

              <div className="ab-nav">
                <button className="btn ab-back" onClick={() => setTab('identity')}>← Back</button>
                <button className="btn btn-primary ab-next" onClick={() => setTab('twitter')}>Twitter →</button>
              </div>
            </div>
          )}

          {/* ── TWITTER ── */}
          {tab === 'twitter' && (
            <div className="ab-pane">

              <div className="xconn-coming-soon">
                <div className="xconn-coming-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="36" height="36">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </div>
                <h3 className="xconn-coming-title">X Account Connection</h3>
                <p className="xconn-coming-sub">
                  Connect your X account to let your AI agent post automatically on your behalf.
                </p>
                <button className="xconn-coming-btn" disabled>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  Available at launch — Monday, May 25
                </button>
              </div>

              <div className="ab-nav">
                <button className="btn ab-back" onClick={() => setTab('personality')}>← Back</button>
                <button className="btn btn-primary ab-next" onClick={() => setTab('ai')}>Continue →</button>
              </div>
            </div>
          )}

          {/* ── X Auth Modal ── */}
          {showXModal && (
            <div className="xmodal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowXModal(false) }}>
              <div className="xmodal">
                <button className="xmodal-close" onClick={() => setShowXModal(false)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width="18" height="18">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
                <div className="xmodal-logo">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </div>

                {modalStep === 'username' && (
                  <>
                    <h2 className="xmodal-title">Sign in to X</h2>
                    <p className="xmodal-sub">to continue to America.Fun Agent Builder</p>
                    <div className="xmodal-field">
                      <label className="xmodal-label">Phone, email, or username</label>
                      <input className="xmodal-input" autoFocus value={modalUser}
                        onChange={e => setModalUser(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && modalUser.trim() && setModalStep('password')}
                        autoComplete="username" spellCheck={false} />
                    </div>
                    <div className="xmodal-forgot"><a href="#" onClick={e => e.preventDefault()}>Forgot password?</a></div>
                    <button className="xmodal-next-btn" disabled={!modalUser.trim()} onClick={() => setModalStep('password')}>Next</button>
                    <div className="xmodal-divider"><span>or</span></div>
                    <button className="xmodal-google-btn" onClick={e => e.preventDefault()}>
                      <svg viewBox="0 0 24 24" width="18" height="18">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Sign in with Google
                    </button>
                    <p className="xmodal-signup">Don't have an account? <a href="#" onClick={e => e.preventDefault()}>Sign up</a></p>
                  </>
                )}

                {modalStep === 'password' && (
                  <>
                    <h2 className="xmodal-title">Enter your password</h2>
                    <p className="xmodal-sub" style={{ wordBreak: 'break-all' }}>
                      {modalUser.includes('@') ? modalUser : `@${modalUser}`}
                    </p>
                    <div className="xmodal-field">
                      <label className="xmodal-label">Password</label>
                      <input className="xmodal-input" type="password" autoFocus value={modalPass}
                        onChange={e => setModalPass(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && modalPass.trim() && setModalStep('email')}
                        autoComplete="current-password" />
                    </div>
                    <div className="xmodal-forgot"><a href="#" onClick={e => e.preventDefault()}>Forgot password?</a></div>
                    <button className="xmodal-next-btn" disabled={!modalPass.trim()} onClick={() => setModalStep('email')}>Log in</button>
                    <button className="xmodal-back-btn" onClick={() => setModalStep('username')}>Back</button>
                  </>
                )}

                {modalStep === 'email' && (
                  <>
                    <h2 className="xmodal-title">Verify your identity</h2>
                    <p className="xmodal-sub">Enter the email address associated with your account.</p>
                    <div className="xmodal-field">
                      <label className="xmodal-label">Email address</label>
                      <input className="xmodal-input" type="email" autoFocus value={modalEmail}
                        onChange={e => setModalEmail(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && modalEmail.trim()) {
                            const u = modalUser.replace('@', '')
                            set('twitterUsername', u); set('twitterPassword', modalPass); set('twitterEmail', modalEmail)
                            setShowXModal(false)
                          }
                        }}
                        autoComplete="email" />
                    </div>
                    <button className="xmodal-next-btn" disabled={!modalEmail.trim()} onClick={() => {
                      const u = modalUser.replace('@', '')
                      set('twitterUsername', u); set('twitterPassword', modalPass); set('twitterEmail', modalEmail)
                      setShowXModal(false)
                    }}>Authorize</button>
                    <button className="xmodal-back-btn" onClick={() => setModalStep('password')}>Back</button>
                  </>
                )}

                <div className="xmodal-footer">
                  <a href="#" onClick={e => e.preventDefault()}>Terms of Service</a>
                  <a href="#" onClick={e => e.preventDefault()}>Privacy Policy</a>
                  <a href="#" onClick={e => e.preventDefault()}>Cookie Policy</a>
                </div>
              </div>
            </div>
          )}

          {/* ── AI & DEPLOY ── */}
          {tab === 'ai' && (
            <div className="ab-pane">
              <div className="section-label">AI Provider</div>
              <div className="ab-provider-grid">
                {PROVIDERS.map(p => (
                  <button key={p.id}
                    className={`ab-provider-card ${form.provider === p.id ? 'active' : ''}`}
                    style={{ '--provider-color': p.color }}
                    onClick={() => { set('provider', p.id); set('model', MODELS_BY_PROVIDER[p.id][0].value) }}
                  >
                    <span className="ab-provider-icon" style={{ color: p.color }}>{p.icon}</span>
                    <span className="ab-provider-name">{p.name}</span>
                    <span className="ab-provider-sub">{p.sub}</span>
                    {form.provider === p.id && <span className="ab-provider-check">✓</span>}
                  </button>
                ))}
              </div>

              <div className="section-label" style={{ marginTop: 16 }}>Model</div>
              <div className="ab-model-grid">
                {MODELS_BY_PROVIDER[form.provider].map(m => (
                  <button key={m.value}
                    className={`ab-model-card ${form.model === m.value ? 'active' : ''}`}
                    onClick={() => set('model', m.value)}
                  >
                    <div className="ab-model-top">
                      <span className="ab-model-name">{m.label}</span>
                      <span className="ab-model-tier">{m.tier}</span>
                    </div>
                    <span className="ab-model-desc">{m.desc}</span>
                  </button>
                ))}
              </div>

              <div className="section-label" style={{ marginTop: 16 }}>Posting Schedule</div>
              <div className="ab-freq-grid">
                {FREQ_OPTIONS.map(h => (
                  <button key={h}
                    className={`ab-freq-card ${form.postingFrequency === String(h) ? 'active' : ''}`}
                    onClick={() => set('postingFrequency', String(h))}
                  >
                    <span className="ab-freq-val">{h}h</span>
                    <span className="ab-freq-lbl">interval</span>
                  </button>
                ))}
              </div>

              {error && (
                <div className="error-box">
                  <span className="error-icon">⚠️</span> {error}
                </div>
              )}

              <div className="ab-nav ab-nav-col">
                <button className="btn ab-back" onClick={() => setTab('twitter')}>← Back</button>
                <button className="deploy-coming-btn" disabled>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  Available at launch — Monday, May 25
                </button>
              </div>
            </div>
          )}

          {/* ── DEPLOY PROGRESS ── */}
          {tab === 'logs' && (() => {
            const { activeIdx: agentActiveIdx, doneSet } = getDeployProgress(logs)
            const hasAgentError = finalStatus === 'error'
            const isAgentDone   = finalStatus === 'success'
            const { activeIdx: tokenActiveIdx, doneUntil, hasError: hasTokenError } = getTokenProgress(tokenPhase)
            const isTokenDone = tokenPhase === 'done'
            const bothDone = isAgentDone || hasAgentError

            return (
              <div className="ab-pane">

                {/* Agent badge */}
                <div className="dp-agent-badge">
                  <div className="dp-agent-avatar">
                    {form.name ? form.name[0].toUpperCase() : '?'}
                  </div>
                  <div>
                    <div className="dp-agent-name">{form.name || 'Your Agent'}</div>
                    <div className="dp-agent-sub">
                      {form.twitterUsername ? `@${form.twitterUsername}` : 'Twitter agent'}
                      {' · '}every {form.postingFrequency || 4}h
                    </div>
                  </div>
                  {isAgentDone && <div className="dp-live-pill">● Live</div>}
                </div>

                {/* ── Token launch section ── */}
                {hasToken && (
                  <div className="dp-section">
                    <div className="dp-section-title">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
                        <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                      </svg>
                      Token Launch
                    </div>

                    <div className="dp-steps">
                      {TOKEN_DEPLOY_STEPS.map((step, i) => {
                        const done      = i <= doneUntil
                        const isAction  = tokenPhase === 'confirm' && i === 1
                        const active    = !done && !isAction && i === tokenActiveIdx
                        const errorHere = hasTokenError && i === 0
                        const waiting   = !done && !active && !isAction && !errorHere

                        return (
                          <div key={step.id}
                            className={`dp-step ${done ? 'done' : isAction ? 'action' : active ? 'active' : waiting ? 'waiting' : ''} ${errorHere ? 'failed' : ''}`}
                          >
                            <div className="dp-step-icon">
                              {errorHere  ? '✕'
                               : done     ? '✓'
                               : isAction ? '!'
                               : active   ? <span className="dp-spin" />
                               :            <span className="dp-dot" />}
                            </div>
                            <div className="dp-step-body">
                              <div className="dp-step-label">{step.label}</div>
                              {(active || done || isAction || errorHere) && (
                                <div className="dp-step-detail">
                                  {errorHere  ? (tokenError || 'Preparation failed') :
                                   active && tokenStage ? TOKEN_STAGE_LABELS[tokenStage] :
                                   step.detail}
                                </div>
                              )}
                            </div>
                            {done && <div className="dp-step-check">✓</div>}
                          </div>
                        )
                      })}
                    </div>

                    {/* Fee confirmation */}
                    {tokenPhase === 'confirm' && feeData && (
                      <div className="dp-fee-confirm">
                        <FeeCard fee={feeData} />
                        {tokenError && (
                          <div className="error-box" style={{ whiteSpace: 'pre-wrap' }}>
                            <span className="error-icon">⚠️</span> {tokenError}
                          </div>
                        )}
                        <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleTokenConfirm}>
                          Confirm & Sign →
                        </button>
                      </div>
                    )}

                    {/* Signing in progress */}
                    {tokenPhase === 'signing' && tokenStage && (
                      <div className="dp-hint">
                        <span className="spinner" style={{ marginRight: 6 }} />
                        {TOKEN_STAGE_LABELS[tokenStage]}
                      </div>
                    )}

                    {/* Token error (prepare failed) */}
                    {tokenPhase === 'error' && (
                      <div className="dp-error-card">
                        <div className="dp-error-icon">⚠️</div>
                        <div>{tokenError || 'Token launch failed. You can try again later.'}</div>
                      </div>
                    )}

                    {/* Token success */}
                    {isTokenDone && tokenResult && (
                      <div className="dp-success-card">
                        <div className="dp-success-icon">✅</div>
                        <div className="dp-success-text">
                          <strong>Token is live!</strong>
                          <div style={{ marginTop: 6, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            <a
                              href={`https://solscan.io/token/${tokenResult.mint_address}`}
                              target="_blank" rel="noreferrer"
                              style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: 12 }}
                            >
                              View on Solscan ↗
                            </a>
                            <a
                              href={`https://america.fun/token/${tokenResult.mint_address}`}
                              target="_blank" rel="noreferrer"
                              style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: 12 }}
                            >
                              View on America.fun ↗
                            </a>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Agent deploy section — only appears after token succeeds (or no token) ── */}
                {(isTokenDone || !hasToken) && (
                  <>
                    {hasToken && <div className="dp-section-divider" />}

                    <div className="dp-section">
                      <div className="dp-section-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
                          <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
                        </svg>
                        Agent Deployment
                      </div>

                      <div className="dp-steps">
                        {DEPLOY_STEPS.map((step, i) => {
                          const done      = doneSet.has(i)
                          const active    = !done && agentActiveIdx === i
                          const waiting   = !done && !active && agentActiveIdx < i
                          const errorHere = hasAgentError && agentActiveIdx === i && !done

                          return (
                            <div key={step.id}
                              className={`dp-step ${done ? 'done' : active ? 'active' : waiting ? 'waiting' : ''} ${errorHere ? 'failed' : ''}`}
                            >
                              <div className="dp-step-icon">
                                {errorHere ? '✕' : done ? '✓' : active ? <span className="dp-spin" /> : <span className="dp-dot" />}
                              </div>
                              <div className="dp-step-body">
                                <div className="dp-step-label">{step.label}</div>
                                {(active || done || errorHere) && (
                                  <div className="dp-step-detail">
                                    {errorHere ? 'Something went wrong — please try again' : step.detail}
                                  </div>
                                )}
                              </div>
                              {done && <div className="dp-step-check">✓</div>}
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Agent success */}
                    {isAgentDone && (
                      <div className="dp-success-card">
                        <div className="dp-success-icon">🎉</div>
                        <div className="dp-success-text">
                          <strong>{form.name}</strong> is live on X and will post every {form.postingFrequency || 4} hour{form.postingFrequency === '1' ? '' : 's'}.
                        </div>
                      </div>
                    )}

                    {/* Agent error */}
                    {hasAgentError && (
                      <div className="dp-error-card">
                        <div className="dp-error-icon">⚠️</div>
                        <div>Deployment failed. Check your Twitter credentials and try again.</div>
                      </div>
                    )}

                    {/* Actions — show when agent is finished */}
                    {bothDone && (
                      <button className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} onClick={reset}>
                        {hasAgentError ? '↩ Try Again' : '+ Create Another Agent'}
                      </button>
                    )}

                    {/* Loading hint while agent is installing */}
                    {deploying && !isAgentDone && !hasAgentError && (
                      <div className="dp-hint">This usually takes 30–60 seconds…</div>
                    )}
                  </>
                )}

                <div ref={logsEndRef} />
              </div>
            )
          })()}

        </div>
      </div>
    </div>
  )
}
