import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const AGENTS_DIR = path.join(__dirname, '..', 'agents')

// ── Helpers ───────────────────────────────────────────────────────────────────

function addLog(deployment, message, type = 'info') {
  const log = { message, type, time: new Date().toISOString() }
  deployment.logs.push(log)
  deployment.listeners.forEach(res => {
    try { res.write(`data: ${JSON.stringify(log)}\n\n`) } catch {}
  })
}

function broadcastDone(deployment) {
  const payload = JSON.stringify({ type: 'done', status: deployment.status })
  deployment.listeners.forEach(res => {
    try {
      res.write(`data: ${payload}\n\n`)
      res.end()
    } catch {}
  })
  deployment.listeners = []
}

function runCommand(cmd, args, cwd, deployment, extraEnv = {}, silent = false) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, {
      cwd,
      shell: true,
      env: { ...process.env, ...extraEnv },
    })

    // Collect stderr for error reporting only — never broadcast it
    let stderrBuf = ''
    proc.stderr.on('data', data => { stderrBuf += data.toString() })

    // stdout: only broadcast if not silent
    proc.stdout.on('data', data => {
      if (silent) return
      // Swallow PM2 table lines and npm noise
      data.toString().split('\n').filter(l => l.trim()).forEach(line => {
        if (/─|│|┌|┐|└|┘|├|┤|warn|npm fund|npm notice|audited|packages looking/.test(line)) return
        addLog(deployment, line, 'info')
      })
    })

    proc.on('close', code => {
      if (code === 0) resolve()
      else {
        const msg = stderrBuf.trim() || `Process exited with code ${code}`
        reject(new Error(msg.split('\n').slice(-3).join(' ').trim()))
      }
    })

    proc.on('error', err => reject(err))
  })
}

function splitLines(str, sep) {
  if (!str) return []
  return str.split(sep).map(s => s.trim()).filter(Boolean)
}

// ── Character builder ─────────────────────────────────────────────────────────

function buildCharacter(config) {
  const toneMap = {
    meme:         ['Uses humor and internet memes', 'Casual and highly entertaining', 'Creates viral and shareable content', 'Witty with short punchy posts'],
    friendly:     ['Warm and approachable tone', 'Community-first mindset', 'Encouraging and supportive', 'Builds genuine connections'],
    professional: ['Formal and authoritative voice', 'Data-driven and analytical', 'Thought leadership focus', 'Credible and informative'],
    serious:      ['Straightforward and factual', 'No fluff — just insights', 'Analytical and precise', 'Focused on delivering value'],
  }

  const style = [
    ...(toneMap[config.tone] || toneMap.friendly),
    'Posts text only — no images, no media attachments',
  ]

  return {
    name: config.name,
    bio: config.bio ? [config.bio] : [],
    lore: config.lore ? [config.lore] : [],
    topics: splitLines(config.topics, ','),
    adjectives: splitLines(config.adjectives, ','),
    postExamples: splitLines(config.postExamples, '\n'),
    style: { all: style, chat: style, post: style },
    settings: {
      model: config.model || 'gpt-4o-mini',
    },
  }
}

// ── Agent runner script (generated per-agent) ─────────────────────────────────

function buildAgentRunner() {
  return `
import { Scraper } from 'agent-twitter-client'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const character = JSON.parse(fs.readFileSync(path.join(__dirname, 'character.json'), 'utf8'))

const PROVIDER = process.env.MODEL_PROVIDER || 'openai'
const MODEL    = process.env.MODEL_NAME    || 'gpt-4o-mini'

function buildSystemPrompt() {
  const bio      = character.bio.join(' ')
  const topics   = character.topics.join(', ')
  const style    = character.style.post.join('. ')
  const examples = character.postExamples.slice(0, 3).join(' | ')
  return [
    \`You are \${character.name}.\`,
    bio      ? \`About you: \${bio}\`            : '',
    topics   ? \`You tweet about: \${topics}.\`  : '',
    style    ? \`Your style: \${style}.\`        : '',
    examples ? \`Example posts: \${examples}.\`  : '',
    'Write a single tweet under 280 characters. Text only — no hashtags unless naturally fitting. No emojis unless tone demands it. Do not wrap the tweet in quotes.',
  ].filter(Boolean).join(' ')
}

async function generateTweet() {
  const systemPrompt = buildSystemPrompt()

  if (PROVIDER === 'anthropic') {
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 120,
      system: systemPrompt,
      messages: [{ role: 'user', content: 'Write a new tweet now.' }],
    })
    return msg.content[0].text.trim().replace(/^["']|["']$/g, '')
  }

  // Default: OpenAI
  const OpenAI = (await import('openai')).default
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const res = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: 'Write a new tweet now.' },
    ],
    max_tokens: 120,
    temperature: 0.9,
  })
  return res.choices[0].message.content.trim().replace(/^["']|["']$/g, '')
}

async function run() {
  const scraper = new Scraper()

  console.log(\`[agent] Logging in as @\${process.env.TWITTER_USERNAME}...\`)
  await scraper.login(
    process.env.TWITTER_USERNAME,
    process.env.TWITTER_PASSWORD,
    process.env.TWITTER_EMAIL,
  )

  const isLogged = await scraper.isLoggedIn()
  if (!isLogged) {
    console.error('[agent] Twitter login failed — exiting')
    process.exit(1)
  }
  console.log(\`[agent] ✅ Logged in as @\${process.env.TWITTER_USERNAME}\`)

  async function postTweet() {
    try {
      const tweet = await generateTweet()
      // sendLongTweet uses x.com endpoint with updated query ID (more reliable)
      await scraper.sendLongTweet(tweet)
      console.log(\`[agent] ✅ Posted: \${tweet}\`)
    } catch (err) {
      console.error(\`[agent] ❌ Post error: \${err.message}\`)
    }
  }

  // Post immediately on start
  await postTweet()

  // Then post on the configured interval
  const intervalMs = (parseInt(process.env.POST_INTERVAL_MIN) || 240) * 60 * 1000
  console.log(\`[agent] ⏰ Next post in \${Math.round(intervalMs / 60000)} min\`)
  setInterval(postTweet, intervalMs)
}

run().catch(err => {
  console.error('[agent] Fatal:', err)
  process.exit(1)
})
`.trimStart()
}

function buildAgentPackageJson(name) {
  return {
    name: name.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
    version: '1.0.0',
    type: 'module',
    scripts: { start: 'node agent-runner.js' },
    dependencies: {
      'openai':             '^4.67.0',
      '@anthropic-ai/sdk':  '^0.39.0',
      'agent-twitter-client': '^0.0.18',
    },
  }
}

function buildEnv(config) {
  const min = config.postingFrequency ? parseInt(config.postingFrequency) * 60 : 240
  return [
    `TWITTER_USERNAME=${config.twitterUsername || ''}`,
    `TWITTER_PASSWORD=${config.twitterPassword || ''}`,
    `TWITTER_EMAIL=${config.twitterEmail || ''}`,
    `OPENAI_API_KEY=${process.env.OPENAI_API_KEY || ''}`,
    `ANTHROPIC_API_KEY=${process.env.ANTHROPIC_API_KEY || ''}`,
    `MODEL_PROVIDER=${config.provider || 'openai'}`,
    `MODEL_NAME=${config.model || 'gpt-4o-mini'}`,
    `POST_INTERVAL_MIN=${min}`,
    `POST_INTERVAL_MAX=${min + 60}`,
  ].join('\n')
}


// ── Main deploy ───────────────────────────────────────────────────────────────

export async function deployAgent(agentId, config, deployments) {
  const deployment = deployments.get(agentId)
  const agentDir   = path.join(AGENTS_DIR, agentId)
  const pm2Name    = `agent-${agentId.slice(0, 8)}`

  try {
    // ── Step 1: Create project files ──────────────────────────────────────────
    deployment.status = 'building'
    fs.mkdirSync(agentDir, { recursive: true })

    const character = buildCharacter(config)
    fs.writeFileSync(path.join(agentDir, 'character.json'), JSON.stringify(character, null, 2))
    fs.writeFileSync(path.join(agentDir, '.env'), buildEnv(config))
    fs.writeFileSync(
      path.join(agentDir, 'package.json'),
      JSON.stringify(buildAgentPackageJson(config.name), null, 2),
    )
    fs.writeFileSync(path.join(agentDir, 'agent-runner.js'), buildAgentRunner())
    addLog(deployment, `STEP:setup`, 'step')

    // ── Step 2: Install deps ──────────────────────────────────────────────────
    deployment.status = 'installing'
    addLog(deployment, `STEP:install`, 'step')
    await runCommand('npm', ['install', '--legacy-peer-deps', '--silent'], agentDir, deployment, {}, true)
    addLog(deployment, `STEP:install_done`, 'step')

    // ── Step 3: Start agent with PM2 ─────────────────────────────────────────
    deployment.status = 'deploying'
    addLog(deployment, `STEP:launch`, 'step')

    // Parse env vars for ecosystem config
    const agentEnvVars = buildEnv(config)
      .split('\n')
      .reduce((acc, line) => {
        const [k, ...v] = line.split('=')
        if (k?.trim()) acc[k.trim()] = v.join('=').trim()
        return acc
      }, {})

    // Write PM2 ecosystem config
    const ecosystem = {
      apps: [{
        name: pm2Name,
        script: 'agent-runner.js',
        cwd: agentDir,
        interpreter: 'node',
        env: agentEnvVars,
        restart_delay: 5000,
        max_restarts: 10,
        autorestart: true,
      }],
    }
    fs.writeFileSync(
      path.join(agentDir, 'ecosystem.config.cjs'),
      `module.exports = ${JSON.stringify(ecosystem, null, 2)}`,
    )

    // Stop existing agent with same name if any (ignore errors)
    try {
      await runCommand('pm2', ['delete', pm2Name], agentDir, deployment, {}, true)
    } catch {}

    // Start via ecosystem config — env vars are properly injected
    await runCommand('pm2', ['start', 'ecosystem.config.cjs'], agentDir, deployment, {}, true)

    // Save PM2 process list so it survives reboots
    try {
      await runCommand('pm2', ['save'], agentDir, deployment, {}, true)
    } catch {}

    // ── Done ──────────────────────────────────────────────────────────────────
    deployment.status = 'success'
    deployment.pm2Name = pm2Name
    addLog(deployment, `STEP:done`, 'step')

  } catch (err) {
    deployment.status = 'error'
    addLog(deployment, `STEP:error`, 'error')
  } finally {
    broadcastDone(deployment)

    // Clean up files after 1 hour (PM2 keeps the process; we just remove source)
    setTimeout(() => {
      try { fs.rmSync(agentDir, { recursive: true, force: true }) } catch {}
      deployments.delete(agentId)
    }, 3_600_000)
  }
}
