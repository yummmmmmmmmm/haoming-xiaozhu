// 极简本地静态服务器：只为在你自己电脑上打开"好命小猪"
import http from 'node:http'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { exec } from 'node:child_process'

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
}

export function startServer({ distDir, port = 5173, open = true }) {
  const server = http.createServer(async (req, res) => {
    try {
      const raw = (req.url || '/').split('?')[0].split('#')[0]
      const urlPath = decodeURIComponent(raw)
      let rel = urlPath.replace(/^\/+/, '')
      if (rel === '' || !path.extname(rel)) rel = 'index.html'
      const filePath = path.join(distDir, rel)
      if (!filePath.startsWith(distDir)) throw new Error('bad path')
      const data = await readFile(filePath)
      res.writeHead(200, {
        'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
        'Cache-Control': 'no-store',
      })
      res.end(data)
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end('404 Not Found')
    }
  })

  return new Promise((resolve, reject) => {
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        startServer({ distDir, port: port + 1, open }).then(resolve, reject)
      } else {
        reject(err)
      }
    })

    server.listen(port, '127.0.0.1', () => {
      const url = `http://127.0.0.1:${port}/`
      console.log('')
      console.log('  🐹 好命小猪 已启动')
      console.log(`  👉 打开地址：${url}`)
      console.log('  提示：保持这个黑色窗口开着即可；关掉窗口=停止服务，数据不会丢。')
      console.log('')
      if (open) exec(`start "" "${url}"`, () => undefined)
      resolve({ url, port })
    })
  })
}
