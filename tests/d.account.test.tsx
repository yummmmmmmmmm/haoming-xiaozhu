import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import { cleanup, fireEvent } from '@testing-library/react'
import { data, newId, today } from '../src/data/repo'
import { PRODUCTS } from '../src/data/seed'
import type { Photo, WeightRecord } from '../src/types'
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
 * 阶段2 · 批次D 账户页
 * 对应验收 D1–D7 与 PRD 3.7
 */

const FOLLOWING = 4 // Node.DOCUMENT_POSITION_FOLLOWING

function btn(root: ParentNode, text: string): HTMLElement {
  const el = [...root.querySelectorAll('button')].find((b) =>
    (b.textContent ?? '').includes(text),
  )
  assert.ok(el, `未找到按钮「${text}」`)
  return el as HTMLElement
}

function sectionByTitle(root: ParentNode, title: string): Element {
  const section = [...root.querySelectorAll('.section')].find((s) =>
    (s.querySelector('.section-title')?.textContent ?? '').includes(title),
  )
  assert.ok(section, `未找到区块「${title}」`)
  return section
}

function statValue(root: ParentNode, label: string): string | undefined {
  const stat = [...root.querySelectorAll('.stat')].find(
    (s) => (s.querySelector('.stat__label')?.textContent ?? '') === label,
  )
  return stat?.querySelector('.stat__num')?.textContent ?? undefined
}

function makeImageFile(name: string): File {
  return new File([new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])], name, { type: 'image/png' })
}

/** jsdom 里给 file input 塞文件的标准做法 */
function uploadFiles(input: HTMLInputElement, files: File[]): void {
  Object.defineProperty(input, 'files', { value: files, configurable: true })
  fireEvent.change(input)
}

async function seedPhoto(userId: string, petId: string): Promise<Photo> {
  const photo: Photo = {
    id: newId('ph'),
    userId,
    petId,
    dataUrl: 'data:image/png;base64,AAAA',
    caption: '猪猪照片',
    date: today(),
    createdAt: Date.now(),
  }
  await data.savePhoto(photo)
  return photo
}

async function seedWeight(userId: string, petId: string): Promise<WeightRecord> {
  const record: WeightRecord = {
    id: newId('w'),
    userId,
    petId,
    date: today(),
    weight: 720,
    note: '',
    createdAt: Date.now(),
  }
  await data.saveWeight(record)
  return record
}

describe('阶段2 批次D · 账户页', () => {
  beforeEach(async () => {
    await resetStore()
  })

  it('区块顺序为：资料卡 → 四统计 → 我的荷兰猪 → 个人相册 → 我的购买 → 设置 → 退出登录（验收 D1）', async () => {
    const user = await seedUser()
    await seedPet(user.id)
    const view = await renderApp('/account')
    await waitForText(view.container, '管理全部档案')

    const chain: [string, Element][] = [
      ['资料卡', must(view.container, '.avatar--lg')],
      ['四统计', must(view.container, '.hero-stats')],
      ['我的荷兰猪', sectionByTitle(view.container, '我的荷兰猪')],
      ['个人相册', sectionByTitle(view.container, '个人相册')],
      ['我的购买', sectionByTitle(view.container, '我的购买')],
      ['设置', sectionByTitle(view.container, '设置')],
      ['退出登录', btn(view.container, '退出登录')],
    ]
    for (let i = 1; i < chain.length; i += 1) {
      assert.ok(
        chain[i - 1][1].compareDocumentPosition(chain[i][1]) & FOLLOWING,
        `${chain[i - 1][0]} 应该排在 ${chain[i][0]} 之前`,
      )
    }
  })

  it('账户页不存在「我的发帖」区块或入口（验收 D2）', async () => {
    const user = await seedUser()
    await seedPet(user.id)
    const view = await renderApp('/account')
    await waitForText(view.container, '管理全部档案')
    assert.equal((view.container.textContent ?? '').includes('我的发帖'), false)
    assert.equal(
      [...view.container.querySelectorAll('button, .row')].some((e) =>
        (e.textContent ?? '').includes('我的发帖'),
      ),
      false,
    )
  })

  it('四个统计依次为 荷兰猪 / 饲养日记 / 相册照片 / 健康打卡（验收 D3）', async () => {
    const user = await seedUser()
    await seedPet(user.id)
    const view = await renderApp('/account')
    await waitForText(view.container, '管理全部档案')
    const labels = [...view.container.querySelectorAll('.hero-stats .stat__label')].map(
      (e) => e.textContent,
    )
    assert.deepEqual(labels, ['荷兰猪', '饲养日记', '相册照片', '健康打卡'])
  })

  it('相册没有照片时显示空态「相册还是空的…」（验收 D4）', async () => {
    const user = await seedUser()
    await seedPet(user.id)
    const view = await renderApp('/account')
    await waitForText(view.container, '相册还是空的，上传猪猪照片就会出现在这里')
    assert.equal(statValue(view.container, '相册照片'), '0')
    assert.equal(sectionByTitle(view.container, '个人相册').querySelectorAll('img').length, 0)
  })

  it('上传 1 张相册照片后，账户页数字 +1 且出现在九宫格（验收 D5）', async () => {
    const user = await seedUser()
    await seedPet(user.id)

    const album = await renderApp('/album')
    await waitForText(album.container, '＋ 添加照片')
    uploadFiles(must<HTMLInputElement>(album.container, 'input[type="file"]'), [
      makeImageFile('pig-1.png'),
    ])
    await waitForText(album.container, '已添加 1 张照片 🖼️')
    assert.equal(await data.listPhotos(user.id).then((p) => p.length), 1)
    album.unmount()
    cleanup()

    const view = await renderApp('/account')
    await until(() => statValue(view.container, '相册照片') === '1', '账户页相册统计更新为 1')
    await waitForText(view.container, '个人相册（1）')
    const grid = sectionByTitle(view.container, '个人相册').querySelector('.grid-3')
    assert.ok(grid, '应有个人相册九宫格')
    assert.equal(grid.querySelectorAll('img').length, 1, '九宫格应出现这张照片')
  })

  it('发一条带图的帖子后，帖子配图也出现在个人相册（验收 D6）', async () => {
    const user = await seedUser()
    await seedPet(user.id)

    const post = await renderApp('/forum/new')
    fireEvent.change(must<HTMLTextAreaElement>(post.container, 'textarea'), {
      target: { value: '我家猪猪今天超可爱' },
    })
    uploadFiles(must<HTMLInputElement>(post.container, 'input[type="file"]'), [
      makeImageFile('post-1.png'),
    ])
    await until(
      () => post.container.querySelectorAll('.grid-3 img').length === 1,
      '帖子配图已就绪',
    )
    fireEvent.click(btn(post.container, '发布'))
    await waitForText(post.container, '发布成功 🎉')
    post.unmount()
    cleanup()

    const view = await renderApp('/account')
    await until(() => statValue(view.container, '相册照片') === '1', '帖子配图应计入相册照片')
    const grid = sectionByTitle(view.container, '个人相册').querySelector('.grid-3')
    assert.ok(grid, '帖子配图应进入个人相册九宫格')
    assert.equal(grid.querySelectorAll('img').length, 1)
  })

  it('重置本机数据：确认后回到登录页，数据全部清空（验收 D7）', async () => {
    const user = await seedUser()
    const pet = await seedPet(user.id)
    await seedWeight(user.id, pet.id)
    await seedPhoto(user.id, pet.id)
    await data.saveCartItem({ id: newId('c'), userId: user.id, productId: PRODUCTS[0].id, qty: 2 })
    await data.saveOrder({
      id: newId('o'),
      userId: user.id,
      items: [
        {
          productId: PRODUCTS[0].id,
          name: PRODUCTS[0].name,
          price: PRODUCTS[0].price,
          qty: 1,
          image: PRODUCTS[0].image,
        },
      ],
      total: PRODUCTS[0].price,
      status: '已完成',
      address: '',
      createdAt: Date.now(),
    })

    const view = await renderApp('/account')
    await until(() => statValue(view.container, '相册照片') === '1', '账户页数据加载完成')

    const resetRow = [...view.container.querySelectorAll('.row')].find((r) =>
      (r.textContent ?? '').includes('重置本机数据'),
    )
    assert.ok(resetRow, '应存在「重置本机数据」入口')
    fireEvent.click(resetRow)
    await until(() => view.container.querySelector('.modal') !== null, '重置确认弹窗打开')
    fireEvent.click(btn(view.container, '确认重置'))

    await waitForText(view.container, '本机数据已重置')
    await waitForText(view.container, '记住账号密码')
    assert.equal((await data.listUsers()).length, 0, '账号也应被清空')

    // 论坛示例内容按 PRD 保留
    assert.ok((await data.listPosts()).length > 0, '论坛示例内容应保留')
  })

  it('重置后重新注册，档案 / 记录 / 照片 / 订单都为 0（验收 D7 续）', async () => {
    const user = await seedUser()
    const pet = await seedPet(user.id)
    await seedWeight(user.id, pet.id)
    await seedPhoto(user.id, pet.id)

    const view = await renderApp('/account')
    await until(() => statValue(view.container, '相册照片') === '1', '账户页数据加载完成')
    fireEvent.click(
      [...view.container.querySelectorAll('.row')].find((r) =>
        (r.textContent ?? '').includes('重置本机数据'),
      )!,
    )
    await until(() => view.container.querySelector('.modal') !== null, '重置确认弹窗打开')
    fireEvent.click(btn(view.container, '确认重置'))
    await waitForText(view.container, '记住账号密码')

    // 重新注册一个新账号
    const registerLink = [...view.container.querySelectorAll('b')].find((b) =>
      (b.textContent ?? '').includes('注册一个'),
    )
    assert.ok(registerLink, '应能切换到注册')
    fireEvent.click(registerLink)
    fireEvent.change(must<HTMLInputElement>(view.container, 'input[placeholder="用户名就是你在论坛的昵称"]'), {
      target: { value: 'newbie' },
    })
    fireEvent.change(must<HTMLInputElement>(view.container, 'input[placeholder="至少 4 位"]'), {
      target: { value: 'abcd1234' },
    })
    fireEvent.click(btn(view.container, '注册并进入'))
    await waitForText(view.container, '你好，newbie 🐹')

    view.unmount()
    cleanup()
    const fresh = await renderApp('/account', { username: 'newbie', password: 'abcd1234' })
    await until(() => statValue(fresh.container, '相册照片') === '0', '新账号相册为 0')
    assert.equal(statValue(fresh.container, '荷兰猪'), '0')
    assert.equal(statValue(fresh.container, '饲养日记'), '0')
    assert.equal(statValue(fresh.container, '健康打卡'), '0')
    await waitForText(fresh.container, '还没有添加，点这里创建第一个档案')
    await waitForText(fresh.container, '相册还是空的')
    const ordersCard = [...fresh.container.querySelectorAll('.grid-2 .card')].find((c) =>
      (c.textContent ?? '').includes('历史订单'),
    )
    assert.ok(ordersCard)
    assert.equal(ordersCard.querySelector('.stat__num')?.textContent, '0')
  })
})
