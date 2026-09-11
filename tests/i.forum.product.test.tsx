import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import { cleanup, fireEvent } from '@testing-library/react'
import { data, newId } from '../src/data/repo'
import { POST_TOPICS, PRODUCTS } from '../src/data/seed'
import type { Order, Post, User } from '../src/types'
import { must, renderApp, resetStore, seedPet, seedUser, until, waitForText } from './harness/app'

/**
 * 新增功能 1 · 论坛引用已购商品
 * - 只有"自己在商城买到的商品"可以被引用
 * - 帖子与回复里都能引用，评论区的其他用户都能看见
 * - 点击商品卡直达商城商品详情
 */

function btn(root: ParentNode, text: string): HTMLElement {
  const found = [...root.querySelectorAll('button')].find((b) =>
    (b.textContent ?? '').includes(text),
  )
  assert.ok(found, `未找到按钮「${text}」`)
  return found as HTMLElement
}

function product(id: string) {
  const found = PRODUCTS.find((p) => p.id === id)
  assert.ok(found, `种子商品 ${id} 应存在`)
  return found
}

/** 造一条订单，模拟"用户已经在商城买到这些商品" */
async function seedOrder(userId: string, productIds: string[]): Promise<void> {
  const items = productIds.map((id) => {
    const p = product(id)
    return { productId: p.id, name: p.name, price: p.price, qty: 1, image: p.image }
  })
  const order: Order = {
    id: newId('o'),
    userId,
    items,
    total: items.reduce((sum, i) => sum + i.price * i.qty, 0),
    status: '待收货',
    address: '本机默认地址',
    createdAt: Date.now(),
  }
  await data.saveOrder(order)
}

async function seedOwnPost(user: User, patch: Partial<Post> = {}): Promise<Post> {
  const post: Post = {
    id: newId('p'),
    userId: user.id,
    authorName: user.nickname,
    authorAvatar: '',
    content: '聊聊我最近买的草',
    images: [],
    topic: POST_TOPICS[0],
    likes: 0,
    liked: false,
    createdAt: Date.now(),
    ...patch,
  }
  await data.savePost(post)
  return post
}

/** 发帖页里"可引用的商品"选项（只应包含买过的商品） */
function pickerChips(root: ParentNode): HTMLButtonElement[] {
  return [...root.querySelectorAll('button[aria-label^="引用商品 "]')] as HTMLButtonElement[]
}

describe('新增功能1 · 论坛引用已购商品', () => {
  let user: User

  beforeEach(async () => {
    cleanup()
    await resetStore()
    user = await seedUser()
    await seedPet(user.id)
  })

  it('发帖页只把"买过的商品"列为可引用项', async () => {
    const bought = product('pr1')
    const alsoBought = product('pr9') // 随便再挑一件，确保不是只显示第一个
    const notBought = product('pr2')
    await seedOrder(user.id, [bought.id, alsoBought.id])

    const view = await renderApp('/forum/new')
    await waitForText(view.container, '引用已购商品（可选）')
    await until(() => pickerChips(view.container).length === 2, '已购商品选项就绪')

    const labels = pickerChips(view.container).map((b) => b.getAttribute('aria-label'))
    assert.deepEqual(labels, [`引用商品 ${bought.name}`, `引用商品 ${alsoBought.name}`])
    assert.equal(
      labels.some((l) => (l ?? '').includes(notBought.name)),
      false,
      '没买过的商品不应出现在可引用列表里',
    )
    // 「不引用」是默认项
    assert.ok(btn(view.container, '不引用'))
  })

  it('没有购买记录时给出提示，并且没有可引用的商品', async () => {
    const view = await renderApp('/forum/new')
    await waitForText(view.container, '还没有购买记录，去商城下单后就能在帖子里引用商品链接啦')
    assert.equal(pickerChips(view.container).length, 0, '未购买时不应有可引用项')
  })

  it('发帖引用已购商品：列表与详情都显示商品链接，点击进入商品详情', async () => {
    const bought = product('pr3')
    await seedOrder(user.id, [bought.id])

    const view = await renderApp('/forum/new')
    await waitForText(view.container, '引用已购商品（可选）')
    fireEvent.change(must<HTMLTextAreaElement>(view.container, 'textarea'), {
      target: { value: '这款草我家猪猪超爱吃，推荐给大家' },
    })
    await until(() => pickerChips(view.container).length === 1, '已购商品选项就绪')
    fireEvent.click(pickerChips(view.container)[0])
    await waitForText(view.container, bought.name)

    fireEvent.click(btn(view.container, '发布'))
    await waitForText(view.container, '发布成功 🎉')

    const first = must(view.container, '.post-card')
    const ref = must(first, '.product-ref')
    assert.ok(
      (ref.textContent ?? '').includes(bought.name),
      '列表卡片里应能看到被引用的商品',
    )

    const saved = (await data.listPosts()).find((p) => p.content.includes('这款草我家猪猪超爱吃'))
    assert.ok(saved, '帖子应已保存')
    assert.equal(saved.productId, bought.id, '帖子应保存被引用的商品 id')

    // 点商品链接 → 进入商城商品详情
    fireEvent.click(ref)
    await waitForText(view.container, '商品')
    await waitForText(view.container, bought.name)
    await waitForText(view.container, '加入购物车')
  })

  it('回复引用已购商品：评论区的其他用户都能看到并跳转商城', async () => {
    const bought = product('pr5')
    await seedOrder(user.id, [bought.id])
    const post = await seedOwnPost(user)

    const view = await renderApp(`/forum/p/${post.id}`)
    await waitForText(view.container, post.content)

    // 打开引用商品面板
    fireEvent.click(must(view.container, 'button[aria-label="引用已购商品"]'))
    await waitForText(view.container, '只能引用自己在商城买到的商品')
    fireEvent.click(pickerChips(view.container)[0])
    await waitForText(view.container, `引用商品：${bought.name}`)

    fireEvent.change(must<HTMLInputElement>(view.container, '.comment-bar__input'), {
      target: { value: '同款！确实好用' },
    })
    fireEvent.click(btn(view.container, '发送'))
    await waitForText(view.container, '回复成功 💬')
    await waitForText(view.container, '同款！确实好用')

    const comment = must(view.container, '.comment')
    const ref = must(comment, '.product-ref')
    assert.ok((ref.textContent ?? '').includes(bought.name), '回复下方应显示商品链接')

    const savedComment = (await data.listComments(post.id)).find(
      (c) => c.content === '同款！确实好用',
    )
    assert.ok(savedComment, '回复应已保存')
    assert.equal(savedComment.productId, bought.id, '回复应保存被引用的商品 id')

    fireEvent.click(ref)
    await waitForText(view.container, '加入购物车')
    await waitForText(view.container, bought.name)
  })
})
