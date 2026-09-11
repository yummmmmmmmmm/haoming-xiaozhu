import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import { cleanup, fireEvent } from '@testing-library/react'
import { data, newId } from '../src/data/repo'
import { POST_TOPICS, SEED_POSTS } from '../src/data/seed'
import type { Comment, Post, User } from '../src/types'
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
 * 阶段2 · 批次G 论坛
 * 对应验收 G1–G8 与 PRD 3.5
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

function makeImageFile(name: string): File {
  return new File([new Uint8Array([3, 1, 4, 1, 5])], name, { type: 'image/png' })
}

function uploadFiles(input: HTMLInputElement, files: File[]): void {
  Object.defineProperty(input, 'files', { value: files, configurable: true })
  fireEvent.change(input)
}

function cards(root: ParentNode): HTMLElement[] {
  return [...root.querySelectorAll('.post-card')] as HTMLElement[]
}

function likeButton(card: Element): HTMLElement {
  return must<HTMLElement>(card, '.post-card__foot .like')
}

function likeCount(card: Element): number {
  const spans = likeButton(card).querySelectorAll('span')
  return Number(spans[1]?.textContent ?? '0')
}

function likeIcon(card: Element): string {
  return likeButton(card).querySelectorAll('span')[0]?.textContent ?? ''
}

async function seedOwnPost(
  user: User,
  opts: { content?: string; topic?: string; images?: string[]; replies?: number } = {},
): Promise<Post> {
  const post: Post = {
    id: newId('p'),
    userId: user.id,
    authorName: user.nickname,
    authorAvatar: '',
    content: opts.content ?? '我家猪猪今天学会了新技能',
    images: opts.images ?? [],
    topic: opts.topic ?? POST_TOPICS[0],
    likes: 0,
    liked: false,
    createdAt: Date.now(),
  }
  await data.savePost(post)
  for (let i = 0; i < (opts.replies ?? 0); i += 1) {
    const comment: Comment = {
      id: newId('c'),
      postId: post.id,
      userId: null,
      authorName: `猪友${i}`,
      authorAvatar: '',
      content: `回复内容第${i}条`,
      replyToId: null,
      replyToName: '',
      createdAt: Date.now() + i,
    }
    await data.saveComment(comment)
  }
  return post
}

describe('阶段2 批次G · 论坛', () => {
  let user: User

  beforeEach(async () => {
    await resetStore()
    user = await seedUser()
    await seedPet(user.id)
  })

  it('论坛默认「全部」，可见内置示例帖 8 条（验收 G1）', async () => {
    assert.equal(SEED_POSTS.length, 8, 'PRD 约定的内置示例帖数量')
    const view = await renderApp('/forum')
    await until(() => cards(view.container).length > 0, '论坛列表加载完成')
    assert.equal(cards(view.container).length, 8)
    const active = view.container.querySelector('.chip--on')
    assert.equal(active?.textContent, '全部')
  })

  it('点话题「新手求助」只显示该话题帖子（验收 G2）', async () => {
    const view = await renderApp('/forum')
    await until(() => cards(view.container).length > 0, '论坛列表加载完成')

    const target = '新手求助'
    const expect = SEED_POSTS.filter((p) => p.topic === target)
    assert.ok(expect.length > 0, '示例数据里应有该话题')

    fireEvent.click(btn(view.container, target))
    await until(() => cards(view.container).length === expect.length, '筛选结果数量正确')
    for (const card of cards(view.container)) {
      assert.equal(
        card.querySelector('.post-card__foot .tag')?.textContent,
        target,
        '筛选后不应出现其他话题的帖子',
      )
    }
    assert.equal(view.container.querySelector('.chip--on')?.textContent, target)
  })

  it('点爱心：🤍 → ❤️ 且数字 +1，再次点击取消（验收 G3）', async () => {
    const view = await renderApp('/forum')
    await until(() => cards(view.container).length > 0, '论坛列表加载完成')
    const card = cards(view.container)[0]
    const before = likeCount(card)
    assert.equal(likeIcon(card), '🤍', '初始应为未点赞')

    fireEvent.click(likeButton(card))
    await until(() => likeIcon(card) === '❤️', '爱心变为已点赞')
    assert.equal(likeCount(card), before + 1, '点赞数应 +1')

    fireEvent.click(likeButton(card))
    await until(() => likeIcon(card) === '🤍', '爱心恢复为未点赞')
    assert.equal(likeCount(card), before, '取消后点赞数应还原')
  })

  it('正文和图片都留空时发布被拦截并提示（验收 G4）', async () => {
    const view = await renderApp('/forum/new')
    await waitForText(view.container, '发布')
    fireEvent.click(btn(view.container, '发布'))
    await waitForText(view.container, '写点什么或者加张图吧')
    assert.equal((await data.listPosts()).length, SEED_POSTS.length, '不应产生新帖子')
  })

  it('写正文 + 加 2 张图后发布：出现在列表最前，作者为当前昵称（验收 G5）', async () => {
    const view = await renderApp('/forum/new')
    await waitForText(view.container, '发布')
    fireEvent.change(must<HTMLTextAreaElement>(view.container, 'textarea'), {
      target: { value: '今天给猪猪洗了澡，香喷喷' },
    })
    uploadFiles(must<HTMLInputElement>(view.container, 'input[type="file"]'), [
      makeImageFile('g1.png'),
      makeImageFile('g2.png'),
    ])
    await until(
      () => view.container.querySelectorAll('.grid-3 img').length === 2,
      '两张配图已就绪',
    )
    fireEvent.click(btn(view.container, '发布'))
    await waitForText(view.container, '发布成功 🎉')

    const first = cards(view.container)[0]
    assert.ok(first, '发布后应回到列表')
    assert.equal(first.querySelector('.post-card__content')?.textContent, '今天给猪猪洗了澡，香喷喷')
    assert.equal(first.querySelector('.post-card__author')?.textContent, user.nickname)
    assert.equal(
      first.querySelectorAll('.post-card__images img').length,
      2,
      '列表里应带 2 张配图',
    )
    // 自己发的帖子不带「官方示例」标签
    assert.equal(first.querySelector('.post-card__author .tag'), null)
  })

  it('回复帖子后再回复某条回复，显示「回复 @某人：」（验收 G6）', async () => {
    const post = await seedOwnPost(user, { replies: 1 })
    const view = await renderApp(`/forum/p/${post.id}`)
    await waitForText(view.container, '回复内容第0条')

    // 普通回复
    fireEvent.change(must<HTMLInputElement>(view.container, '.comment-bar__input'), {
      target: { value: '恭喜恭喜' },
    })
    fireEvent.click(btn(view.container, '发送'))
    await waitForText(view.container, '回复成功 💬')
    await waitForText(view.container, '恭喜恭喜')

    // 针对某条回复再回复
    fireEvent.click(btn(view.container, '回复'))
    await waitForText(view.container, '正在回复 @猪友0')
    fireEvent.change(must<HTMLInputElement>(view.container, '.comment-bar__input'), {
      target: { value: '同喜同喜' },
    })
    fireEvent.click(btn(view.container, '发送'))
    await waitForText(view.container, '同喜同喜')

    const quotes = [...view.container.querySelectorAll('.comment__quote')].map(
      (e) => e.textContent,
    )
    assert.deepEqual(quotes, ['回复 @猪友0：'], '被回复的内容前应显示来源')
    const saved = (await data.listComments(post.id)).find((c) => c.content === '同喜同喜')
    assert.ok(saved, '回复应已保存')
    assert.equal(saved.replyToName, '猪友0')
  })

  it('删除自己的帖子：二次确认后帖子与全部回复一起消失（验收 G7）', async () => {
    const post = await seedOwnPost(user, { replies: 3 })
    const view = await renderApp(`/forum/p/${post.id}`)
    await waitForText(view.container, '回复内容第2条')
    assert.equal((await data.listComments(post.id)).length, 3)

    fireEvent.click(must(view.container, 'button[aria-label="删除"]'))
    await waitForText(view.container, '删除这条帖子？')
    await waitForText(view.container, '帖子和它的全部回复都会被删除，且无法恢复')

    // 先点取消，帖子应还在
    fireEvent.click(modalBtn(view.container, '取消'))
    await until(() => view.container.querySelector('.modal') === null, '弹窗关闭')
    assert.ok((await data.listPosts()).some((p) => p.id === post.id))

    fireEvent.click(must(view.container, 'button[aria-label="删除"]'))
    await until(() => view.container.querySelector('.modal') !== null, '确认弹窗打开')
    fireEvent.click(modalBtn(view.container, '删除'))
    await waitForText(view.container, '已删除')

    assert.equal(
      (await data.listPosts()).some((p) => p.id === post.id),
      false,
      '帖子应被删除',
    )
    assert.equal((await data.listComments(post.id)).length, 0, '回复应一并删除')
    // 已回到论坛列表
    await waitForText(view.container, '论坛分享')
  })

  it('别人的帖子不显示删除按钮（验收 G8）', async () => {
    const other: Post = {
      id: 'other-post',
      userId: null,
      authorName: '官方小编',
      authorAvatar: '',
      content: '这是别人的帖子',
      images: [],
      topic: POST_TOPICS[1],
      likes: 1,
      liked: false,
      createdAt: Date.now(),
    }
    await data.savePost(other)
    const view = await renderApp(`/forum/p/${other.id}`)
    await waitForText(view.container, '这是别人的帖子')
    assert.equal(
      view.container.querySelector('button[aria-label="删除"]'),
      null,
      '非本人帖子不应有删除入口',
    )
    assert.equal(
      [...view.container.querySelectorAll('button')].some((b) =>
        (b.textContent ?? '').trim() === '删除',
      ),
      false,
      '页面也不应出现删除按钮',
    )
  })
})
