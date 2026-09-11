// 日常使用模式：正式打包后启动本地服务并打开浏览器
import { buildApp, dist } from './build.mjs'
import { startServer } from './server.mjs'

await buildApp({ production: true })
await startServer({ distDir: dist, port: 5173, open: true })
