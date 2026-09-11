import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import { cleanup, fireEvent } from '@testing-library/react'
import { data, newId, today } from '../src/data/repo'
import type { DiaryRecord, HealthRecord, Pet, Photo, TodoRecord, WeightRecord } from '../src/types'
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
 * 阶段2 · 批次F 记录模块
 * 对应验收 F2–F9（F1 已在批次A 覆盖）
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

function statValue(root: ParentNode, label: string): string | undefined {
  const stat = [...root.querySelectorAll('.stat')].find(
    (s) => (s.querySelector('.stat__label')?.textContent ?? '') === label,
  )
  return stat?.querySelector('.stat__num')?.textContent ?? undefined
}

function statNode(root: ParentNode, label: string): HTMLElement {
  const stat = [...root.querySelectorAll('.stat')].find(
    (s) => (s.querySelector('.stat__label')?.textContent ?? '') === label,
  )
  assert.ok(stat, `未找到统计项「${label}」`)
  return must<HTMLElement>(stat, '.stat__num')
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00`)
  d.setDate(d.getDate() + days)
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function makeImageFile(name: string): File {
  return new File([new Uint8Array([9, 8, 7, 6, 5])], name, { type: 'image/png' })
}

function uploadFiles(input: HTMLInputElement, files: File[]): void {
  Object.defineProperty(input, 'files', { value: files, configurable: true })
  fireEvent.change(input)
}

async function openWeightModal(view: { container: HTMLElement }): Promise<void> {
  fireEvent.click(btn(view.container, '＋ 记录一次体重'))
  await until(() => view.container.querySelector('.modal') !== null, '体重弹窗打开')
}

async function addWeight(
  view: { container: HTMLElement },
  opts: { weight: string; date?: string; expectCount: number },
): Promise<void> {
  await openWeightModal(view)
  if (opts.date) {
    fireEvent.change(must<HTMLInputElement>(view.container, '.modal input[type="date"]'), {
      target: { value: opts.date },
    })
  }
  fireEvent.change(must<HTMLInputElement>(view.container, '.modal input[type="number"]'), {
    target: { value: opts.weight },
  })
  fireEvent.click(modalBtn(view.container, '保存'))
  // 不能只等 toast：上一条的 toast 可能还没消失，会误判为已保存完成
  await until(
    () => statValue(view.container, '记录次数') === String(opts.expectCount),
    `体重记录数更新为 ${opts.expectCount}`,
  )
  await waitForText(view.container, `${opts.weight} 克`)
}

async function seedWeight(
  userId: string,
  petId: string,
  date: string,
  weight: number,
): Promise<WeightRecord> {
  const record: WeightRecord = {
    id: newId('w'),
    userId,
    petId,
    date,
    weight,
    note: '',
    createdAt: Date.now(),
  }
  await data.saveWeight(record)
  return record
}

describe('阶段2 批次F · 记录模块', () => {
  let user: Awaited<ReturnType<typeof seedUser>>
  let pet: Pet

  beforeEach(async () => {
    await resetStore()
    user = await seedUser()
    pet = await seedPet(user.id)
  })

  it('新增一条体重 720g：列表出现、最新体重 720g、曲线出现数据点（验收 F2）', async () => {
    const view = await renderApp('/record/weight')
    await waitForText(view.container, '＋ 记录一次体重')
    // 初始为空态
    await waitForText(view.container, '还没有记录，点上面按钮记一次吧')

    await addWeight(view, { weight: '720', expectCount: 1 })
    await waitForText(view.container, '720 克')
    assert.equal(statValue(view.container, '最新(g)'), '720')
    assert.equal(statValue(view.container, '记录次数'), '1')
    assert.equal(
      view.container.querySelectorAll('svg.chart circle').length,
      1,
      '曲线应出现 1 个数据点',
    )
  })

  it('先轻后重：首末变化显示为增长（验收 F3）', async () => {
    const view = await renderApp('/record/weight')
    await waitForText(view.container, '＋ 记录一次体重')
    await addWeight(view, { weight: '700', date: '2026-09-10', expectCount: 1 })
    await addWeight(view, { weight: '760', date: '2026-09-11', expectCount: 2 })

    assert.deepEqual(
      (await data.listWeights(pet.id)).map((r) => [r.date, r.weight]),
      [
        ['2026-09-10', 700],
        ['2026-09-11', 760],
      ],
      '记录应按日期升序保存',
    )
    assert.equal(statValue(view.container, '最新(g)'), '760')
    assert.equal(statValue(view.container, '首末变化(g)'), '+60')
    assert.equal(
      statNode(view.container, '首末变化(g)').getAttribute('style') ?? '',
      '',
      '增长时不应触发红色提示',
    )
    assert.equal(view.container.querySelectorAll('svg.chart circle').length, 2)
  })

  it('体重变轻：首末变化显示为负数并标红（验收 F3 反向）', async () => {
    const view = await renderApp('/record/weight')
    await waitForText(view.container, '＋ 记录一次体重')
    await addWeight(view, { weight: '760', date: '2026-09-10', expectCount: 1 })
    await addWeight(view, { weight: '700', date: '2026-09-11', expectCount: 2 })

    assert.equal(statValue(view.container, '最新(g)'), '700')
    assert.equal(statValue(view.container, '首末变化(g)'), '-60')
    assert.ok(
      (statNode(view.container, '首末变化(g)').getAttribute('style') ?? '').includes('red'),
      '变轻时应用红色提示',
    )
  })

  it('新增一条体重后删除：列表移除且统计同步（验收 F4）', async () => {
    const view = await renderApp('/record/weight')
    await waitForText(view.container, '＋ 记录一次体重')
    await addWeight(view, { weight: '720', expectCount: 1 })
    assert.equal((await data.listWeights(pet.id)).length, 1)

    fireEvent.click(must(view.container, '.list .row button.row__action'))
    await waitForText(view.container, '已删除')
    await waitForText(view.container, '还没有记录，点上面按钮记一次吧')
    assert.equal(statValue(view.container, '最新(g)'), '—')
    assert.equal(statValue(view.container, '记录次数'), '0')
    assert.equal(
      view.container.querySelectorAll('svg.chart circle').length,
      0,
      '曲线数据点应同步移除',
    )
    assert.equal((await data.listWeights(pet.id)).length, 0)
  })

  it('健康打卡新增「疫苗」后疫苗计数 +1（验收 F5）', async () => {
    const view = await renderApp('/record/health')
    await waitForText(view.container, '＋ 新增一条健康记录')
    assert.equal(statValue(view.container, '疫苗 💉'), '0')

    fireEvent.click(btn(view.container, '＋ 新增一条健康记录'))
    await until(() => view.container.querySelector('.modal') !== null, '健康弹窗打开')
    fireEvent.click(modalBtn(view.container, '保存'))
    await waitForText(view.container, '已记录 💉')

    assert.equal(statValue(view.container, '疫苗 💉'), '1')
    const saved = await data.listHealths(pet.id)
    assert.equal(saved.length, 1)
    assert.equal(saved[0].kind, 'vaccine')
    assert.equal(saved[0].title, '疫苗')
  })

  it('待办新增「换垫料」周期 7 天，完成后自动顺延到 7 天后（验收 F6）', async () => {
    const view = await renderApp('/record/todo')
    await waitForText(view.container, '＋ 添加提醒')

    fireEvent.click(btn(view.container, '＋ 添加提醒'))
    await until(() => view.container.querySelector('.modal') !== null, '待办弹窗打开')
    fireEvent.change(
      must<HTMLInputElement>(
        view.container,
        '.modal input[placeholder="例如：换垫料"]',
      ),
      { target: { value: '换垫料' } },
    )
    const sevenDays = [...view.container.querySelectorAll('.modal .chip')].find(
      (c) => (c.textContent ?? '').trim() === '7 天',
    )
    assert.ok(sevenDays, '周期应可选 7 天')
    fireEvent.click(sevenDays)
    fireEvent.click(modalBtn(view.container, '保存'))
    await waitForText(view.container, '已添加提醒 ⏰')

    assert.equal(statValue(view.container, '待完成'), '1')
    assert.equal(statValue(view.container, '已完成'), '0')
    const before = await data.listTodos(pet.id)
    assert.equal(before.length, 1)
    assert.equal(before[0].title, '换垫料')
    assert.equal(before[0].cycleDays, 7)
    assert.equal(before[0].done, false)

    // 点完成
    fireEvent.click(must(view.container, '.todo-check'))
    const nextDate = addDays(before[0].dueDate, 7)
    await waitForText(view.container, `完成，下次 ${nextDate}`)

    const after = await data.listTodos(pet.id)
    assert.equal(after.length, 1, '周期任务应保留并顺延，而不是标记完成')
    assert.equal(after[0].done, false)
    assert.equal(after[0].dueDate, nextDate)
    assert.equal(statValue(view.container, '待完成'), '1')
    assert.equal(statValue(view.container, '已完成'), '0')
    await waitForText(view.container, '7 天后 · 每 7 天')
  })

  it('相册上传 2 张照片：提示、九宫格、看大图并删除（验收 F7）', async () => {
    const view = await renderApp('/album')
    await waitForText(view.container, '＋ 添加照片')
    uploadFiles(must<HTMLInputElement>(view.container, 'input[type="file"]'), [
      makeImageFile('a.png'),
      makeImageFile('b.png'),
    ])
    await waitForText(view.container, '已添加 2 张照片 🖼️')
    assert.equal(view.container.querySelectorAll('.grid-3 img').length, 2)
    assert.equal((await data.listPhotos(user.id)).length, 2)

    // 点开看大图
    fireEvent.click(must(view.container, '.grid-3 button'))
    await until(() => view.container.querySelector('.modal') !== null, '大图弹窗打开')
    assert.ok(must(view.container, '.modal img'), '弹窗应显示大图')
    await waitForText(view.container, `${pet.name} · ${today()}`)

    // 删除
    fireEvent.click(modalBtn(view.container, '删除'))
    await waitForText(view.container, '已删除')
    assert.equal(view.container.querySelectorAll('.grid-3 img').length, 1)
    assert.equal((await data.listPhotos(user.id)).length, 1)
  })

  it('有 2 只猪时切换猪猪，各记录页数据互不串（验收 F8）', async () => {
    const second = await seedPet(user.id, { name: '奶茶' })
    await seedWeight(user.id, pet.id, '2026-09-10', 700)
    await seedWeight(user.id, second.id, '2026-09-10', 900)
    const diary: DiaryRecord = {
      id: newId('d'),
      userId: user.id,
      petId: second.id,
      date: today(),
      mood: '开心',
      content: '奶茶今天很乖',
      images: [],
      source: '',
      createdAt: Date.now(),
    }
    await data.saveDiary(diary)

    const weight = await renderApp('/record/weight')
    await waitForText(weight.container, '的体重趋势')
    const pickPet = (root: ParentNode, name: string) => {
      const chip = [...root.querySelectorAll('.hscroll .chip')].find((c) =>
        (c.textContent ?? '').includes(name),
      )
      assert.ok(chip, `未找到切换猪猪「${name}」`)
      return chip
    }

    fireEvent.click(pickPet(weight.container, '奶茶'))
    await waitForText(weight.container, '900 克')
    assert.equal(weight.container.textContent?.includes('700 克'), false, '不应串到另一只猪的数据')
    assert.equal(statValue(weight.container, '最新(g)'), '900')

    fireEvent.click(pickPet(weight.container, pet.name))
    await waitForText(weight.container, '700 克')
    assert.equal(weight.container.textContent?.includes('900 克'), false)
    assert.equal(statValue(weight.container, '最新(g)'), '700')
    weight.unmount()
    cleanup()

    const diaryView = await renderApp('/record/diary')
    await until(
      () => diaryView.container.querySelectorAll('.hscroll .chip').length >= 2,
      '日记页猪猪切换器就绪',
    )
    assert.equal(
      diaryView.container.textContent?.includes('奶茶今天很乖'),
      false,
      '默认猪猪不应看到另一只猪的日记',
    )
    fireEvent.click(pickPet(diaryView.container, '奶茶'))
    await waitForText(diaryView.container, '奶茶今天很乖')
  })

  it('删除某只猪的档案：该猪全部记录一并删除，其他猪不受影响（验收 F9）', async () => {
    const second = await seedPet(user.id, { name: '奶茶' })
    await seedWeight(user.id, pet.id, '2026-09-10', 700)
    const health: HealthRecord = {
      id: newId('h'),
      userId: user.id,
      petId: pet.id,
      date: today(),
      kind: 'vaccine',
      title: '疫苗',
      note: '',
      createdAt: Date.now(),
    }
    const diary: DiaryRecord = {
      id: newId('d'),
      userId: user.id,
      petId: pet.id,
      date: today(),
      mood: '开心',
      content: '布丁今天很乖',
      images: [],
      source: '',
      createdAt: Date.now(),
    }
    const todo: TodoRecord = {
      id: newId('td'),
      userId: user.id,
      petId: pet.id,
      title: '换垫料',
      dueDate: today(),
      cycleDays: 3,
      done: false,
      note: '',
      createdAt: Date.now(),
    }
    const photo: Photo = {
      id: newId('ph'),
      userId: user.id,
      petId: pet.id,
      dataUrl: 'data:image/png;base64,AAAA',
      caption: '',
      date: today(),
      createdAt: Date.now(),
    }
    await data.saveHealth(health)
    await data.saveDiary(diary)
    await data.saveTodo(todo)
    await data.savePhoto(photo)
    await seedWeight(user.id, second.id, '2026-09-10', 900)

    const view = await renderApp(`/pets/edit/${pet.id}`)
    await waitForText(view.container, '删除这只猪的档案')
    fireEvent.click(btn(view.container, '删除这只猪的档案'))
    await waitForText(view.container, '已删除该档案及记录')

    assert.equal((await data.listWeights(pet.id)).length, 0, '体重应一并删除')
    assert.equal((await data.listHealths(pet.id)).length, 0, '健康记录应一并删除')
    assert.equal((await data.listDiaries(pet.id)).length, 0, '日记应一并删除')
    assert.equal((await data.listTodos(pet.id)).length, 0, '待办应一并删除')
    assert.equal(
      (await data.listPhotos(user.id)).filter((p) => p.petId === pet.id).length,
      0,
      '相册照片应一并删除',
    )
    assert.equal((await data.listWeights(second.id)).length, 1, '其他猪的记录不受影响')
    assert.equal((await data.listPets(user.id)).length, 1, '其他猪档案不受影响')
  })
})
