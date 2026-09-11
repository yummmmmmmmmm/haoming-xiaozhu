// ============================================================
// 测试运行器
// 说明：项目路径里带 "#"，Vite / Vitest 无法解析，因此沿用项目既有的
//      esbuild 工具链：先用 esbuild 把 tests/ 下的用例打包，再用
//      node:test 逐个执行（每个文件一个独立进程，互不污染）。
//
// 用法：
//   npm test                     运行全部测试
//   node scripts/test.mjs account 只运行文件名包含 account 的用例
// ============================================================
import { spawn } from 'node:child_process'
import { cp, mkdir, readdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const testsDir = path.join(root, 'tests')
const outDir = path.join(root, '.tests-build')

async function collect(dir) {
  const found = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      found.push(...(await collect(full)))
    } else if (/\.test\.(ts|tsx)$/.test(entry.name)) {
      found.push(full)
    }
  }
  return found
}

const keywords = process.argv.slice(2)
const all = (await collect(testsDir)).sort()
const selected = keywords.length
  ? all.filter((f) => keywords.some((k) => f.includes(k)))
  : all

if (selected.length === 0) {
  console.error('❌ 没有找到匹配的测试文件')
  process.exit(1)
}

await rm(outDir, { recursive: true, force: true })
await mkdir(outDir, { recursive: true })
await cp(path.join(testsDir, 'harness/register.mjs'), path.join(outDir, 'harness.mjs'))

await build({
  entryPoints: selected,
  outdir: outDir,
  entryNames: '[name]',
  outExtension: { '.js': '.mjs' },
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node20',
  jsx: 'automatic',
  packages: 'external',
  loader: { '.css': 'empty' },
  banner: { js: "import './harness.mjs'" },
  logLevel: 'warning',
})

function runOne(file) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['--test-reporter=spec', file], {
      cwd: root,
      env: { ...process.env, NODE_ENV: 'test' },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let out = ''
    child.stdout.on('data', (d) => (out += d))
    child.stderr.on('data', (d) => (out += d))
    child.on('close', (code) => {
      process.stdout.write(out)
      resolve({ file: path.basename(file), code: code ?? 1 })
    })
  })
}

console.log(`\n🧪 好命小猪 · 测试运行器（esbuild + node:test）`)
console.log(`   共 ${selected.length} 个测试文件\n`)

const results = []
for (const file of selected) {
  const name = path.basename(file).replace(/\.(ts|tsx)$/, '')
  console.log(`\n───── ▶ ${name} ─────`)
  results.push(await runOne(path.join(outDir, `${name}.mjs`)))
}

const failed = results.filter((r) => r.code !== 0)
console.log('\n══════════════ 测试汇总 ══════════════')
for (const r of results) {
  console.log(`${r.code === 0 ? '✅ 通过' : '❌ 失败'}  ${r.file}`)
}
console.log(`──────────────────────────────────────`)
console.log(`文件：${results.length} 个，通过 ${results.length - failed.length} 个，失败 ${failed.length} 个\n`)

if (failed.length > 0) {
  console.error('❌ 存在失败的测试文件，请先修复再继续。')
  process.exit(1)
}
console.log('✅ 全部测试通过')
