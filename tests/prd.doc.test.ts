import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, it } from 'node:test'
import { GUIDE_ARTICLES, GUIDE_CATEGORIES, PRODUCTS, SEED_COMMENTS, SEED_POSTS, SLIDES } from '../src/data/seed'

/**
 * 阶段1 · 文档一致性
 * PRD 开篇声明「本文是后续开发的唯一依据，凡与本文冲突的旧实现以本文为准」，
 * 因此这里把 PRD 里可核对的声明与代码实现绑在一起，防止文档与实现再次漂移。
 */

const root = process.cwd()
const prdPath = path.join(root, 'PRD.md')
const appPath = path.join(root, 'src/App.tsx')

function numberBefore(text: string, pattern: RegExp): number {
  const m = text.match(pattern)
  assert.ok(m, `PRD 中未找到与 ${pattern} 匹配的声明`)
  return Number(m[1])
}

describe('阶段1 文档与实现一致性', () => {
  it('PRD 声明的内置内容数量与代码一致', async () => {
    const prd = await readFile(prdPath, 'utf8')

    assert.equal(numberBefore(prd, /轮播\s*(\d+)\s*张/), SLIDES.length, '轮播数量不一致')
    assert.equal(numberBefore(prd, /指南分类\s*(\d+)\s*个/), GUIDE_CATEGORIES.length, '指南分类数量不一致')
    assert.equal(numberBefore(prd, /指南文章\s*(\d+)\s*篇/), GUIDE_ARTICLES.length, '指南文章数量不一致')
    assert.equal(numberBefore(prd, /商品\s*(\d+)\s*件/), PRODUCTS.length, '商品数量不一致')
    assert.equal(numberBefore(prd, /示例帖\s*(\d+)\s*条/), SEED_POSTS.length, '示例帖数量不一致')
    assert.ok(SEED_COMMENTS.length > 0)
  })

  it('PRD 不再出现已废弃的入口描述', async () => {
    const prd = await readFile(prdPath, 'utf8')
    assert.equal(prd.includes('首页记录弹层'), false, '第 4 节仍写着「首页记录弹层」，与 5.8 的 6 项定义冲突')
    // 「我的荷兰猪」的正确入口是账户页与猪猪档案页
    assert.ok(prd.includes('账户页、猪猪档案页'))
  })

  it('PRD 5.8 快速记录弹层的 6 个入口路由都已在 App.tsx 中定义', async () => {
    const prd = await readFile(prdPath, 'utf8')
    const app = await readFile(appPath, 'utf8')
    const expected = [
      '/record/birth',
      '/record/weight',
      '/album',
      '/record/health',
      '/record/diary',
      '/record/todo',
    ]
    for (const route of expected) {
      assert.ok(prd.includes(`\`${route}\``), `PRD 5.8 未声明入口路由 ${route}`)
      assert.ok(app.includes(`path="${route}"`), `PRD 5.8 声明的路由 ${route} 未在 src/App.tsx 中定义`)
    }
  })

  it('PRD 声明的页面路由都已在 App.tsx 中定义', async () => {
    const app = await readFile(appPath, 'utf8')
    const declared = [
      '/login',
      '/',
      '/guide',
      '/guide/c/:catId',
      '/guide/a/:id',
      '/forum',
      '/forum/new',
      '/forum/p/:id',
      '/shop',
      '/shop/p/:id',
      '/shop/cart',
      '/shop/orders',
      '/pets',
      '/pets/:id',
      '/pets/edit/:id',
      '/record/weight',
      '/record/birth',
      '/record/health',
      '/record/diary',
      '/record/todo',
      '/album',
      '/account',
    ]
    for (const route of declared) {
      assert.ok(app.includes(`path="${route}"`), `缺少路由 ${route}`)
    }
  })

  it('源码中不再出现旧命名「猪猪日记」（验收 E4）', async () => {
    const hits: string[] = []
    async function walk(dir: string) {
      for (const entry of await readdir(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          await walk(full)
        } else if (/\.(ts|tsx|css|html)$/.test(entry.name)) {
          const text = await readFile(full, 'utf8')
          text.split('\n').forEach((line, i) => {
            if (line.includes('猪猪日记')) hits.push(`${path.relative(root, full)}:${i + 1}`)
          })
        }
      }
    }
    await walk(path.join(root, 'src'))
    assert.deepEqual(hits, [], `源码中仍有「猪猪日记」残留：\n${hits.join('\n')}`)
  })

  it('PRD 承诺的合规底线在智能问疾文案中落实（附录 C）', async () => {
    const prd = await readFile(prdPath, 'utf8')
    assert.ok(prd.includes('仅供参考，不能替代兽医诊断'))
    const source = await readFile(path.join(root, 'src/components/SmartDiagnose.tsx'), 'utf8')
    assert.ok(
      source.includes('不能替代兽医诊断'),
      '智能问疾弹窗缺少「不能替代兽医诊断」的合规声明',
    )
  })
})
