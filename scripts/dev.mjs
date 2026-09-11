// 开发模式：改动源码后自动重新打包，刷新浏览器即可看到效果
import { context } from 'esbuild'
import { cp, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { startServer } from './server.mjs'
import { dist, root } from './build.mjs'

await mkdir(dist, { recursive: true })

/** 每次打包完成后，把 index.html 一起复制过去 */
const copyHtmlPlugin = {
  name: 'copy-html',
  setup(build) {
    build.onEnd(async (result) => {
      if (result.errors.length > 0) return
      await cp(path.join(root, 'index.html'), path.join(dist, 'index.html'))
      console.log('  ♻️  已重新构建，刷新浏览器即可看到最新改动')
    })
  },
}

const ctx = await context({
  entryPoints: [path.join(root, 'src/main.tsx')],
  bundle: true,
  outfile: path.join(dist, 'app.js'),
  jsx: 'automatic',
  loader: { '.tsx': 'tsx', '.ts': 'ts', '.css': 'css' },
  define: { 'process.env.NODE_ENV': '"development"' },
  sourcemap: true,
  logLevel: 'silent',
  plugins: [copyHtmlPlugin],
})

await ctx.watch()
// NO_OPEN=1 时不自动弹浏览器（给 IDE 调试用，避免多开窗口）
await startServer({ distDir: dist, port: 5173, open: process.env.NO_OPEN !== '1' })
