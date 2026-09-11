import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  BREEDS,
  GUIDE_ARTICLES,
  GUIDE_CATEGORIES,
  POST_TOPICS,
  PRODUCTS,
  PRODUCT_CATEGORIES,
  SEED_COMMENTS,
  SEED_POSTS,
  SLIDES,
  articlesOfCategory,
} from '../src/data/seed'

/**
 * 阶段0 · 基线核对
 * 对应 PRD 3.3 / 3.4 / 3.5 / 3.6，以及验收 G1
 */
describe('阶段0 内置静态内容基线', () => {
  it('测试环境自检：jsdom 与 IndexedDB 均可用', () => {
    assert.equal(typeof document, 'object')
    assert.equal(typeof globalThis.indexedDB, 'object')
    assert.equal(typeof globalThis.window, 'object')
  })

  it('饲养指南为 6 个分类、17 篇文章', () => {
    assert.equal(GUIDE_CATEGORIES.length, 6)
    assert.equal(GUIDE_ARTICLES.length, 17)
    assert.deepEqual(
      GUIDE_CATEGORIES.map((c) => c.id),
      ['start', 'food', 'house', 'care', 'social', 'breeding'],
    )
  })

  it('每个分类下都有文章，且文章字段完整、分类 id 合法', () => {
    const ids = new Set(GUIDE_CATEGORIES.map((c) => c.id))
    for (const c of GUIDE_CATEGORIES) {
      assert.ok(articlesOfCategory(c.id).length > 0, `分类 ${c.id} 没有文章`)
    }
    for (const a of GUIDE_ARTICLES) {
      assert.ok(ids.has(a.categoryId), `文章 ${a.id} 的分类不存在`)
      assert.ok(a.content.length > 0, `文章 ${a.id} 正文为空`)
      assert.ok(a.tags.length > 0, `文章 ${a.id} 缺少标签`)
      assert.ok(a.summary.length > 0, `文章 ${a.id} 缺少摘要`)
    }
  })

  it('商城为 13 件商品、5 个分类，商品字段完整', () => {
    assert.equal(PRODUCTS.length, 13)
    assert.equal(PRODUCT_CATEGORIES.length, 5)
    const used = new Set(PRODUCTS.map((p) => p.category))
    assert.equal(used.size, 5)
    for (const c of used) {
      assert.ok(PRODUCT_CATEGORIES.includes(c), `商品分类 ${c} 未在分类表中`)
    }
    for (const p of PRODUCTS) {
      assert.match(p.id, /^pr\d+$/)
      assert.ok(p.price > 0, `${p.id} 价格异常`)
      assert.ok(p.specs.length > 0, `${p.id} 缺少规格`)
      assert.ok(p.image.startsWith('data:image/svg+xml'), `${p.id} 图片不是本地占位图`)
    }
  })

  it('首页轮播为 4 张，目标同时覆盖 guide / forum / shop 且指向真实内容', () => {
    assert.equal(SLIDES.length, 4)
    assert.deepEqual(
      [...new Set(SLIDES.map((s) => s.target))].sort(),
      ['forum', 'guide', 'shop'],
    )
    const guideIds = new Set(GUIDE_ARTICLES.map((a) => a.id))
    const postIds = new Set(SEED_POSTS.map((p) => p.id))
    const productIds = new Set(PRODUCTS.map((p) => p.id))
    for (const s of SLIDES) {
      assert.ok(s.targetId, `轮播 ${s.id} 缺少 targetId`)
      if (s.target === 'guide') assert.ok(guideIds.has(s.targetId as string), `轮播 ${s.id} 指向的文章不存在`)
      if (s.target === 'forum') assert.ok(postIds.has(s.targetId as string), `轮播 ${s.id} 指向的帖子不存在`)
      if (s.target === 'shop') assert.ok(productIds.has(s.targetId as string), `轮播 ${s.id} 指向的商品不存在`)
    }
  })

  it('论坛示例帖为 8 条，回复都落在存在的帖子上', () => {
    assert.equal(SEED_POSTS.length, 8)
    const postIds = new Set(SEED_POSTS.map((p) => p.id))
    assert.ok(SEED_COMMENTS.length > 0)
    for (const c of SEED_COMMENTS) {
      assert.ok(postIds.has(c.postId), `回复 ${c.id} 指向的帖子不存在`)
    }
    for (const p of SEED_POSTS) {
      assert.equal(p.userId, null, '示例帖的 userId 应为 null')
      assert.ok(p.likes > 0)
      assert.ok(POST_TOPICS.includes(p.topic), `帖子 ${p.id} 的话题不在话题表中`)
    }
  })

  it('品种选项非空且无重复', () => {
    assert.ok(BREEDS.length > 0)
    assert.equal(new Set(BREEDS).size, BREEDS.length)
  })
})
