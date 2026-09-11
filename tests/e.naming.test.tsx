import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, it } from 'node:test'
import { cleanup, fireEvent } from '@testing-library/react'
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
 * 阶段2 · 批次E 命名一致性
 * 对应验收 E1–E4：统一为「饲养日记」，不再出现「猪猪日记」
 */

function btn(root: ParentNode, text: string): HTMLElement {
  const el = [...root.querySelectorAll('button')].find((b) =>
    (b.textContent ?? '').includes(text),
  )
  assert.ok(el, `未找到按钮「${text}」`)
  return el as HTMLElement
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (/\.(tsx?|css)$/.test(entry)) out.push(full)
  }
  return out
}

describe('阶段2 批次E · 命名一致性', () => {
  beforeEach(async () => {
    await resetStore()
  })

  it('快速记录弹层第 5 项名称为「饲养日记」（验收 E1）', async () => {
    const user = await seedUser()
    await seedPet(user.id)
    const view = await renderApp('/')
    await waitForText(view.container, '📖 分类指南')

    fireEvent.click(btn(view.container, '记录'))
    await until(() => view.container.querySelector('.quick-grid') !== null, '快速记录弹层打开')

    const labels = [...view.container.querySelectorAll('.quick-item__label')].map(
      (e) => e.textContent,
    )
    assert.deepEqual(labels, ['生日', '体重', '相册', '健康打卡', '饲养日记', '待办提醒'])
    assert.equal(labels[4], '饲养日记', '第 5 项必须叫「饲养日记」')
  })

  it('该记录页标题为「饲养日记」（验收 E2）', async () => {
    const user = await seedUser()
    await seedPet(user.id)
    const view = await renderApp('/record/diary')
    await waitForText(view.container, '饲养日记')
    assert.equal(
      view.container.querySelector('.topbar__title')?.textContent,
      '饲养日记',
      '页面标题应为「饲养日记」',
    )
  })

  it('猪猪档案页的记录入口显示「饲养日记」及副文案（验收 E3）', async () => {
    const user = await seedUser()
    const pet = await seedPet(user.id)
    const view = await renderApp(`/pets/${pet.id}`)
    await waitForText(view.container, '饲养日记')

    const row = [...view.container.querySelectorAll('.row')].find(
      (r) => (r.querySelector('.row__title')?.textContent ?? '') === '饲养日记',
    )
    assert.ok(row, '档案页应有「饲养日记」入口')
    assert.equal(row.querySelector('.row__sub')?.textContent, '记录了 0 篇小日常')
  })

  it('全局搜索「猪猪日记」：源码与界面都不再出现（验收 E4）', async () => {
    const root = existsSync(join(process.cwd(), 'src'))
      ? process.cwd()
      : join(process.cwd(), '..')
    const files = walk(join(root, 'src'))
    assert.ok(files.length > 30, `应该扫描到全部源码，实际 ${files.length} 个文件`)
    const hits = files.filter((f) => readFileSync(f, 'utf8').includes('猪猪日记'))
    assert.deepEqual(hits, [], `仍包含「猪猪日记」的文件：${hits.join(', ')}`)

    // 界面上也不能出现
    const user = await seedUser()
    const pet = await seedPet(user.id)
    for (const path of ['/', '/record/diary', `/pets/${pet.id}`, '/account']) {
      const view = await renderApp(path)
      await until(
        () => (view.container.textContent ?? '').length > 20,
        `页面 ${path} 渲染完成`,
      )
      assert.equal(
        (view.container.textContent ?? '').includes('猪猪日记'),
        false,
        `页面 ${path} 出现了「猪猪日记」`,
      )
      view.unmount()
      cleanup()
    }
  })
})
