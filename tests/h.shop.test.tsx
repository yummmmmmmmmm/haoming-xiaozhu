import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import { cleanup, fireEvent } from '@testing-library/react'
import { data, newId } from '../src/data/repo'
import { PRODUCTS, PRODUCT_CATEGORIES } from '../src/data/seed'
import type { CartItem, User } from '../src/types'
import {
  must,
  renderApp,
  resetStore,
  seedPet,
  seedUser,
  until,
  waitForText,
} from './harness/app'

/**
 * 阶段2 · 批次H 商城
 * 对应验收 H1–H7 与 PRD 3.6
 */

function btn(root: ParentNode, text: string): HTMLElement {
  const found = [...root.querySelectorAll('button')].find((b) =>
    (b.textContent ?? '').includes(text),
  )
  assert.ok(found, `未找到按钮「${text}」`)
  return found as HTMLElement
}

function modalBtn(root: ParentNode, text: string): HTMLElement {
  const found = [...root.querySelectorAll('.modal button')].find((b) =>
    (b.textContent ?? '').includes(text),
  )
  assert.ok(found, `未找到弹窗按钮「${text}」`)
  return found as HTMLElement
}

function names(root: ParentNode): string[] {
  return [...root.querySelectorAll('.product-card__name')].map((e) => e.textContent ?? '')
}

async function seedCart(user: User, productId: string, qty: number): Promise<CartItem> {
  const item: CartItem = { id: newId('c'), userId: user.id, productId, qty }
  await data.saveCartItem(item)
  return item
}

describe('阶段2 批次H · 商城', () => {
  let user: User

  beforeEach(async () => {
    await resetStore()
    user = await seedUser()
    await seedPet(user.id)
  })

  it('商城切换分类「笼具用品」只显示该分类商品（验收 H1）', async () => {
    assert.ok(
      PRODUCT_CATEGORIES.includes('笼具用品'),
      'PRD 5.2 约定的分类应存在',
    )
    const view = await renderApp('/shop')
    await until(() => names(view.container).length > 0, '商城列表加载完成')
    assert.equal(names(view.container).length, PRODUCTS.length)

    fireEvent.click(btn(view.container, '笼具用品'))
    const expect = PRODUCTS.filter((p) => p.category === '笼具用品').map((p) => p.name)
    await until(() => names(view.container).length === expect.length, '筛选结果数量正确')
    assert.deepEqual(names(view.container), expect)
    assert.equal(view.container.querySelector('.chip--on')?.textContent, '笼具用品')
  })

  it('商品详情点「加入购物车」有提示，商城角标 +1（验收 H2）', async () => {
    const product = PRODUCTS[0]
    const view = await renderApp(`/shop/p/${product.id}`)
    await waitForText(view.container, product.name)

    fireEvent.click(btn(view.container, '加入购物车'))
    await waitForText(view.container, '已加入购物车 🛒')

    const cart = await data.listCart(user.id)
    assert.equal(cart.length, 1)
    assert.equal(cart[0].qty, 1)

    view.unmount()
    cleanup()
    const shop = await renderApp('/shop')
    await until(
      () => shop.container.querySelector('.bottom-nav__badge')?.textContent === '1',
      '底部导航商城角标变为 1',
    )
  })

  it('购物车把数量减到 0 时该条目被移除（验收 H3）', async () => {
    await seedCart(user, PRODUCTS[1].id, 1)
    const view = await renderApp('/shop/cart')
    await waitForText(view.container, PRODUCTS[1].name)

    fireEvent.click(btn(view.container, '－'))
    await waitForText(view.container, '购物车还是空的，去挑点好物吧')
    assert.equal((await data.listCart(user.id)).length, 0)
    assert.equal(view.container.querySelectorAll('.list .row').length, 0)
  })

  it('点「结算」弹出确认下单弹窗，可填收货地址（验收 H4）', async () => {
    await seedCart(user, PRODUCTS[0].id, 2)
    const view = await renderApp('/shop/cart')
    await waitForText(view.container, '结算（模拟下单）')

    fireEvent.click(btn(view.container, '结算'))
    await until(() => view.container.querySelector('.modal') !== null, '下单弹窗打开')
    await waitForText(view.container, '确认下单')
    await waitForText(view.container, '收货地址（选填，仅供记录）')
    assert.ok(
      must<HTMLInputElement>(view.container, '.modal input.input'),
      '应可以填写收货地址',
    )
    await waitForText(
      view.container,
      `共 2 件 · 合计 ¥${(PRODUCTS[0].price * 2).toFixed(2)}`,
    )
  })

  it('确认下单生成订单并跳转订单页，购物车清空，订单信息完整（验收 H5 H6）', async () => {
    const product = PRODUCTS[0]
    await seedCart(user, product.id, 2)
    const view = await renderApp('/shop/cart')
    await waitForText(view.container, '结算（模拟下单）')

    fireEvent.click(btn(view.container, '结算'))
    await until(() => view.container.querySelector('.modal') !== null, '下单弹窗打开')
    fireEvent.change(must<HTMLInputElement>(view.container, '.modal input.input'), {
      target: { value: '上海市徐汇区 xx 路 12 号' },
    })
    fireEvent.click(modalBtn(view.container, '确认下单'))
    await waitForText(view.container, '下单成功（模拟）🎉')

    // 已跳转订单页
    await waitForText(view.container, '我的订单')
    assert.equal((await data.listCart(user.id)).length, 0, '购物车应清空')

    const orders = await data.listOrders(user.id)
    assert.equal(orders.length, 1)
    const order = orders[0]
    // H6：订单号后 8 位、时间、商品明细、合计、状态、地址
    await waitForText(view.container, `订单号 ${order.id.slice(-8).toUpperCase()}`)
    assert.ok(view.container.textContent?.includes(product.name), '应显示商品明细')
    assert.ok(
      view.container.textContent?.includes(`¥${product.price.toFixed(1)} × 2`),
      '应显示单价与数量',
    )
    assert.ok(
      view.container.textContent?.includes(`¥${(product.price * 2).toFixed(2)}`),
      '应显示合计',
    )
    await waitForText(view.container, '已下单')
    await waitForText(view.container, '收货：上海市徐汇区 xx 路 12 号')
    assert.ok(view.container.querySelector('.row__thumb'), '应显示商品缩略图')
    assert.ok(
      (view.container.textContent ?? '').length > 40,
      '应同时显示下单时间等信息',
    )
  })

  it('地址留空下单时地址显示为「本机演示订单（未填写收货地址）」（验收 H7）', async () => {
    await seedCart(user, PRODUCTS[1].id, 1)
    const view = await renderApp('/shop/cart')
    await waitForText(view.container, '结算（模拟下单）')

    fireEvent.click(btn(view.container, '结算'))
    await until(() => view.container.querySelector('.modal') !== null, '下单弹窗打开')
    fireEvent.click(modalBtn(view.container, '确认下单'))
    await waitForText(view.container, '下单成功（模拟）🎉')

    await waitForText(view.container, '收货：本机演示订单（未填写收货地址）')
    const orders = await data.listOrders(user.id)
    assert.equal(orders[0].address, '本机演示订单（未填写收货地址）')
    assert.equal(orders[0].status, '已下单')
  })
})
