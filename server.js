import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.join(__dirname, 'dist')
const port = Number(process.env.PORT) || 4173

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
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
    'Cache-Control': 'no-store',
  })
  res.end(payload)
}

function sendFile(res, filePath, method = 'GET') {
  const ext = path.extname(filePath).toLowerCase()
  const type = mime[ext] || 'application/octet-stream'
  const stat = fs.statSync(filePath)
  res.writeHead(200, {
    'Content-Type': type,
    'Content-Length': stat.size,
  })
  if (method === 'HEAD') {
    res.end()
    return
  }
  fs.createReadStream(filePath).pipe(res)
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
  const pathname = decodeURIComponent(url.pathname)

  if (req.method === 'GET' && (pathname === '/health' || pathname === '/health/')) {
    return sendJson(res, 200, {
      status: 'ok',
      service: 'rnsit-progress-dash',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    })
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' })
    return res.end()
  }

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
