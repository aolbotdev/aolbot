import { useEffect, useRef, useState, useCallback } from 'react'

const SECTIONS = [
  { label: 'World',       value: 'world',           emoji: '🌍' },
  { label: 'Tech',        value: 'technology',       emoji: '💻' },
  { label: 'Business',    value: 'business',         emoji: '💰' },
  { label: 'Sport',       value: 'sport',            emoji: '⚽' },
  { label: 'Science',     value: 'science',          emoji: '🔬' },
  { label: 'Environment', value: 'environment',      emoji: '🌿' },
  { label: 'Culture',     value: 'culture',          emoji: '🎭' },
  { label: 'Politics',    value: 'politics',         emoji: '🏛' },
  { label: 'Health',      value: 'society',          emoji: '❤️' },
  { label: 'Film',        value: 'film',             emoji: '🎬' },
]

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function fromDateISO() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

export default function NewsFeed() {
  const [section, setSection] = useState('world')
  const [posts, setPosts]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const intervalRef = useRef(null)
  const tabsRef = useRef(null)

  const apiKey = import.meta.env.VITE_GUARDIAN_API_KEY

  const fetchNews = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        'api-key':     apiKey,
        section,
        'page-size':   '20',
        'order-by':    'newest',
        'from-date':   fromDateISO(),
        'show-fields': 'thumbnail,trailText,byline',
      })
      const res = await fetch(`/guardian-proxy/search?${params}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setPosts(data.response?.results || [])
      setLastUpdated(new Date())
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [section, apiKey])

  useEffect(() => {
    setLoading(true)
    setPosts([])
    fetchNews()
    clearInterval(intervalRef.current)
    intervalRef.current = setInterval(fetchNews, 120_000)
    return () => clearInterval(intervalRef.current)
  }, [fetchNews])

  return (
    <div className="news-feed">
      {/* Header */}
      <div className="news-header">
        <div className="news-title-row">
          <div className="news-title">
            <span className="news-title-dot" />
            Live News
          </div>
          {lastUpdated && (
            <span className="news-updated">↻ {timeAgo(lastUpdated.toISOString())}</span>
          )}
        </div>

        <div className="news-tabs" ref={tabsRef}>
          {SECTIONS.map(s => (
            <button
              key={s.value}
              className={`news-tab ${section === s.value ? 'active' : ''}`}
              onClick={() => setSection(s.value)}
            >
              <span>{s.emoji}</span>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="news-body">
        {loading ? (
          <div className="news-loading">
            <span className="spinner" style={{ borderColor: 'rgba(255,255,255,0.15)', borderTopColor: 'var(--blue)' }} />
            Loading…
          </div>
        ) : error ? (
          <div className="news-empty">
            <div style={{ fontSize: 28, marginBottom: 8 }}>⚠️</div>
            <strong>Failed to load</strong>
            <p style={{ margin: '6px 0 0', fontSize: 12, opacity: 0.6 }}>{error}</p>
            <button className="btn-primary" style={{ marginTop: 12, padding: '6px 18px', fontSize: 12 }} onClick={fetchNews}>
              Retry
            </button>
          </div>
        ) : posts.length === 0 ? (
          <div className="news-empty">
            <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>
            No articles found
          </div>
        ) : (
          <div className="news-list">
            {posts.map(post => (
              <a
                key={post.id}
                href={post.webUrl}
                target="_blank"
                rel="noreferrer"
                className="news-card"
              >
                {post.fields?.thumbnail && (
                  <img
                    className="news-thumb"
                    src={post.fields.thumbnail}
                    alt=""
                    loading="lazy"
                  />
                )}
                <div className="news-card-body">
                  <div className="news-card-top">
                    <span className="news-source">{post.sectionName}</span>
                    <span className="news-time">{timeAgo(post.webPublicationDate)}</span>
                  </div>
                  <div className="news-card-title">{post.webTitle}</div>
                  {post.fields?.trailText && (
                    <div className="news-card-trail"
                      dangerouslySetInnerHTML={{ __html: post.fields.trailText }}
                    />
                  )}
                  {post.fields?.byline && (
                    <div className="news-byline">{post.fields.byline}</div>
                  )}
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
