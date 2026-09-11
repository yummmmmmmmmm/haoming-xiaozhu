import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import { cleanup, fireEvent } from '@testing-library/react'
import { data, newId } from '../src/data/repo'
import { petAvatar } from '../src/data/seed'
import type { MatchPost, User } from '../src/types'
import {
  QA_PASSWORD,
  QA_USERNAME,
  must,
  renderApp,
  resetStore,
  seedPet,
  seedUser,
  until,
  waitForText,
} from './harness/app'

/**
 * 新增功能 2 · 本地相猪（同城）
 * - 调取同城用户的用户名与头像
 * - 展示自家猪猪的照片、性别、品种与择偶要求
 * - 猪友之间可以相互回复
 */

const NEIGHBOR_AVATAR = 'data:image/png;base64,NEIGHBOR_AVATAR'

function cards(root: ParentNode): HTMLElement[] {
  return [...root.querySelectorAll('.match-card')] as HTMLElement[]
}

function btn(root: ParentNode, text: string): HTMLElement {
  const found = [...root.querySelectorAll('button')].find((b) =>
    (b.textContent ?? '').includes(text),
  )
  assert.ok(found, `未找到按钮「${text}」`)
  return found as HTMLElement
}

async function seedMatch(user: User, patch: Partial<MatchPost> = {}): Promise<MatchPost> {
  const match: MatchPost = {
    id: newId('m'),
    userId: user.id,
    authorName: user.nickname,
    authorAvatar: user.avatar,
    city: user.city ?? '',
    petId: null,
    petName: '圆圆',
    petAvatar: petAvatar('🐹'),
    petGender: '母',
    breed: '冠毛',
    requirement: '杭州本地找一只温顺的公猪',
    createdAt: Date.now(),
    ...patch,
  }
  await data.saveMatch(match)
  return match
}

describe('新增功能2 · 本地相猪', () => {
  beforeEach(async () => {
    cleanup()
    await resetStore()
  })

  it('默认只看同城，切到"全部城市"能看到其他城市的相亲帖', async () => {
    await seedUser(QA_USERNAME, QA_PASSWORD, { city: '杭州', nickname: '猪爸QA' })

    const view = await renderApp('/matches')
    await waitForText(view.container, '同城猪友')
    // 示例社区里杭州有 2 条（其余在上海 / 成都）
    await until(() => cards(view.container).length === 2, '同城列表只显示本城相亲帖')
    assert.ok(view.container.textContent?.includes('同城猪友（2）'))

    fireEvent.click(btn(view.container, '全部城市'))
    await until(() => cards(view.container).length === 4, '全部城市显示全部相亲帖')
    assert.ok(view.container.textContent?.includes('全部相亲帖（4）'))
  })

  it('没有设置城市时给出设置引导，且不会把帖子过滤掉', async () => {
    await seedUser(QA_USERNAME, QA_PASSWORD, { city: '' })

    const view = await renderApp('/matches')
    await waitForText(view.container, '设置城市后就能只看同城猪友')
    assert.equal(cards(view.container).length, 4, '未设置城市时展示全部相亲帖')
  })

  it('调取同城用户的用户名与头像（以用户表为准，而非发帖快照）', async () => {
    await seedUser(QA_USERNAME, QA_PASSWORD, { city: '杭州' })
    const neighbor = await seedUser('neighbor', 'pw123456', {
      nickname: '圆圆妈',
      avatar: NEIGHBOR_AVATAR,
      city: '杭州',
    })
    // 故意写入过期的快照，验证页面读的是用户表
    await seedMatch(neighbor, {
      authorName: '过期昵称',
      authorAvatar: '',
      petName: '圆圆',
    })

    const view = await renderApp('/matches')
    await waitForText(view.container, '圆圆妈')
    const card = must(view.container, '.match-card') as HTMLElement
    assert.ok(
      (card.textContent ?? '').includes('圆圆妈'),
      '应显示用户表里的最新昵称',
    )
    assert.equal(
      (card.textContent ?? '').includes('过期昵称'),
      false,
      '不应显示发帖时的旧快照昵称',
    )
    const avatar = must<HTMLImageElement>(card, '.avatar')
    assert.equal(avatar.getAttribute('src'), NEIGHBOR_AVATAR, '头像应取自用户表')
  })

  it('发布相亲帖：带猪猪照片、性别与择偶要求，并出现在同城列表最前', async () => {
    const me = await seedUser(QA_USERNAME, QA_PASSWORD, { city: '杭州', nickname: '猪爸QA' })
    const pet = await seedPet(me.id, {
      name: '布丁',
      gender: '公',
      breed: '冠毛',
      color: '奶油',
    })

    const view = await renderApp('/matches/new')
    await waitForText(view.container, '选择出镜的猪猪')
    assert.ok(view.container.textContent?.includes('布丁'), '默认选中自家猪猪')

    const requirement = '杭州本地找一只温柔的小母猪，希望能视频先看看'
    fireEvent.change(must<HTMLTextAreaElement>(view.container, 'textarea'), {
      target: { value: requirement },
    })
    fireEvent.click(btn(view.container, '发布相亲帖'))
    await waitForText(view.container, '发布成功 💕')
    await waitForText(view.container, requirement)

    const first = cards(view.container)[0]
    const text = first.textContent ?? ''
    assert.ok(text.includes('布丁'), '卡片应显示猪猪名字')
    assert.ok(text.includes('公'), '卡片应显示猪猪性别')
    assert.ok(text.includes('杭州'), '卡片应显示所在城市')
    assert.ok(text.includes(requirement), '卡片应显示择偶要求')
    assert.ok(text.includes('猪爸QA'), '卡片应显示发布者昵称')
    assert.equal(
      (must<HTMLImageElement>(first, '.match-card__photo')).getAttribute('src'),
      pet.avatar,
      '卡片应展示自家猪猪的照片',
    )

    const saved = (await data.listMatches()).find((m) => m.requirement === requirement)
    assert.ok(saved, '相亲帖应已保存')
    assert.equal(saved.petId, pet.id)
    assert.equal(saved.petGender, '公')
    assert.equal(saved.city, '杭州')
    assert.equal(cards(view.container).length, 3, '杭州同城列表应新增为 3 条')
    assert.equal(cards(view.container)[0].textContent?.includes(requirement), true, '新帖排在最前')
  })

  it('猪友之间可以相互回复，回复带着回复人的用户名', async () => {
    const me = await seedUser(QA_USERNAME, QA_PASSWORD, { city: '杭州', nickname: '猪爸QA' })
    const neighbor = await seedUser('neighbor', 'pw123456', {
      nickname: '圆圆妈',
      avatar: NEIGHBOR_AVATAR,
      city: '杭州',
    })
    const match = await seedMatch(neighbor, { requirement: '想给圆圆找个伴' })
    assert.equal((await data.listMatchReplies(match.id)).length, 0, '初始没有回复')

    const view = await renderApp(`/matches/${match.id}`)
    await waitForText(view.container, '想给圆圆找个伴')
    await waitForText(view.container, '圆圆妈')

    const reply = '我家也是杭州的，可以先聊聊～'
    fireEvent.change(must<HTMLInputElement>(view.container, '.comment-bar__input'), {
      target: { value: reply },
    })
    fireEvent.click(btn(view.container, '发送'))
    await waitForText(view.container, '回复成功 💬')
    await waitForText(view.container, reply)

    const comment = must(view.container, '.comment') as HTMLElement
    assert.ok((comment.textContent ?? '').includes('猪爸QA'), '回复应带上回复人的用户名')

    const saved = await data.listMatchReplies(match.id)
    assert.equal(saved.length, 1)
    assert.equal(saved[0].userId, me.id)
    assert.equal(saved[0].content, reply)
  })

  it('删除自己的相亲帖时，回复一起级联删除', async () => {
    const me = await seedUser(QA_USERNAME, QA_PASSWORD, { city: '杭州' })
    const neighbor = await seedUser('neighbor', 'pw123456', { city: '杭州' })
    const match = await seedMatch(me, { requirement: '删帖级联验证' })
    await data.saveMatchReply({
      id: newId('mr'),
      matchId: match.id,
      userId: neighbor.id,
      authorName: neighbor.nickname,
      authorAvatar: '',
      content: '帮顶～',
      createdAt: Date.now(),
    })

    const view = await renderApp(`/matches/${match.id}`)
    await waitForText(view.container, '删帖级联验证')
    await waitForText(view.container, '帮顶～')

    fireEvent.click(must(view.container, 'button[aria-label="删除"]'))
    await waitForText(view.container, '删除这条相亲帖？')
    const modal = must(view.container, '.modal') as HTMLElement
    fireEvent.click(btn(modal, '删除'))

    // 删除后回到列表页，帖子应从列表消失
    await waitForText(view.container, '发布我家猪猪的相亲帖')
    await until(
      () => !(view.container.textContent ?? '').includes('删帖级联验证'),
      '相亲帖已从列表移除',
    )
    assert.equal(
      (await data.listMatches()).some((m) => m.id === match.id),
      false,
      '相亲帖应已删除',
    )
    assert.equal(
      (await data.listMatchReplies(match.id)).length,
      0,
      '帖子下的回复应被级联删除',
    )
  })
})
