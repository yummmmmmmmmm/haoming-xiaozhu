// 构建：把 src 打包成 dist 下的网页文件
// 说明：项目路径里带 "#"，Vite 对它支持不好，所以改用 esbuild。
import { build } from 'esbuild'
import { createHash } from 'node:crypto'
import { cp, mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises'
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

/**
 * 给产物加内容指纹（app.js → app.7f3a2b1c.js）。
 *
 * 线上托管（GitHub Pages 等）会缓存 app.js 这类固定文件名：
 * 迭代后重新部署，朋友刷新拿到的可能还是旧版本。
 * 文件名和内容绑定之后，内容一变名字就变，缓存自然失效；
 * index.html 自己保持同名，只负责指向新的资源文件。
 */
async function fingerprint(file) {
  const hash = createHash('sha256').update(await readFile(file)).digest('hex').slice(0, 8)
  const ext = path.extname(file)
  const target = `${file.slice(0, -ext.length)}.${hash}${ext}`
  await rename(file, target)
  return path.basename(target)
}

export async function buildApp({ production = true } = {}) {
  // 带指纹的产物会不断累积旧文件名，先清空再构建，避免旧文件跟着一起上传
  await rm(dist, { recursive: true, force: true })
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
  // index.html 里写的是固定文件名，这里改写成带指纹的实际产物名
  const jsName = await fingerprint(path.join(dist, 'app.js'))
  const cssName = await fingerprint(path.join(dist, 'app.css'))
  const html = await readFile(path.join(root, 'index.html'), 'utf8')
  await writeFile(
    path.join(dist, 'index.html'),
    html.replace('./app.js', `./${jsName}`).replace('./app.css', `./${cssName}`),
  )

  await copyPublic()
}

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isDirectRun) {
  // 说明：esbuild 会直接覆盖 app.js，不需要先删整个 dist 目录
  await buildApp({ production: true })
  console.log('✅ 构建完成，文件已输出到 dist/')
}
