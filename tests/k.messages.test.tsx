import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import { cleanup, fireEvent } from '@testing-library/react'
import { data, newId } from '../src/data/repo'
import { POST_TOPICS, petAvatar } from '../src/data/seed'
import type { MatchPost, Message, Post, User } from '../src/types'
import {
  QA_PASSWORD,
  QA_USERNAME,
  must,
  renderApp,
  resetStore,
  seedUser,
  until,
  waitForText,
} from './harness/app'

/**
 * 新增功能 3 · 账户私信
 * - 账户页有「我的私信」入口与未读角标
 * - 用户之间可以一对一私信
 */

const NEIGHBOR_AVATAR = 'data:image/png;base64,NEIGHBOR_AVATAR'

function rowWithText(root: ParentNode, text: string): HTMLElement {
  const found = [...root.querySelectorAll('.row')].find((r) =>
    (r.textContent ?? '').includes(text),
  )
  assert.ok(found, `未找到包含「${text}」的列表项`)
  return found as HTMLElement
}

function badgeText(root: ParentNode): string {
  return (root.querySelector('.row__badge')?.textContent ?? '').trim()
}

function buttonWithText(root: ParentNode, text: string): HTMLElement {
  const found = [...root.querySelectorAll('button')].find(
    (b) => (b.textContent ?? '').trim() === text,
  )
  assert.ok(found, `未找到按钮「${text}」`)
  return found as HTMLElement
}

/** 轮询异步条件（data 层断言用） */
async function waitForCondition(
  check: () => Promise<boolean>,
  label: string,
  timeout = 5000,
): Promise<void> {
  const deadline = Date.now() + timeout
  for (;;) {
    if (await check()) return
    if (Date.now() > deadline) throw new Error(`等待超时：${label}`)
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
}

async function seedMessage(
  from: User,
  to: User,
  content: string,
  patch: Partial<Message> = {},
): Promise<Message> {
  const message: Message = {
    id: newId('msg'),
    fromUserId: from.id,
    toUserId: to.id,
    content,
    read: false,
    createdAt: Date.now(),
    ...patch,
  }
  await data.saveMessage(message)
  return message
}

describe('新增功能3 · 账户私信', () => {
  beforeEach(async () => {
    cleanup()
    await resetStore()
  })

  it('账户页有「我的私信」入口，收到未读消息时显示未读角标', async () => {
    const me = await seedUser(QA_USERNAME, QA_PASSWORD)
    const neighbor = await seedUser('neighbor', 'pw123456', { nickname: '圆圆妈' })
    await seedMessage(neighbor, me, '嗨，你家猪猪多大了呀？', { read: false })

    const view = await renderApp('/account')
    await waitForText(view.container, '我的私信')
    await until(() => badgeText(view.container) === '1', '未读私信角标出现')
    assert.equal(badgeText(view.container), '1', '未读私信应有角标')
    assert.ok(
      view.container.textContent?.includes('有 1 条未读消息'),
      '入口副标题应提示未读数',
    )
  })

  it('会话列表显示对方昵称、头像、最后一条消息与未读数', async () => {
    const me = await seedUser(QA_USERNAME, QA_PASSWORD)
    const neighbor = await seedUser('neighbor', 'pw123456', {
      nickname: '圆圆妈',
      avatar: NEIGHBOR_AVATAR,
    })
    await seedMessage(neighbor, me, '你家圆圆多大了？', {
      read: false,
      createdAt: Date.now() - 60_000,
    })
    await seedMessage(me, neighbor, '8 个月啦，很健康', {
      read: true,
      createdAt: Date.now() - 30_000,
    })

    const view = await renderApp('/messages')
    await waitForText(view.container, '8 个月啦，很健康')

    const row = must(view.container, '.row') as HTMLElement
    assert.ok((row.textContent ?? '').includes('圆圆妈'), '会话应显示对方昵称')
    assert.equal(
      (must<HTMLImageElement>(row, '.row__thumb')).getAttribute('src'),
      NEIGHBOR_AVATAR,
      '会话应显示对方头像',
    )
    assert.equal(badgeText(row), '1', '应显示未读条数')
    assert.equal(
      (view.container.textContent ?? '').includes('还没有私信'),
      false,
      '有会话时不应出现空状态',
    )
  })

  it('可以发起私信并发送消息，空消息不会被发出', async () => {
    const me = await seedUser(QA_USERNAME, QA_PASSWORD)
    const neighbor = await seedUser('neighbor', 'pw123456', { nickname: '圆圆妈' })

    const view = await renderApp('/messages')
    await waitForText(view.container, '还没有私信')

    fireEvent.click(must(view.container, 'button[aria-label="发起私信"]'))
    await waitForText(view.container, '选择一位猪友开始聊天')
    fireEvent.click(rowWithText(must(view.container, '.sheet'), '圆圆妈'))

    await waitForText(view.container, '还没有聊过，先打个招呼吧')

    // 空消息：给出提示且不落库
    fireEvent.click(buttonWithText(view.container, '发送'))
    await waitForText(view.container, '写点什么再发吧')
    assert.equal((await data.listMessages(me.id)).length, 0, '空消息不应被保存')

    const text = '你好呀，想问问给猪猪找对象的事情～'
    fireEvent.change(must<HTMLInputElement>(view.container, '.comment-bar__input'), {
      target: { value: text },
    })
    fireEvent.click(buttonWithText(view.container, '发送'))
    await waitForText(view.container, '已发送 💬')
    await waitForText(view.container, text)
    assert.ok(view.container.querySelector('.chat__bubble--mine'), '自己发的消息应是右侧气泡')

    const saved = await data.listMessages(me.id)
    assert.equal(saved.length, 1)
    assert.equal(saved[0].fromUserId, me.id)
    assert.equal(saved[0].toUserId, neighbor.id)
    assert.equal(saved[0].content, text)
  })

  it('进入会话后对方的未读消息被标记为已读', async () => {
    const me = await seedUser(QA_USERNAME, QA_PASSWORD)
    const neighbor = await seedUser('neighbor', 'pw123456', { nickname: '圆圆妈' })
    await seedMessage(neighbor, me, '在吗？', { createdAt: Date.now() - 60_000 })
    await seedMessage(neighbor, me, '想和你家的猪猪认识一下', {
      createdAt: Date.now() - 30_000,
    })

    const view = await renderApp('/messages')
    await waitForText(view.container, '想和你家的猪猪认识一下')
    assert.equal(badgeText(view.container), '2', '两条未读应显示 2')

    fireEvent.click(rowWithText(view.container, '圆圆妈'))
    await waitForText(view.container, '私信消息只保存在本机')

    await waitForCondition(
      async () =>
        (await data.listMessages(me.id)).every((m) => m.toUserId !== me.id || m.read),
      '未读私信被标记为已读',
    )
  })

  it('可以在论坛帖子详情里私信作者', async () => {
    await seedUser(QA_USERNAME, QA_PASSWORD)
    const neighbor = await seedUser('neighbor', 'pw123456', {
      nickname: '圆圆妈',
      avatar: NEIGHBOR_AVATAR,
    })
    const post: Post = {
      id: newId('p'),
      userId: neighbor.id,
      authorName: neighbor.nickname,
      authorAvatar: neighbor.avatar,
      content: '求助：荷兰猪不爱吃提摩西怎么办？',
      images: [],
      topic: POST_TOPICS[0],
      likes: 0,
      liked: false,
      createdAt: Date.now(),
    }
    await data.savePost(post)

    const view = await renderApp(`/forum/p/${post.id}`)
    await waitForText(view.container, '求助：荷兰猪不爱吃提摩西怎么办？')
    await waitForText(view.container, '私信作者')

    fireEvent.click(
      [...view.container.querySelectorAll('button')].find((b) =>
        (b.textContent ?? '').includes('私信作者'),
      ) as HTMLElement,
    )
    await waitForText(view.container, '私信消息只保存在本机')
    assert.ok((view.container.textContent ?? '').includes('圆圆妈'), '会话对象应是帖子作者')
  })

  it('可以在本地相猪里私信同城猪友', async () => {
    const me = await seedUser(QA_USERNAME, QA_PASSWORD, { city: '杭州' })
    const neighbor = await seedUser('neighbor', 'pw123456', {
      nickname: '圆圆妈',
      avatar: NEIGHBOR_AVATAR,
      city: '杭州',
    })
    const match: MatchPost = {
      id: newId('m'),
      userId: neighbor.id,
      authorName: neighbor.nickname,
      authorAvatar: neighbor.avatar,
      city: '杭州',
      petId: null,
      petName: '圆圆',
      petAvatar: petAvatar('🐹'),
      petGender: '母',
      breed: '冠毛',
      requirement: '想给圆圆找个同城的伴',
      createdAt: Date.now(),
    }
    await data.saveMatch(match)

    const view = await renderApp(`/matches/${match.id}`)
    await waitForText(view.container, '想给圆圆找个同城的伴')
    await waitForText(view.container, '私信 TA')

    fireEvent.click(
      [...view.container.querySelectorAll('button')].find((b) =>
        (b.textContent ?? '').includes('私信 TA'),
      ) as HTMLElement,
    )
    await waitForText(view.container, '私信消息只保存在本机')
    assert.ok((view.container.textContent ?? '').includes('圆圆妈'), '会话对象应是同城猪友')

    const text = '你好，我家也是杭州的，可以先聊聊吗'
    fireEvent.change(must<HTMLInputElement>(view.container, '.comment-bar__input'), {
      target: { value: text },
    })
    fireEvent.click(buttonWithText(view.container, '发送'))
    await waitForText(view.container, text)

    const saved = (await data.listMessages(me.id)).filter((m) => m.content === text)
    assert.equal(saved.length, 1, '私信应被保存')
    assert.equal(saved[0].fromUserId, me.id)
    assert.equal(saved[0].toUserId, neighbor.id)
  })
})
