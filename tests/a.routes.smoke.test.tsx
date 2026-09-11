import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import { cleanup } from '@testing-library/react'
import { GUIDE_ARTICLES, PRODUCTS, SEED_POSTS, articlesOfCategory } from '../src/data/seed'
import type { Pet, User } from '../src/types'
import { renderApp, resetStore, seedPet, seedUser, waitForText } from './harness/app'

/**
 * 阶段2 · 批次A（纯净态）路由冒烟
 * 目的：19 个受保护路由逐个挂载，确保都能渲染出来、不崩、不错误跳转
 * 对应验收 A1 / A2 与 PRD 2.1 / 2.2
 */

const HOME_MARK = '你好，qa 🐹'

describe('阶段2 批次A · 路由冒烟', () => {
  let user: User
  let pet: Pet

  beforeEach(async () => {
    await resetStore()
    user = await seedUser()
    pet = await seedPet(user.id)
  })

  async function smoke(path: string, marker?: string, allowHome = false): Promise<void> {
    const view = await renderApp(path)
    const text = view.container.textContent ?? ''
    assert.ok(text.length > 15, `路由 ${path} 渲染内容过少：${text}`)
    assert.equal(text.includes('记住账号密码'), false, `路由 ${path} 被错误地重定向到登录页`)
    if (path !== '/' && !allowHome) {
      assert.equal(text.includes(HOME_MARK), false, `路由 ${path} 落到了首页（可能路由未匹配）`)
    }
    if (marker) {
      assert.ok(text.includes(marker), `路由 ${path} 缺少关键内容「${marker}」`)
    }
    view.unmount()
    cleanup()
  }

  it('主标签页路由都能渲染（验收 A1）', async () => {
    await smoke('/', HOME_MARK)
    await smoke('/guide')
    await smoke('/forum')
    await smoke('/shop')
    await smoke('/pets', pet.name)
    await smoke('/account')
  })

  it('详情与表单类路由都能渲染（验收 A1）', async () => {
    await smoke(`/guide/c/${articlesOfCategory('start')[0].categoryId}`, articlesOfCategory('start')[0].title)
    await smoke(`/guide/a/${GUIDE_ARTICLES[0].id}`, GUIDE_ARTICLES[0].title)
    await smoke('/forum/new')
    await smoke(`/forum/p/${SEED_POSTS[0].id}`, '回复')
    await smoke(`/shop/p/${PRODUCTS[0].id}`, PRODUCTS[0].name)
    await smoke('/shop/cart')
    await smoke('/shop/orders', '我的订单')
    await smoke('/album')
    await smoke(`/pets/edit/${pet.id}`)
    await smoke(`/pets/${pet.id}`, pet.name)
  })

  it('记录类路由都能渲染（验收 A1）', async () => {
    await smoke('/record/weight', '体重记录')
    await smoke('/record/birth', '生日 / 生产')
    await smoke('/record/health', '健康打卡')
    await smoke('/record/diary', '饲养日记')
    await smoke('/record/todo', '待办提醒')
  })

  it('未知路径回退到首页（PRD 2.1 兜底路由）', async () => {
    await smoke('/this/path/does/not/exist', HOME_MARK, true)
  })

  it('没有猪猪档案时，6 个记录页都显示建档引导空态（验收 F1）', async () => {
    await resetStore()
    await seedUser()
    for (const path of [
      '/record/weight',
      '/record/birth',
      '/record/health',
      '/record/diary',
      '/record/todo',
      '/album',
    ]) {
      const view = await renderApp(path)
      await waitForText(view.container, '还没有添加荷兰猪，先建个档案吧')
      view.unmount()
      cleanup()
    }
  })

  it('没有猪猪档案时，我的荷兰猪页提供建档入口（验收 F1）', async () => {
    await resetStore()
    await seedUser()
    const view = await renderApp('/pets')
    await waitForText(view.container, '还没有荷兰猪，先建个档案吧')
    assert.ok(view.container.textContent?.includes('添加我的第一只猪'))
  })
})
