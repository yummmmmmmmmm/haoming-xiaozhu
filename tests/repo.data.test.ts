import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import { data, ensureSeedData, hashPassword, resetAllData } from '../src/data/repo'
import { SEED_COMMENTS, SEED_POSTS } from '../src/data/seed'
import type { DiaryRecord, HealthRecord, Pet, TodoRecord, User, WeightRecord } from '../src/types'

/** 阶段0 · 数据层基线：本机仓库的读写、过滤、级联与重置 */

const now = Date.now()

function makeUser(id: string): User {
  return {
    id,
    username: id,
    password: hashPassword('1234'),
    nickname: id,
    avatar: '',
    signature: '',
    createdAt: now,
  }
}

function makePet(id: string, userId: string): Pet {
  return {
    id,
    userId,
    name: id,
    avatar: '',
    breed: '美国短毛',
    gender: '母',
    birthday: '2026-01-01',
    color: '三花',
    note: '',
    createdAt: now,
  }
}

function makeWeight(id: string, userId: string, petId: string, date: string, weight: number): WeightRecord {
  return { id, userId, petId, date, weight, note: '', createdAt: now }
}

function makeDiary(id: string, userId: string, petId: string): DiaryRecord {
  return { id, userId, petId, date: '2026-09-01', mood: '😊 开心', content: 'x', images: [], createdAt: now }
}

function makeHealth(id: string, userId: string, petId: string): HealthRecord {
  return { id, userId, petId, date: '2026-09-01', kind: 'vaccine', title: '疫苗', note: '', createdAt: now }
}

function makeTodo(id: string, userId: string, petId: string): TodoRecord {
  return { id, userId, petId, title: '换垫料', dueDate: '2026-09-10', cycleDays: 7, done: false, note: '', createdAt: now }
}

describe('阶段0 数据层基线', () => {
  beforeEach(async () => {
    await resetAllData()
  })

  it('初始化示例数据具备幂等性：重复执行不会重复写入', async () => {
    const before = await data.listPosts()
    assert.equal(before.length, SEED_POSTS.length)
    await ensureSeedData()
    await ensureSeedData()
    assert.equal((await data.listPosts()).length, SEED_POSTS.length)
    assert.equal((await data.listComments()).length, SEED_COMMENTS.length)
  })

  it('resetAllData 会清空业务数据并恢复示例帖', async () => {
    await data.saveUser(makeUser('u1'))
    await data.savePet(makePet('petA', 'u1'))
    await data.saveWeight(makeWeight('w1', 'u1', 'petA', '2026-09-01', 700))
    await resetAllData()
    assert.deepEqual(await data.listUsers(), [])
    assert.deepEqual(await data.listPets('u1'), [])
    assert.deepEqual(await data.listWeights('petA'), [])
    assert.equal((await data.listPosts()).length, SEED_POSTS.length)
  })

  it('listPets 只返回该用户的档案，并按创建时间正序', async () => {
    await data.saveUser(makeUser('u1'))
    await data.saveUser(makeUser('u2'))
    await data.savePet({ ...makePet('p2', 'u1'), createdAt: now + 2000 })
    await data.savePet({ ...makePet('p1', 'u1'), createdAt: now + 1000 })
    await data.savePet({ ...makePet('p9', 'u2'), createdAt: now + 500 })
    assert.deepEqual(
      (await data.listPets('u1')).map((p) => p.id),
      ['p1', 'p2'],
    )
    assert.deepEqual(
      (await data.listPets('u2')).map((p) => p.id),
      ['p9'],
    )
  })

  it('记录查询按 petId 隔离，互不串数据（验收 F8）', async () => {
    await data.saveWeight(makeWeight('w1', 'u1', 'petA', '2026-09-01', 700))
    await data.saveWeight(makeWeight('w2', 'u1', 'petB', '2026-09-02', 800))
    await data.saveWeight(makeWeight('w3', 'u1', 'petA', '2026-09-03', 750))
    const a = await data.listWeights('petA')
    assert.deepEqual(
      a.map((w) => w.id),
      ['w1', 'w3'],
    )
    assert.equal(a.length, 2)
    assert.deepEqual(
      (await data.listWeights('petB')).map((w) => w.id),
      ['w2'],
    )
  })

  it('体重按日期正序返回，便于绘制曲线与计算首末变化', async () => {
    await data.saveWeight(makeWeight('w3', 'u1', 'petA', '2026-09-03', 750))
    await data.saveWeight(makeWeight('w1', 'u1', 'petA', '2026-09-01', 700))
    await data.saveWeight(makeWeight('w2', 'u1', 'petA', '2026-09-02', 800))
    assert.deepEqual(
      (await data.listWeights('petA')).map((w) => w.date),
      ['2026-09-01', '2026-09-02', '2026-09-03'],
    )
  })

  it('删除猪猪档案会级联删除该猪的全部记录，且不影响其他猪（验收 F9）', async () => {
    await data.savePet(makePet('petA', 'u1'))
    await data.savePet(makePet('petB', 'u1'))
    await data.saveWeight(makeWeight('wa', 'u1', 'petA', '2026-09-01', 700))
    await data.saveWeight(makeWeight('wb', 'u1', 'petB', '2026-09-01', 700))
    await data.saveDiary(makeDiary('da', 'u1', 'petA'))
    await data.saveDiary(makeDiary('db', 'u1', 'petB'))
    await data.saveHealth(makeHealth('ha', 'u1', 'petA'))
    await data.saveTodo(makeTodo('ta', 'u1', 'petA'))
    await data.savePhoto({ id: 'pa', userId: 'u1', petId: 'petA', dataUrl: 'x', caption: '', date: '2026-09-01', createdAt: now })
    await data.savePhoto({ id: 'pb', userId: 'u1', petId: 'petB', dataUrl: 'x', caption: '', date: '2026-09-01', createdAt: now })

    await data.deletePet('petA')

    assert.deepEqual(
      (await data.listPets('u1')).map((p) => p.id),
      ['petB'],
    )
    assert.deepEqual(await data.listWeights('petA'), [])
    assert.deepEqual(await data.listDiaries('petA'), [])
    assert.deepEqual(await data.listHealths('petA'), [])
    assert.deepEqual(await data.listTodos('petA'), [])
    assert.deepEqual(
      (await data.listPhotos('u1')).map((p) => p.id),
      ['pb'],
    )
    // 另一只猪的数据必须完好
    assert.deepEqual(
      (await data.listWeights('petB')).map((w) => w.id),
      ['wb'],
    )
    assert.deepEqual(
      (await data.listDiaries('petB')).map((d) => d.id),
      ['db'],
    )
  })

  it('删帖会连带删除该帖的全部回复，其他帖子不受影响（验收 G7）', async () => {
    await data.deletePost('p1')
    const posts = await data.listPosts()
    assert.equal(posts.some((p) => p.id === 'p1'), false)
    const comments = await data.listComments()
    assert.equal(comments.some((c) => c.postId === 'p1'), false)
    assert.ok(comments.some((c) => c.postId === 'p2'), '其他帖子的回复不应被删除')
  })

  it('购物车与订单按用户隔离，clearCart 只清自己的（验收 H5）', async () => {
    await data.saveCartItem({ id: 'c1', userId: 'u1', productId: 'pr1', qty: 2 })
    await data.saveCartItem({ id: 'c2', userId: 'u1', productId: 'pr2', qty: 1 })
    await data.saveCartItem({ id: 'c3', userId: 'u2', productId: 'pr1', qty: 5 })
    assert.equal((await data.listCart('u1')).reduce((s, i) => s + i.qty, 0), 3)
    await data.clearCart('u1')
    assert.deepEqual(await data.listCart('u1'), [])
    assert.equal((await data.listCart('u2')).length, 1)

    await data.saveOrder({
      id: 'o1',
      userId: 'u1',
      items: [{ productId: 'pr1', name: '草', price: 39.9, qty: 1, image: 'x' }],
      total: 39.9,
      status: '已下单',
      address: '本机演示订单（未填写收货地址）',
      createdAt: now,
    })
    assert.equal((await data.listOrders('u1')).length, 1)
    assert.equal((await data.listOrders('u2')).length, 0)
  })

  it('论坛列表按创建时间倒序，回复按时间正序', async () => {
    const posts = await data.listPosts()
    for (let i = 1; i < posts.length; i += 1) {
      assert.ok(posts[i - 1].createdAt >= posts[i].createdAt, '帖子应按时间倒序')
    }
    const comments = await data.listComments('p1')
    for (let i = 1; i < comments.length; i += 1) {
      assert.ok(comments[i - 1].createdAt <= comments[i].createdAt, '回复应按时间正序')
    }
  })

  it('密码哈希稳定且不同密码结果不同', () => {
    assert.equal(hashPassword('abc123'), hashPassword('abc123'))
    assert.notEqual(hashPassword('abc123'), hashPassword('abc124'))
  })
})
