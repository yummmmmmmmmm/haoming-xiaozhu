import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import { cleanup, fireEvent } from '@testing-library/react'
import { GUIDE_ARTICLES } from '../src/data/seed'
import { data, today } from '../src/data/repo'
import type { Comment, Post } from '../src/types'
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
 * 阶段2 · 批次C 摘录进饲养日记（本版重点）
 * 对应验收 C1–C7 与 PRD 2.6
 */

const ARTICLE = GUIDE_ARTICLES[0]
const HEADINGS = ARTICLE.content.filter((p) => p.startsWith('## ')).map((p) => p.replace('## ', ''))
const INTRO = ARTICLE.content.find((p) => !p.startsWith('## ')) ?? ''

function btn(root: ParentNode, text: string): HTMLElement {
  const el = [...root.querySelectorAll('button')].find((b) =>
    (b.textContent ?? '').includes(text),
  )
  assert.ok(el, `未找到按钮「${text}」`)
  return el as HTMLElement
}

async function openExcerpt(view: { container: HTMLElement }): Promise<HTMLTextAreaElement> {
  fireEvent.click(btn(view.container, '📔 记入饲养日记'))
  await until(() => view.container.querySelector('.modal textarea') !== null, '摘录弹窗打开')
  return must<HTMLTextAreaElement>(view.container, '.modal textarea')
}

async function seedPostWithReplies(
  count: number,
): Promise<{ post: Post; replies: Comment[] }> {
  const now = Date.now()
  const post: Post = {
    id: 'qa-post',
    userId: null,
    authorName: '毛毛妈',
    authorAvatar: '',
    content: '正文：今天给猪猪换了大笼子，空间翻倍，它开心得满屋跑。',
    images: [],
    topic: '晒猪日常',
    likes: 3,
    liked: false,
    createdAt: now,
  }
  await data.savePost(post)
  for (let i = 0; i < count; i += 1) {
    await data.saveComment({
      id: `qa-c${i}`,
      postId: post.id,
      userId: null,
      authorName: `猪友${i}`,
      authorAvatar: '',
      content: `回复内容第${i}条`,
      replyToId: null,
      replyToName: '',
      createdAt: now + i,
    })
  }
  const all = (await data.listComments()).filter((c) => c.postId === post.id)
  return { post, replies: all }
}

describe('阶段2 批次C · 摘录进饲养日记', () => {
  beforeEach(async () => {
    await resetStore()
  })

  it('指南文章摘录：预填 → 改几句保存 → 日记列表最前（验收 C1 C2 C3）', async () => {
    const user = await seedUser()
    await seedPet(user.id)

    const view = await renderApp(`/guide/a/${ARTICLE.id}`)
    await waitForText(view.container, ARTICLE.title)

    // C1：弹窗内容已预填标题、摘要、首段与要点
    const textarea = await openExcerpt(view)
    assert.ok(
      textarea.value.startsWith(`【饲养指南 · ${ARTICLE.title}】`),
      `预填内容应以文章标题开头，实际：${textarea.value.slice(0, 40)}`,
    )
    assert.ok(textarea.value.includes(ARTICLE.summary), '预填应包含摘要')
    assert.ok(textarea.value.includes(INTRO), '预填应包含首段正文')
    assert.ok(
      textarea.value.includes(`要点：${HEADINGS.join(' / ')}`),
      '预填应包含全部小标题组成的要点',
    )

    // C2：改几句再保存
    const edited = `${textarea.value}\n今天照着试了试，效果不错。`
    fireEvent.change(textarea, { target: { value: edited } })
    fireEvent.click(btn(view.container, '保存到日记'))
    await waitForText(view.container, '已记入饲养日记 📔')
    assert.equal(view.container.querySelector('.modal'), null, '保存后弹窗应关闭')

    // C3：日记列表最前一条就是它，并显示来源
    view.unmount()
    cleanup()
    const diary = await renderApp('/record/diary')
    await waitForText(diary.container, `摘录自 饲养指南 · ${ARTICLE.title}`)
    const cards = diary.container.querySelectorAll('.section .list .card')
    assert.equal(cards.length, 1, '应只保存了一条日记')
    const first = cards[0].textContent ?? ''
    assert.ok(first.includes('摘录自 饲养指南'), '应显示摘录来源')
    assert.ok(first.includes('今天照着试了试'), '应保存用户改过的内容')
    assert.equal(await data.listDiaries('qa-nobody').then((r) => r.length), 0)
  })

  it('论坛帖子摘录：预填话题 / 作者 / 正文 / 最多 3 条回复（验收 C4）', async () => {
    const user = await seedUser()
    await seedPet(user.id)
    const { post, replies } = await seedPostWithReplies(4)
    assert.equal(replies.length, 4, '用例前提：该帖有 4 条回复')
    const kept = replies.slice(0, 3)
    const dropped = replies.slice(3)

    const view = await renderApp(`/forum/p/${post.id}`)
    await waitForText(view.container, post.content)

    const textarea = await openExcerpt(view)
    assert.ok(
      textarea.value.startsWith(`【论坛摘录 · ${post.topic}】@${post.authorName}`),
      `应包含话题与作者，实际：${textarea.value.slice(0, 40)}`,
    )
    assert.ok(textarea.value.includes(post.content), '应包含帖子正文')
    assert.ok(textarea.value.includes('大家的回复：'), '应包含回复区')
    for (const c of kept) {
      assert.ok(
        textarea.value.includes(`· @${c.authorName}：${c.content}`),
        `应包含回复 @${c.authorName}`,
      )
    }
    for (const c of dropped) {
      assert.equal(
        textarea.value.includes(`· @${c.authorName}：${c.content}`),
        false,
        `最多只摘 3 条回复，不应包含 @${c.authorName}`,
      )
    }
  })

  it('帖子摘录保存后，日记列表显示「摘录自 论坛摘录 · 话题」（验收 C5）', async () => {
    const user = await seedUser()
    await seedPet(user.id)
    const { post } = await seedPostWithReplies(1)

    const view = await renderApp(`/forum/p/${post.id}`)
    await waitForText(view.container, post.content)
    await openExcerpt(view)
    fireEvent.click(btn(view.container, '保存到日记'))
    await waitForText(view.container, '已记入饲养日记 📔')

    view.unmount()
    cleanup()
    const diary = await renderApp('/record/diary')
    await waitForText(diary.container, `摘录自 论坛摘录 · ${post.topic}`)
  })

  it('没有任何猪猪档案时摘录：提示先建档，且无法保存（验收 C6）', async () => {
    await seedUser()

    const view = await renderApp(`/guide/a/${ARTICLE.id}`)
    await waitForText(view.container, ARTICLE.title)
    fireEvent.click(btn(view.container, '📔 记入饲养日记'))
    await until(() => view.container.querySelector('.modal') !== null, '摘录弹窗打开')

    await waitForText(
      view.container,
      '还没有荷兰猪档案，先去「我的荷兰猪」添加一只，日记要记在它名下。',
    )
    // 没有档案就不能产生任何写入入口，从根上避免脏数据
    assert.equal(
      view.container.querySelector('.modal textarea'),
      null,
      '无档案时不应出现可编辑内容区',
    )
    assert.equal(
      [...view.container.querySelectorAll('.modal button')].some((b) =>
        (b.textContent ?? '').includes('保存到日记'),
      ),
      false,
      '无档案时不应提供保存按钮',
    )
  })

  it('有 2 只猪时出现「记给谁」，可指定记到哪一只名下（验收 C7）', async () => {
    const user = await seedUser()
    const first = await seedPet(user.id, { name: '布丁' })
    const second = await seedPet(user.id, { name: '奶茶' })

    const view = await renderApp(`/guide/a/${ARTICLE.id}`)
    await waitForText(view.container, ARTICLE.title)
    const textarea = await openExcerpt(view)

    await waitForText(view.container, '记给谁')
    const pick = [...view.container.querySelectorAll('.modal button.chip')].find(
      (b) => (b.textContent ?? '').trim() === '奶茶',
    )
    assert.ok(pick, '应能选择第二只猪')
    fireEvent.click(pick)

    fireEvent.change(textarea, { target: { value: '记在奶茶名下的摘录' } })
    fireEvent.click(btn(view.container, '保存到日记'))
    await waitForText(view.container, '已记入饲养日记 📔')

    const toSecond = await data.listDiaries(second.id)
    assert.equal(toSecond.length, 1, '日记应记在选中的猪名下')
    assert.equal(toSecond[0].content, '记在奶茶名下的摘录')
    assert.equal(toSecond[0].source, `饲养指南 · ${ARTICLE.title}`)
    assert.equal(toSecond[0].date, today())
    assert.equal((await data.listDiaries(first.id)).length, 0, '不应记到另一只猪名下')
  })
})
