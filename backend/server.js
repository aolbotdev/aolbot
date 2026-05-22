import express from 'express'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'
import { readFileSync } from 'fs'
import { deployAgent } from './services/elizaService.js'

// Load backend .env manually (no extra deps needed)
try {
  const envLines = readFileSync(new URL('./.env', import.meta.url), 'utf8').split('\n')
  for (const line of envLines) {
    const [key, ...rest] = line.split('=')
    if (key?.trim() && rest.length) process.env[key.trim()] = rest.join('=').trim()
  }
} catch {}

if (!process.env.ELIZAOS_CLOUD_API_KEY || process.env.ELIZAOS_CLOUD_API_KEY === 'вставь_свой_ключ_здесь') {
  console.warn('⚠️  ELIZAOS_CLOUD_API_KEY not set in backend/.env')
}

const app = express()
const PORT = 4000

app.use(cors())
app.use(express.json({ limit: '10mb' }))

// In-memory store for deployments
const deployments = new Map()

// ── POST /api/agents/deploy ──────────────────────────────────────────────────
app.post('/api/agents/deploy', (req, res) => {
  const config = req.body

  if (!config.name || !config.twitterUsername) {
    return res.status(400).json({ error: 'Missing required fields: name, twitterUsername' })
  }


  const agentId = uuidv4()

  deployments.set(agentId, {
    id: agentId,
    status: 'pending',
    logs: [],
    listeners: [],
    createdAt: new Date().toISOString(),
  })

  // Start deployment in background (non-blocking)
  deployAgent(agentId, config, deployments).catch(err => {
    console.error('Deploy error:', err)
  })

  res.json({ agentId })
})

// ── GET /api/agents/:id/logs  (SSE) ─────────────────────────────────────────
app.get('/api/agents/:id/logs', (req, res) => {
  const deployment = deployments.get(req.params.id)
  if (!deployment) return res.status(404).json({ error: 'Agent not found' })

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  // Replay existing logs
  deployment.logs.forEach(log => {
    res.write(`data: ${JSON.stringify(log)}\n\n`)
  })

  // If already finished — send done and close
  if (deployment.status === 'success' || deployment.status === 'error') {
    res.write(`data: ${JSON.stringify({ type: 'done', status: deployment.status })}\n\n`)
    return res.end()
  }

  // Register as listener for future logs
  deployment.listeners.push(res)

  req.on('close', () => {
    deployment.listeners = deployment.listeners.filter(l => l !== res)
  })
})

// ── GET /api/agents/:id/status ───────────────────────────────────────────────
app.get('/api/agents/:id/status', (req, res) => {
  const deployment = deployments.get(req.params.id)
  if (!deployment) return res.status(404).json({ error: 'Not found' })
  res.json({ id: deployment.id, status: deployment.status, createdAt: deployment.createdAt })
})

// ── POST /api/agents/:id/stop ────────────────────────────────────────────────
app.post('/api/agents/:id/stop', async (req, res) => {
  const deployment = deployments.get(req.params.id)
  if (!deployment) return res.status(404).json({ error: 'Not found' })

  const pm2Name = deployment.pm2Name || `agent-${req.params.id.slice(0, 8)}`
  const { spawn } = await import('child_process')
  const proc = spawn('pm2', ['delete', pm2Name], { shell: true })
  proc.on('close', code => {
    res.json({ ok: true, pm2Name, code })
  })
  proc.on('error', err => res.status(500).json({ error: err.message }))
})

// ── GET /api/health ──────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ ok: true }))

app.listen(PORT, () => {
  console.log(`\n🚀 Backend running on http://localhost:${PORT}\n`)
})
