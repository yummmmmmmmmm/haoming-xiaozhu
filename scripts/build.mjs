// 构建：把 src 打包成 dist 下的网页文件
// 说明：项目路径里带 "#"，Vite 对它支持不好，所以改用 esbuild。
import { build } from 'esbuild'
import { cp, mkdir, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
export const root = path.resolve(here, '..')
export const dist = path.join(root, 'dist')

/** 把 public/ 里的静态资源（猪脸图标等）复制到产物根目录，让 /xxx.png 这类路径可直接访问 */
export async function copyPublic() {
  const from = path.join(root, 'public')
  let entries
  try {
    entries = await readdir(from, { withFileTypes: true })
  } catch {
    return // 还没有 public/ 目录，直接跳过
  }
  await Promise.all(
    entries.map((entry) =>
      cp(path.join(from, entry.name), path.join(dist, entry.name), { recursive: true }),
    ),
  )
}

export async function buildApp({ production = true } = {}) {
  await mkdir(dist, { recursive: true })
  await build({
    entryPoints: [path.join(root, 'src/main.tsx')],
    bundle: true,
    outfile: path.join(dist, 'app.js'),
    jsx: 'automatic',
    loader: { '.tsx': 'tsx', '.ts': 'ts', '.css': 'css' },
    define: { 'process.env.NODE_ENV': production ? '"production"' : '"development"' },
    minify: production,
    sourcemap: true,
    logLevel: 'silent',
  })
  await cp(path.join(root, 'index.html'), path.join(dist, 'index.html'))
  await copyPublic()
}

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isDirectRun) {
  // 说明：esbuild 会直接覆盖 app.js，不需要先删整个 dist 目录
  await buildApp({ production: true })
  console.log('✅ 构建完成，文件已输出到 dist/')
}
