import { useState, useRef } from 'react'

const IPFS_GATEWAY = 'https://gateway.pinata.cloud/ipfs/'

export default function MetadataBuilder({ tokenName, tokenSymbol, onUriReady }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    description: '',
    image: '',       // URL (typed or from upload)
    website: '',
    twitter: '',
    telegram: '',
    discord: '',
  })
  // Local file chosen from disk
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null) // object URL
  const fileInputRef = useRef()

  const [pinataJwt, setPinataJwt] = useState('')
  const [uploadStage, setUploadStage] = useState(null) // null | 'image' | 'json' | 'done'
  const [uploadError, setUploadError] = useState(null)
  const [uploadedUrl, setUploadedUrl] = useState(null)
  const [showJson, setShowJson] = useState(false)
  const [copied, setCopied] = useState(false)

  function handleChange(e) {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
    // If user typed an image URL, clear any local file
    if (name === 'image') {
      setImageFile(null)
      if (imagePreview) URL.revokeObjectURL(imagePreview)
      setImagePreview(null)
    }
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file (PNG, JPG, GIF, WebP…)')
      return
    }
    setImageFile(file)
    setUploadError(null)
    // Show instant local preview
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    const objUrl = URL.createObjectURL(file)
    setImagePreview(objUrl)
    // Clear the typed URL since file takes priority
    setForm(f => ({ ...f, image: '' }))
  }

  function handleDropZoneClick() {
    fileInputRef.current?.click()
  }

  function handleDrop(e) {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) {
      const fakeEvent = { target: { files: [file] } }
      handleFileChange(fakeEvent)
    }
  }

  function handleDragOver(e) { e.preventDefault() }

  function clearImage() {
    setImageFile(null)
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImagePreview(null)
    setForm(f => ({ ...f, image: '' }))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // The effective image for metadata: uploaded IPFS URL wins, then typed URL
  const effectiveImage = form.image  // after upload this gets set to ipfs URL
  const previewSrc = imagePreview || (form.image || null)

  const metadata = buildMetadata(tokenName, tokenSymbol, { ...form })
  const jsonStr = JSON.stringify(metadata, null, 2)

  async function handleCopy() {
    await navigator.clipboard.writeText(jsonStr)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleDownload() {
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'metadata.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function pinFileToIPFS(file, jwt, name) {
    const fd = new FormData()
    fd.append('file', file, name)
    fd.append('pinataMetadata', JSON.stringify({ name }))
    const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: { Authorization: `Bearer ${jwt}` },
      body: fd,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error?.reason || `HTTP ${res.status}`)
    }
    const data = await res.json()
    return `${IPFS_GATEWAY}${data.IpfsHash}`
  }

  async function pinJsonToIPFS(content, jwt, name) {
    const res = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
      body: JSON.stringify({ pinataContent: content, pinataMetadata: { name } }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error?.reason || `HTTP ${res.status}`)
    }
    const data = await res.json()
    return `${IPFS_GATEWAY}${data.IpfsHash}`
  }

  async function handlePinata() {
    if (!pinataJwt) return setUploadError('Enter your Pinata JWT first.')
    const hasImage = imageFile || form.image
    if (!form.description || !hasImage) {
      return setUploadError('Fill in Description and add a Token Image first.')
    }

    setUploadError(null)
    setUploadedUrl(null)

    try {
      let imageUrl = form.image

      // Step 1: upload image file if chosen from disk
      if (imageFile) {
        setUploadStage('image')
        const ext = imageFile.name.split('.').pop()
        imageUrl = await pinFileToIPFS(
          imageFile,
          pinataJwt,
          `${tokenSymbol || 'token'}-image.${ext}`,
        )
        // Update form so JSON preview reflects real IPFS image URL
        setForm(f => ({ ...f, image: imageUrl }))
      }

      // Step 2: build & upload JSON
      setUploadStage('json')
      const metaFinal = buildMetadata(tokenName, tokenSymbol, { ...form, image: imageUrl })
      const metaUrl = await pinJsonToIPFS(
        metaFinal,
        pinataJwt,
        `${tokenSymbol || 'token'}-metadata.json`,
      )

      setUploadedUrl(metaUrl)
      setUploadStage('done')
      onUriReady(metaUrl)
    } catch (e) {
      setUploadError(e.message)
      setUploadStage(null)
    }
  }

  const isUploading = uploadStage && uploadStage !== 'done'
  const uploadLabel = uploadStage === 'image'
    ? 'Uploading image…'
    : uploadStage === 'json'
    ? 'Uploading metadata…'
    : 'Pin to IPFS'

  return (
    <div className="metadata-builder">
      <button
        type="button"
        className="metadata-toggle"
        onClick={() => setOpen(o => !o)}
      >
        <span>Build Metadata JSON</span>
        <span className="toggle-hint">
          {open ? '▲ collapse' : '▼ expand — fill description, image & socials'}
        </span>
      </button>

      {open && (
        <div className="metadata-body">
          {/* Description */}
          <div className="field-group">
            <label className="label">Description <span className="required">*</span></label>
            <textarea
              className="input textarea"
              name="description"
              placeholder="What is this token about?"
              value={form.description}
              onChange={handleChange}
              rows={3}
            />
          </div>

          {/* Image upload */}
          <div className="field-group">
            <label className="label">Token Image <span className="required">*</span></label>

            {/* Drop zone */}
            <div
              className={`drop-zone ${previewSrc ? 'has-image' : ''}`}
              onClick={!previewSrc ? handleDropZoneClick : undefined}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              {previewSrc ? (
                <div className="drop-zone-preview">
                  <img src={previewSrc} alt="Token" />
                  <button
                    type="button"
                    className="clear-image-btn"
                    onClick={e => { e.stopPropagation(); clearImage() }}
                    title="Remove image"
                  >✕</button>
                  {imageFile && (
                    <span className="file-badge">{imageFile.name}</span>
                  )}
                </div>
              ) : (
                <div className="drop-zone-empty">
                  <div className="drop-icon">🖼</div>
                  <div className="drop-text">
                    <strong>Click to select</strong> or drag & drop
                  </div>
                  <div className="drop-hint">PNG, JPG, GIF, WebP — up to 10 MB</div>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />

            {/* OR: paste URL */}
            {!imageFile && (
              <div className="image-url-row">
                <span className="or-label">or paste URL</span>
                <input
                  className="input"
                  name="image"
                  placeholder="https://i.imgur.com/..."
                  value={form.image}
                  onChange={handleChange}
                />
              </div>
            )}
          </div>

          {/* Socials */}
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

          {/* JSON preview */}
          <div className="json-section">
            <div className="json-header">
              <button type="button" className="btn-text" onClick={() => setShowJson(v => !v)}>
                {showJson ? '▲ Hide JSON' : '▼ Preview JSON'}
              </button>
              <div className="json-actions">
                <button type="button" className="btn btn-secondary btn-sm" onClick={handleCopy}>
                  {copied ? '✓ Copied' : 'Copy JSON'}
                </button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={handleDownload}>
                  Download
                </button>
              </div>
            </div>
            {showJson && <pre className="json-preview">{jsonStr}</pre>}
          </div>

          {/* Upload section */}
          <div className="upload-section">
            <div className="upload-title">Upload to IPFS via Pinata</div>
            <p className="hint">
              Free at <a href="https://app.pinata.cloud" target="_blank" rel="noreferrer">pinata.cloud</a> → API Keys → generate JWT.
              {imageFile && ' Your image will be uploaded first, then the metadata JSON.'}
            </p>

            <div className="pinata-row">
              <input
                className="input"
                type="password"
                placeholder="Pinata JWT (eyJ...)"
                value={pinataJwt}
                onChange={e => setPinataJwt(e.target.value)}
              />
              <button
                type="button"
                className="btn btn-primary"
                onClick={handlePinata}
                disabled={isUploading}
              >
                {isUploading ? <span className="spinner" /> : null}
                {uploadLabel}
              </button>
            </div>

            {isUploading && (
              <div className="upload-progress">
                <div className={`progress-step ${uploadStage === 'image' ? 'active' : uploadStage === 'json' || uploadStage === 'done' ? 'done' : ''}`}>
                  {uploadStage === 'image' ? '⟳' : '✓'} Uploading image
                </div>
                <div className="progress-arrow">→</div>
                <div className={`progress-step ${uploadStage === 'json' ? 'active' : uploadStage === 'done' ? 'done' : ''}`}>
                  {uploadStage === 'done' ? '✓' : uploadStage === 'json' ? '⟳' : '○'} Uploading metadata
                </div>
              </div>
            )}

            {uploadError && (
              <div className="error-box" style={{ marginTop: 10 }}>
                <span className="error-icon">⚠</span> {uploadError}
              </div>
            )}

            {uploadedUrl && (
              <div className="success-box">
                <span>✓ Done! Metadata URI auto-filled.</span>
                <a href={uploadedUrl} target="_blank" rel="noreferrer" className="uri-link">
                  {uploadedUrl}
                </a>
              </div>
            )}

            <div className="upload-alternatives">
              <span className="alt-label">Other options:</span>
              <a href="https://app.pinata.cloud/pinmanager" target="_blank" rel="noreferrer">Pinata Files</a>
              <a href="https://www.arweave.org" target="_blank" rel="noreferrer">Arweave</a>
              <a href="https://nft.storage" target="_blank" rel="noreferrer">NFT.Storage</a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function buildMetadata(name, symbol, form) {
  const meta = {
    name: name || 'My Token',
    symbol: symbol || 'MYTKN',
    description: form.description || '',
    image: form.image || '',
  }
  if (form.website) meta.external_url = form.website
  const extensions = {}
  if (form.twitter) extensions.twitter = form.twitter
  if (form.telegram) extensions.telegram = form.telegram
  if (form.discord) extensions.discord = form.discord
  if (Object.keys(extensions).length > 0) meta.extensions = extensions
  return meta
}
