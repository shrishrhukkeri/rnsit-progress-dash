import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.join(__dirname, 'dist')
const port = Number(process.env.PORT) || 4173
const dataFilePath = path.join(__dirname, 'server-data.json')
const csvFilePath = path.join(__dirname, 'server-data.csv')
const seedFilePath = path.join(__dirname, 'src', 'data', 'defaultProjects.json')

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS, HEAD',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  })
  res.end(payload)
}

function sendFile(res, filePath, method = 'GET') {
  const ext = path.extname(filePath).toLowerCase()
  const type = mime[ext] || 'application/octet-stream'
  const stat = fs.statSync(filePath)
  const isHtml = ext === '.html'
  const isHashedAsset = filePath.includes(`${path.sep}assets${path.sep}`)

  res.writeHead(200, {
    'Content-Type': type,
    'Content-Length': stat.size,
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': isHtml
      ? 'no-cache, no-store, must-revalidate'
      : isHashedAsset
        ? 'public, max-age=31536000, immutable'
        : 'public, max-age=3600',
  })
  if (method === 'HEAD') {
    res.end()
    return
  }
  fs.createReadStream(filePath).pipe(res)
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
      if (body.length > 5 * 1024 * 1024) {
        req.destroy()
        reject(new Error('Payload too large'))
      }
    })
    req.on('end', () => {
      if (!body.trim()) {
        resolve({})
        return
      }
      try {
        resolve(JSON.parse(body))
      } catch {
        reject(new Error('Invalid JSON payload'))
      }
    })
    req.on('error', reject)
  })
}

function getSeedProjects() {
  try {
    if (fs.existsSync(seedFilePath)) {
      return JSON.parse(fs.readFileSync(seedFilePath, 'utf-8'))
    }
  } catch (e) {
    console.error('Error reading seed file:', e.message)
  }
  return []
}

function projectsToCsv(projects) {
  const headers = [
    'Project ID',
    'Project Name',
    'Duration',
    'Week Label',
    'Milestone Title',
    'Status',
    'Achievement Note',
    'Delay Reason',
    'Updated At',
    'Updated By',
  ]
  const rows = [headers.join(',')]

  function escapeCsv(str) {
    if (!str) return '""'
    return `"${String(str).replace(/"/g, '""')}"`
  }

  for (const p of projects || []) {
    for (const m of p.milestones || []) {
      rows.push(
        [
          escapeCsv(p.id),
          escapeCsv(p.name),
          escapeCsv(p.duration),
          escapeCsv(m.weekLabel),
          escapeCsv(m.title),
          escapeCsv(m.status),
          escapeCsv(m.achievementNote || ''),
          escapeCsv(m.delayReason || ''),
          escapeCsv(m.updatedAt || ''),
          escapeCsv(m.updatedBy || ''),
        ].join(','),
      )
    }
  }
  return rows.join('\n')
}

let cachedState = null

async function loadState() {
  // 1. Upstash Redis REST
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REST_URL
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REST_TOKEN
  if (upstashUrl && upstashToken) {
    try {
      const res = await fetch(`${upstashUrl.replace(/\/$/, '')}/get/rnsit_progress_state`, {
        headers: { Authorization: `Bearer ${upstashToken}` },
      })
      if (res.ok) {
        const data = await res.json()
        if (data && data.result) {
          const parsed = typeof data.result === 'string' ? JSON.parse(data.result) : data.result
          if (parsed && Array.isArray(parsed.projects)) {
            cachedState = parsed
            return { ...parsed, storage: 'upstash' }
          }
        }
      }
    } catch (e) {
      console.warn('Upstash fetch failed:', e.message)
    }
  }

  // 2. GitHub Gist
  const gistToken = process.env.GITHUB_GIST_TOKEN || process.env.GITHUB_TOKEN
  const gistId = process.env.GIST_ID
  if (gistToken && gistId) {
    try {
      const res = await fetch(`https://api.github.com/gists/${gistId}`, {
        headers: {
          Authorization: `Bearer ${gistToken}`,
          'User-Agent': 'rnsit-progress-dash',
          Accept: 'application/vnd.github.v3+json',
        },
      })
      if (res.ok) {
        const gist = await res.json()
        const file = gist.files && (gist.files['progress-state.json'] || Object.values(gist.files)[0])
        if (file && file.content) {
          const parsed = JSON.parse(file.content)
          if (parsed && Array.isArray(parsed.projects)) {
            cachedState = parsed
            return { ...parsed, storage: 'gist' }
          }
        }
      }
    } catch (e) {
      console.warn('GitHub Gist fetch failed:', e.message)
    }
  }

  // 3. Local persistent files (JSON and CSV)
  if (fs.existsSync(dataFilePath)) {
    try {
      const raw = fs.readFileSync(dataFilePath, 'utf-8')
      const parsed = JSON.parse(raw)
      if (parsed && Array.isArray(parsed.projects)) {
        cachedState = parsed
        return { ...parsed, storage: 'file' }
      }
    } catch (e) {
      console.warn('Local file read failed:', e.message)
    }
  }

  // 4. Memory cache fallback
  if (cachedState && Array.isArray(cachedState.projects)) {
    return { ...cachedState, storage: 'memory' }
  }

  // 5. Default seed
  const seed = getSeedProjects()
  return {
    projects: seed,
    updatedAt: new Date().toISOString(),
    isDefault: true,
    storage: 'seed',
  }
}

async function saveState(projects) {
  const payload = {
    projects,
    updatedAt: new Date().toISOString(),
  }
  cachedState = payload

  // 1. Write local JSON and CSV text files
  try {
    fs.writeFileSync(dataFilePath, JSON.stringify(payload, null, 2), 'utf-8')
    fs.writeFileSync(csvFilePath, projectsToCsv(projects), 'utf-8')
  } catch (e) {
    console.error('Failed to write local state files:', e.message)
  }

  // 2. Upstash Redis
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REST_URL
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REST_TOKEN
  if (upstashUrl && upstashToken) {
    try {
      await fetch(`${upstashUrl.replace(/\/$/, '')}/set/rnsit_progress_state`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${upstashToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(JSON.stringify(payload)),
      })
    } catch (e) {
      console.error('Upstash save failed:', e.message)
    }
  }

  // 3. GitHub Gist
  const gistToken = process.env.GITHUB_GIST_TOKEN || process.env.GITHUB_TOKEN
  const gistId = process.env.GIST_ID
  if (gistToken && gistId) {
    try {
      await fetch(`https://api.github.com/gists/${gistId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${gistToken}`,
          'User-Agent': 'rnsit-progress-dash',
          'Content-Type': 'application/json',
          Accept: 'application/vnd.github.v3+json',
        },
        body: JSON.stringify({
          files: {
            'progress-state.json': {
              content: JSON.stringify(payload, null, 2),
            },
            'progress-report.csv': {
              content: projectsToCsv(projects),
            },
          },
        }),
      })
    } catch (e) {
      console.error('Gist save failed:', e.message)
    }
  }

  // 4. GitHub direct repository file commit (if GITHUB_TOKEN set)
  const ghToken = process.env.GITHUB_TOKEN
  if (ghToken && !gistId) {
    try {
      const repoOwner = process.env.GITHUB_REPO_OWNER || 'shrishrhukkeri'
      const repoName = process.env.GITHUB_REPO_NAME || 'rnsit-progress-dash'
      const targetPath = 'src/data/defaultProjects.json'
      const getUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${targetPath}`
      const getRes = await fetch(getUrl, {
        headers: {
          Authorization: `Bearer ${ghToken}`,
          'User-Agent': 'rnsit-progress-dash',
          Accept: 'application/vnd.github.v3+json',
        },
      })
      let sha = null
      if (getRes.ok) {
        const fileInfo = await getRes.json()
        sha = fileInfo.sha
      }
      const fileContent = Buffer.from(JSON.stringify(projects, null, 2), 'utf-8').toString('base64')
      await fetch(getUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${ghToken}`,
          'User-Agent': 'rnsit-progress-dash',
          'Content-Type': 'application/json',
          Accept: 'application/vnd.github.v3+json',
        },
        body: JSON.stringify({
          message: 'chore: persist milestone updates from student dashboard [skip ci]',
          content: fileContent,
          sha: sha || undefined,
        }),
      })
    } catch (e) {
      console.warn('GitHub repo commit failed:', e.message)
    }
  }

  return payload
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
  const pathname = decodeURIComponent(url.pathname)

  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS, HEAD',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    })
    return res.end()
  }

  // Health check
  if (pathname === '/health' || pathname === '/health/') {
    if (req.method === 'GET' || req.method === 'HEAD') {
      const state = await loadState()
      return sendJson(res, 200, {
        status: 'ok',
        service: 'rnsit-progress-dash',
        storage: state.storage || 'seed',
        projectsCount: state.projects?.length || 0,
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
      })
    }
    res.writeHead(405, { Allow: 'GET, HEAD' })
    return res.end()
  }

  // GET State
  if (pathname === '/api/state' || pathname === '/api/state/') {
    if (req.method === 'GET') {
      const state = await loadState()
      return sendJson(res, 200, state)
    }
    if (req.method === 'POST' || req.method === 'PUT') {
      try {
        const body = await readJsonBody(req)
        if (!body || !Array.isArray(body.projects)) {
          return sendJson(res, 400, { ok: false, error: 'Expected { projects: [...] } array' })
        }
        const saved = await saveState(body.projects)
        return sendJson(res, 200, { ok: true, savedAt: saved.updatedAt })
      } catch (err) {
        return sendJson(res, 400, { ok: false, error: err.message || 'Failed to save state' })
      }
    }
    res.writeHead(405, { Allow: 'GET, POST, PUT, OPTIONS' })
    return res.end()
  }

  // CSV Report Export endpoint
  if (pathname === '/api/export/csv' || pathname === '/api/export/csv/') {
    if (req.method === 'GET') {
      const state = await loadState()
      const csv = projectsToCsv(state.projects)
      res.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="rnsit-progress-report.csv"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*',
      })
      return res.end(csv)
    }
    res.writeHead(405, { Allow: 'GET, OPTIONS' })
    return res.end()
  }

  // Reset to seed
  if (pathname === '/api/reset' || pathname === '/api/reset/') {
    if (req.method === 'POST') {
      const seed = getSeedProjects()
      const saved = await saveState(seed)
      return sendJson(res, 200, { ok: true, message: 'Reset to seed state', savedAt: saved.updatedAt })
    }
    res.writeHead(405, { Allow: 'POST, OPTIONS' })
    return res.end()
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD, OPTIONS' })
    return res.end()
  }

  // Static files in dist/
  const safePath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '')
  const candidate = path.join(distDir, safePath === '/' ? 'index.html' : safePath)

  if (candidate.startsWith(distDir) && fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
    return sendFile(res, candidate, req.method)
  }

  // SPA fallback
  const indexHtml = path.join(distDir, 'index.html')
  if (fs.existsSync(indexHtml)) {
    return sendFile(res, indexHtml, req.method)
  }

  sendJson(res, 503, { status: 'error', message: 'App build missing (dist/)' })
})

server.listen(port, () => {
  console.log(`Progress Dash listening on :${port}`)
})
