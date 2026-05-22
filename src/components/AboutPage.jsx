import { Link } from 'react-router-dom'

export default function AboutPage() {
  return (
    <div className="about-page">
      <div className="about-container">

        {/* Logo */}
        <div className="about-top-logo">
          <img src="/aolbot.png" alt="AOLBOT" className="about-top-logo-img" />
        </div>

        {/* Back */}
        <Link to="/" className="about-back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back to App
        </Link>

        {/* Hero */}
        <div className="about-hero">
          <div className="about-hero-badge">AI × Web3</div>
          <h1 className="about-hero-title">
            The smartest way to<br />
            <span className="about-hero-accent">launch & grow</span> on <a href="https://america.fun" target="_blank" rel="noopener noreferrer" className="about-usa-link">America.Fun</a>
          </h1>
          <p className="about-hero-sub">
            AOLBOT combines AI agent automation with the America.Fun token launchpad —
            so your project launches on-chain and builds its audience on X, simultaneously.
          </p>
          <Link to="/" className="about-hero-cta">
            Launch the App
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </Link>
        </div>

        {/* Core value props */}
        <div className="about-props">
          <div className="about-prop">
            <span className="about-prop-num">01</span>
            <span className="about-prop-text">Token launch on America.Fun in one click</span>
          </div>
          <div className="about-prop-divider" />
          <div className="about-prop">
            <span className="about-prop-num">02</span>
            <span className="about-prop-text">AI agent auto-posts on X 24/7</span>
          </div>
          <div className="about-prop-divider" />
          <div className="about-prop">
            <span className="about-prop-num">03</span>
            <span className="about-prop-text">Both happen with a single Deploy button</span>
          </div>
        </div>

        {/* What we do */}
        <section className="about-section">
          <div className="about-section-eyebrow">What We Do</div>
          <h2 className="about-section-heading">AI agents that market your token from day one</h2>
          <p className="about-text">
            Most token launches fail not because of the product — but because of visibility. AOLBOT solves this by
            deploying an intelligent Twitter agent the moment your token goes live on <strong>America.Fun</strong>.
            Your agent starts posting, building an audience, and driving attention to your project automatically —
            while you focus on building.
          </p>
        </section>

        {/* Features */}
        <section className="about-section">
          <div className="about-section-eyebrow">Features</div>
          <div className="about-features">

            <div className="about-feature-card">
              <div className="about-feature-icon-wrap" style={{ '--fc': '#f59e0b' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                </svg>
              </div>
              <h3>America.Fun Integration</h3>
              <p>Deploy your Solana token directly to the America.Fun launchpad. IPFS image upload, on-chain metadata, anti-sniper protection — handled automatically, no code needed.</p>
            </div>

            <div className="about-feature-card">
              <div className="about-feature-icon-wrap" style={{ '--fc': '#a78bfa' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 12h6M9 15h4"/>
                </svg>
              </div>
              <h3>Autonomous AI Agent</h3>
              <p>Your agent runs 24/7 on our servers, powered by ChatGPT or Claude. It posts on X on a schedule you define — from every hour to once a day — without any manual input.</p>
            </div>

            <div className="about-feature-card">
              <div className="about-feature-icon-wrap" style={{ '--fc': '#22c55e' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              </div>
              <h3>Custom Personality</h3>
              <p>Define your agent's tone (Meme, Friendly, Professional, Serious), topics, personality traits, and example posts. Every tweet reflects your project's unique voice and brand.</p>
            </div>

            <div className="about-feature-card">
              <div className="about-feature-icon-wrap" style={{ '--fc': '#3b82f6' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                  <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
                </svg>
              </div>
              <h3>Choose Your AI Brain</h3>
              <p>Select from GPT-4o Mini, GPT-4o, GPT-4 Turbo, Claude Haiku, Sonnet, or Opus. Match the model to your budget and content quality needs.</p>
            </div>

            <div className="about-feature-card">
              <div className="about-feature-icon-wrap" style={{ '--fc': '#ec4899' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
              </div>
              <h3>One-Click Deploy</h3>
              <p>Hit a single button — AOLBOT launches your token on America.Fun, then automatically deploys your AI agent once the transaction is confirmed on-chain.</p>
            </div>

            <div className="about-feature-card">
              <div className="about-feature-icon-wrap" style={{ '--fc': '#00E5A0' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <h3>Non-Custodial & Secure</h3>
              <p>All transactions are signed in your own wallet — Phantom, Solflare, Coinbase, or Trust. AOLBOT never holds your keys or funds. You stay in full control.</p>
            </div>

          </div>
        </section>

        {/* How it works */}
        <section className="about-section">
          <div className="about-section-eyebrow">How It Works</div>
          <div className="about-steps">
            {[
              { n: '01', title: 'Fill in Identity & Token Info', desc: 'Set your AI agent\'s name, bio, and personality alongside your token\'s name, symbol, description, and image — all in one screen.' },
              { n: '02', title: 'Configure Style & X Account', desc: 'Choose your agent\'s tone and posting topics. Connect your X account so the agent can post on your behalf.' },
              { n: '03', title: 'Pick AI Model & Schedule', desc: 'Select ChatGPT or Claude, choose the model tier, and set how often your agent posts — from every hour to once a day.' },
              { n: '04', title: 'Deploy Everything at Once', desc: 'Press Deploy. Your token launches on America.Fun, gets confirmed on Solana, and your AI agent immediately goes live on X — fully autonomous.' },
            ].map(s => (
              <div key={s.n} className="about-step">
                <div className="about-step-num">{s.n}</div>
                <div>
                  <div className="about-step-title">{s.title}</div>
                  <div className="about-step-desc">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <div className="about-cta-block">
          <h2 className="about-cta-title">Ready to launch?</h2>
          <p className="about-cta-sub">Deploy your token and AI agent in under 5 minutes.</p>
          <Link to="/" className="about-hero-cta">
            Get Started
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </Link>
        </div>

        <div className="about-footer-note">© {new Date().getFullYear()} AOLBOT. All rights reserved.</div>

      </div>
    </div>
  )
}
