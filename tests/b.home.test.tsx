import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import { cleanup, fireEvent } from '@testing-library/react'
import {
  GUIDE_ARTICLES,
  GUIDE_CATEGORIES,
  PRODUCTS,
  SLIDES,
  articlesOfCategory,
} from '../src/data/seed'
import { must, renderApp, resetStore, seedPet, seedUser, waitForText } from './harness/app'

/**
 * 阶段2 · 批次B 首页
 * 对应验收 B1–B8 与 PRD 2.2 / 3.2
 */

/** 模拟内容区左右滑动 */
function swipe(el: Element, fromX: number, toX: number) {
  fireEvent.touchStart(el, { touches: [{ clientX: fromX }] })
  fireEvent.touchEnd(el, { changedTouches: [{ clientX: toX }] })
}

function contentArea(view: { container: HTMLElement }): Element {
  const seg = must(view.container, '.segmented')
  const next = seg.nextElementSibling
  assert.ok(next, '未找到可滑动的内容区')
  return next
}

describe('阶段2 批次B · 首页', () => {
  beforeEach(async () => {
    await resetStore()
    const user = await seedUser()
    await seedPet(user.id)
  })

  it('点击轮播会跳到对应指南文章 / 帖子 / 商品详情（验收 B1）', async () => {
    assert.equal(SLIDES.length, 4)
    for (let i = 0; i < SLIDES.length; i += 1) {
      const slide = SLIDES[i]
      const view = await renderApp('/')
      const node = view.container.querySelectorAll('.carousel__slide')[i]
      assert.ok(node, `轮播第 ${i + 1} 张不存在`)
      fireEvent.click(node)

      if (slide.target === 'guide') {
        const article = GUIDE_ARTICLES.find((a) => a.id === slide.targetId)
        assert.ok(article, `轮播 ${slide.id} 指向的指南文章不存在`)
        await waitForText(view.container, article.title)
      } else if (slide.target === 'shop') {
        const product = PRODUCTS.find((p) => p.id === slide.targetId)
        assert.ok(product, `轮播 ${slide.id} 指向的商品不存在`)
        await waitForText(view.container, product.name)
      } else {
        await waitForText(view.container, '💬 回复（')
      }
      view.unmount()
      cleanup()
    }
  })

  it('点「论坛分享」「商城购买」按钮切换内容区（验收 B2）', async () => {
    const view = await renderApp('/')
    await waitForText(view.container, '📖 分类指南')

    const tabButton = (label: string) => {
      const btn = [...view.container.querySelectorAll('.segmented__item')].find((b) =>
        (b.textContent ?? '').includes(label),
      )
      assert.ok(btn, `未找到切换按钮「${label}」`)
      return btn
    }

    fireEvent.click(tabButton('论坛分享'))
    await waitForText(view.container, '💬 大家在聊')

    fireEvent.click(tabButton('商城购买'))
    await waitForText(view.container, '🛒 好物推荐')

    fireEvent.click(tabButton('饲养指南'))
    await waitForText(view.container, '📖 分类指南')
  })

  it('内容区左右滑动可在三个 tab 之间切换（验收 B3）', async () => {
    const view = await renderApp('/')
    await waitForText(view.container, '📖 分类指南')
    const area = contentArea(view)

    // 向左滑：指南 → 论坛 → 商城
    swipe(area, 300, 100)
    await waitForText(view.container, '💬 大家在聊')
    swipe(area, 300, 100)
    await waitForText(view.container, '🛒 好物推荐')

    // 已在最后一个，继续左滑不越界
    swipe(area, 300, 100)
    assert.ok(view.container.textContent?.includes('🛒 好物推荐'), '最后一个 tab 不应被滑走')

    // 向右滑：商城 → 论坛 → 指南
    swipe(area, 100, 300)
    await waitForText(view.container, '💬 大家在聊')
    swipe(area, 100, 300)
    await waitForText(view.container, '📖 分类指南')

    // 已在第一个，继续右滑不越界
    swipe(area, 100, 300)
    assert.ok(view.container.textContent?.includes('📖 分类指南'), '第一个 tab 不应被滑走')
  })

  it('指南 tab 显示 6 个分类按钮（验收 B4）', async () => {
    const view = await renderApp('/')
    await waitForText(view.container, '📖 分类指南')
    const buttons = view.container.querySelectorAll('.grid-3 .card')
    assert.equal(buttons.length, 6, '分类按钮数量应为 6')
    const text = view.container.textContent ?? ''
    for (const c of GUIDE_CATEGORIES) {
      assert.ok(text.includes(c.name), `缺少分类「${c.name}」`)
    }
  })

  it('「智能问疾」位于六个分类按钮的正下方（验收 B5）', async () => {
    const view = await renderApp('/')
    await waitForText(view.container, '📖 分类指南')
    const grid = must(view.container, '.grid-3')
    const diagnose = must(view.container, '.cta-big')
    assert.ok(
      grid.compareDocumentPosition(diagnose) & 4, // Node.DOCUMENT_POSITION_FOLLOWING
      '智能问疾必须出现在六个分类按钮之后',
    )
    assert.ok(diagnose.textContent?.includes('智能问疾'))
    // 分类按钮与智能问疾之间不应插入别的内容区
    assert.equal(grid.nextElementSibling, diagnose, '智能问疾应紧跟在分类按钮下方')
  })

  it('点「智能问疾」弹出合规说明（验收 B6）', async () => {
    const view = await renderApp('/')
    await waitForText(view.container, '📖 分类指南')
    fireEvent.click(must(view.container, '.cta-big'))
    await waitForText(view.container, '仅供参考，不能替代兽医诊断')
    const text = view.container.textContent ?? ''
    // 合规红线：必须显著标注免责声明，并明确声明不做确诊 / 开药 / 治疗方案
    assert.ok(
      text.includes('只做「科普 + 症状自查 + 引导就医」'),
      '应声明功能范围仅限科普与自查',
    )
    assert.ok(
      text.includes('不出现确诊、开药、治疗方案等表述'),
      '应明确声明不提供确诊 / 开药 / 治疗方案',
    )
  })

  it('点分类「饮食营养」进入分类页且只列出该分类文章（验收 B7）', async () => {
    const food = GUIDE_CATEGORIES.find((c) => c.id === 'food')
    assert.ok(food)
    assert.equal(food.name, '饮食营养', 'PRD 3.3 约定的分类名称')

    const view = await renderApp('/')
    await waitForText(view.container, '📖 分类指南')
    const button = [...view.container.querySelectorAll('.grid-3 .card')].find((b) =>
      (b.textContent ?? '').includes(food.name),
    )
    assert.ok(button)
    fireEvent.click(button)
    await waitForText(view.container, food.desc)

    const shown = [...view.container.querySelectorAll('.row__title')].map((e) => e.textContent ?? '')
    const expected = articlesOfCategory('food').map((a) => a.title)
    assert.deepEqual(shown, expected, '分类页应且只应列出该分类下的全部文章')
  })

  it('点「新手必看」第一篇文章进入详情，正文小标题正常显示（验收 B8）', async () => {
    const first = GUIDE_ARTICLES[0]
    const headings = first.content.filter((p) => p.startsWith('## '))
    assert.ok(headings.length > 0, `文章 ${first.id} 应包含 ## 小标题`)

    const view = await renderApp('/')
    await waitForText(view.container, '🔥 新手必看')
    const rows = view.container.querySelectorAll('.section .list .row')
    assert.ok(rows.length > 0, '新手必看应有文章')
    fireEvent.click(rows[0])

    await waitForText(view.container, first.title)
    const rendered = [...view.container.querySelectorAll('.article__h')].map(
      (e) => e.textContent ?? '',
    )
    assert.deepEqual(
      rendered,
      headings.map((h) => h.replace('## ', '')),
      '正文小标题应逐个正常渲染',
    )
  })

  it('首页顶部购物车角标随购物车数量显示（PRD 3.2）', async () => {
    const view = await renderApp('/')
    await waitForText(view.container, '📖 分类指南')
    assert.equal(view.container.querySelector('.icon-btn__badge'), null, '购物车为空时不显示角标')
  })
})
