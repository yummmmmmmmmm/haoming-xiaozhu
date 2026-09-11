// ============================================================
// 数据访问层（Repository）
// ------------------------------------------------------------
// 业务代码只认下面这个 DataSource 接口，不直接碰 IndexedDB。
// 将来要"上云"时，只要再写一个 CloudDataSource implements DataSource
// （内部换成 fetch 调用后端接口），把下面导出的 data 换掉即可，
// 页面代码基本不用动。这就是我们预留的上云接口。
// ============================================================

import type {
  BirthRecord,
  CartItem,
  Comment,
  DiaryRecord,
  HealthRecord,
  MatchPost,
  MatchReply,
  Message,
  Order,
  Pet,
  Photo,
  Post,
  TodoRecord,
  User,
  WeightRecord,
} from '../types'
import {
  clearStore,
  getOne,
  getAll,
  putMany,
  putOne,
  removeOne,
  today,
  uid,
} from './db'
import { SEED_COMMENTS, SEED_MATCHES, SEED_MATCH_REPLIES, SEED_POSTS } from './seed'

export interface DataSource {
  // ---- 账号 ----
  listUsers(): Promise<User[]>
  getUser(id: string): Promise<User | undefined>
  saveUser(user: User): Promise<void>

  // ---- 荷兰猪档案 ----
  listPets(userId: string): Promise<Pet[]>
  savePet(pet: Pet): Promise<void>
  deletePet(petId: string): Promise<void>

  // ---- 体重 ----
  listWeights(petId: string): Promise<WeightRecord[]>
  saveWeight(record: WeightRecord): Promise<void>
  deleteWeight(id: string): Promise<void>

  // ---- 生宝宝 ----
  listBirths(petId: string): Promise<BirthRecord[]>
  saveBirth(record: BirthRecord): Promise<void>
  deleteBirth(id: string): Promise<void>

  // ---- 相册 ----
  listPhotos(userId: string): Promise<Photo[]>
  savePhoto(photo: Photo): Promise<void>
  deletePhoto(id: string): Promise<void>

  // ---- 健康打卡 ----
  listHealths(petId: string): Promise<HealthRecord[]>
  saveHealth(record: HealthRecord): Promise<void>
  deleteHealth(id: string): Promise<void>

  // ---- 饲养日记 ----
  listDiaries(petId: string): Promise<DiaryRecord[]>
  saveDiary(record: DiaryRecord): Promise<void>
  deleteDiary(id: string): Promise<void>

  // ---- 待办提醒 ----
  listTodos(petId: string): Promise<TodoRecord[]>
  saveTodo(record: TodoRecord): Promise<void>
  deleteTodo(id: string): Promise<void>

  // ---- 论坛 ----
  listPosts(): Promise<Post[]>
  savePost(post: Post): Promise<void>
  deletePost(id: string): Promise<void>

  // ---- 论坛回复 ----
  /** 不传 postId 表示取全部（用于统计每条帖子的回复数） */
  listComments(postId?: string): Promise<Comment[]>
  saveComment(comment: Comment): Promise<void>
  deleteComment(id: string): Promise<void>

  // ---- 本地相猪 ----
  /** 全部相亲帖（新的在前）。同城筛选由调用方按 city / 用户表判断 */
  listMatches(): Promise<MatchPost[]>
  saveMatch(match: MatchPost): Promise<void>
  /** 删帖时把它的回复一起清掉 */
  deleteMatch(id: string): Promise<void>

  /** 不传 matchId 表示取全部（用于统计每条相亲帖的回复数） */
  listMatchReplies(matchId?: string): Promise<MatchReply[]>
  saveMatchReply(reply: MatchReply): Promise<void>
  deleteMatchReply(id: string): Promise<void>

  // ---- 私信 ----
  /** 与这个用户有关的全部私信（收 + 发），按时间正序 */
  listMessages(userId: string): Promise<Message[]>
  saveMessage(message: Message): Promise<void>
  /** 读完某个人发来的私信：把他的消息标记为已读 */
  markConversationRead(myId: string, otherId: string): Promise<void>

  // ---- 购物车 ----
  listCart(userId: string): Promise<CartItem[]>
  saveCartItem(item: CartItem): Promise<void>
  deleteCartItem(id: string): Promise<void>
  clearCart(userId: string): Promise<void>

  // ---- 订单 ----
  listOrders(userId: string): Promise<Order[]>
  saveOrder(order: Order): Promise<void>
}

function byCreatedDesc<T extends { createdAt: number }>(list: T[]): T[] {
  return [...list].sort((a, b) => b.createdAt - a.createdAt)
}

class LocalDataSource implements DataSource {
  async listUsers(): Promise<User[]> {
    return getAll<User>('users')
  }

  async getUser(id: string): Promise<User | undefined> {
    return getOne<User>('users', id)
  }

  async saveUser(user: User): Promise<void> {
    return putOne('users', user)
  }

  async listPets(userId: string): Promise<Pet[]> {
    const all = await getAll<Pet>('pets')
    return all.filter((p) => p.userId === userId).sort((a, b) => a.createdAt - b.createdAt)
  }

  async savePet(pet: Pet): Promise<void> {
    return putOne('pets', pet)
  }

  async deletePet(petId: string): Promise<void> {
    // 先级联删除该猪的所有记录，再删档案
    const [weights, births, photos, healths, diaries, todos] = await Promise.all([
      getAll<WeightRecord>('weights'),
      getAll<BirthRecord>('births'),
      getAll<Photo>('photos'),
      getAll<HealthRecord>('healths'),
      getAll<DiaryRecord>('diaries'),
      getAll<TodoRecord>('todos'),
    ])
    await Promise.all([
      removeOne('pets', petId),
      ...weights.filter((w) => w.petId === petId).map((w) => removeOne('weights', w.id)),
      ...births.filter((b) => b.petId === petId).map((b) => removeOne('births', b.id)),
      ...photos.filter((p) => p.petId === petId).map((p) => removeOne('photos', p.id)),
      ...healths.filter((h) => h.petId === petId).map((h) => removeOne('healths', h.id)),
      ...diaries.filter((d) => d.petId === petId).map((d) => removeOne('diaries', d.id)),
      ...todos.filter((t) => t.petId === petId).map((t) => removeOne('todos', t.id)),
    ])
  }

  async listWeights(petId: string): Promise<WeightRecord[]> {
    const all = await getAll<WeightRecord>('weights')
    return all.filter((w) => w.petId === petId).sort((a, b) => a.date.localeCompare(b.date))
  }

  async saveWeight(record: WeightRecord): Promise<void> {
    return putOne('weights', record)
  }

  async deleteWeight(id: string): Promise<void> {
    return removeOne('weights', id)
  }

  async listBirths(petId: string): Promise<BirthRecord[]> {
    const all = await getAll<BirthRecord>('births')
    return all.filter((b) => b.petId === petId).sort((a, b) => b.date.localeCompare(a.date))
  }

  async saveBirth(record: BirthRecord): Promise<void> {
    return putOne('births', record)
  }

  async deleteBirth(id: string): Promise<void> {
    return removeOne('births', id)
  }

  async listPhotos(userId: string): Promise<Photo[]> {
    const all = await getAll<Photo>('photos')
    return byCreatedDesc(all.filter((p) => p.userId === userId))
  }

  async savePhoto(photo: Photo): Promise<void> {
    return putOne('photos', photo)
  }

  async deletePhoto(id: string): Promise<void> {
    return removeOne('photos', id)
  }

  async listHealths(petId: string): Promise<HealthRecord[]> {
    const all = await getAll<HealthRecord>('healths')
    return all
      .filter((h) => h.petId === petId)
      .sort((a, b) => b.date.localeCompare(a.date))
  }

  async saveHealth(record: HealthRecord): Promise<void> {
    return putOne('healths', record)
  }

  async deleteHealth(id: string): Promise<void> {
    return removeOne('healths', id)
  }

  async listDiaries(petId: string): Promise<DiaryRecord[]> {
    const all = await getAll<DiaryRecord>('diaries')
    return byCreatedDesc(all.filter((d) => d.petId === petId))
  }

  async saveDiary(record: DiaryRecord): Promise<void> {
    return putOne('diaries', record)
  }

  async deleteDiary(id: string): Promise<void> {
    return removeOne('diaries', id)
  }

  async listTodos(petId: string): Promise<TodoRecord[]> {
    const all = await getAll<TodoRecord>('todos')
    return [...all.filter((t) => t.petId === petId)].sort((a, b) =>
      a.dueDate.localeCompare(b.dueDate),
    )
  }

  async saveTodo(record: TodoRecord): Promise<void> {
    return putOne('todos', record)
  }

  async deleteTodo(id: string): Promise<void> {
    return removeOne('todos', id)
  }

  async listPosts(): Promise<Post[]> {
    return byCreatedDesc(await getAll<Post>('posts'))
  }

  async savePost(post: Post): Promise<void> {
    return putOne('posts', post)
  }

  async deletePost(id: string): Promise<void> {
    // 删帖时把它的回复一起清掉
    const comments = await getAll<Comment>('comments')
    await Promise.all([
      removeOne('posts', id),
      ...comments.filter((c) => c.postId === id).map((c) => removeOne('comments', c.id)),
    ])
  }

  async listComments(postId?: string): Promise<Comment[]> {
    const all = await getAll<Comment>('comments')
    const list = postId ? all.filter((c) => c.postId === postId) : all
    return [...list].sort((a, b) => a.createdAt - b.createdAt)
  }

  async saveComment(comment: Comment): Promise<void> {
    return putOne('comments', comment)
  }

  async deleteComment(id: string): Promise<void> {
    return removeOne('comments', id)
  }

  async listMatches(): Promise<MatchPost[]> {
    return byCreatedDesc(await getAll<MatchPost>('matches'))
  }

  async saveMatch(match: MatchPost): Promise<void> {
    return putOne('matches', match)
  }

  async deleteMatch(id: string): Promise<void> {
    const replies = await getAll<MatchReply>('matchReplies')
    await Promise.all([
      removeOne('matches', id),
      ...replies.filter((r) => r.matchId === id).map((r) => removeOne('matchReplies', r.id)),
    ])
  }

  async listMatchReplies(matchId?: string): Promise<MatchReply[]> {
    const all = await getAll<MatchReply>('matchReplies')
    const list = matchId ? all.filter((r) => r.matchId === matchId) : all
    return [...list].sort((a, b) => a.createdAt - b.createdAt)
  }

  async saveMatchReply(reply: MatchReply): Promise<void> {
    return putOne('matchReplies', reply)
  }

  async deleteMatchReply(id: string): Promise<void> {
    return removeOne('matchReplies', id)
  }

  async listMessages(userId: string): Promise<Message[]> {
    const all = await getAll<Message>('messages')
    return all
      .filter((m) => m.fromUserId === userId || m.toUserId === userId)
      .sort((a, b) => a.createdAt - b.createdAt)
  }

  async saveMessage(message: Message): Promise<void> {
    return putOne('messages', message)
  }

  async markConversationRead(myId: string, otherId: string): Promise<void> {
    const all = await getAll<Message>('messages')
    const unread = all.filter(
      (m) => m.toUserId === myId && m.fromUserId === otherId && !m.read,
    )
    await Promise.all(unread.map((m) => putOne('messages', { ...m, read: true })))
  }

  async listCart(userId: string): Promise<CartItem[]> {
    const all = await getAll<CartItem>('cart')
    return all.filter((c) => c.userId === userId)
  }

  async saveCartItem(item: CartItem): Promise<void> {
    return putOne('cart', item)
  }

  async deleteCartItem(id: string): Promise<void> {
    return removeOne('cart', id)
  }

  async clearCart(userId: string): Promise<void> {
    const all = await this.listCart(userId)
    await Promise.all(all.map((c) => removeOne('cart', c.id)))
  }

  async listOrders(userId: string): Promise<Order[]> {
    const all = await getAll<Order>('orders')
    return byCreatedDesc(all.filter((o) => o.userId === userId))
  }

  async saveOrder(order: Order): Promise<void> {
    return putOne('orders', order)
  }
}

/** 当前使用的数据源。将来上云时替换成 CloudDataSource 即可。 */
export const data: DataSource = new LocalDataSource()

// ============================================================
// 初始化：首次进入时把内置的论坛示例帖写入本机，形成"示例社区"
// ============================================================
const SEED_FLAG = 'seed'
const SEED_COMMENT_FLAG = 'seed-comments'
const SEED_MATCH_FLAG = 'seed-matches'
const SEED_MATCH_REPLY_FLAG = 'seed-match-replies'

export async function ensureSeedData(): Promise<void> {
  const flag = await getOne<{ id: string; value: boolean }>('meta', SEED_FLAG)
  if (!flag?.value) {
    await putMany('posts', SEED_POSTS)
    await putOne('meta', { id: SEED_FLAG, value: true })
  }
  const commentFlag = await getOne<{ id: string; value: boolean }>('meta', SEED_COMMENT_FLAG)
  if (!commentFlag?.value) {
    await putMany('comments', SEED_COMMENTS)
    await putOne('meta', { id: SEED_COMMENT_FLAG, value: true })
  }
  const matchFlag = await getOne<{ id: string; value: boolean }>('meta', SEED_MATCH_FLAG)
  if (!matchFlag?.value) {
    await putMany('matches', SEED_MATCHES)
    await putOne('meta', { id: SEED_MATCH_FLAG, value: true })
  }
  const matchReplyFlag = await getOne<{ id: string; value: boolean }>(
    'meta',
    SEED_MATCH_REPLY_FLAG,
  )
  if (!matchReplyFlag?.value) {
    await putMany('matchReplies', SEED_MATCH_REPLIES)
    await putOne('meta', { id: SEED_MATCH_REPLY_FLAG, value: true })
  }
}

/** 本机简单密码哈希（仅用于本地校验，不具备真实安全性） */
export function hashPassword(raw: string): string {
  let h = 5381
  for (let i = 0; i < raw.length; i += 1) {
    h = ((h << 5) + h + raw.charCodeAt(i)) | 0
  }
  return `h${(h >>> 0).toString(36)}`
}

export const newId = uid

export { today }

/** 清空全部本机数据（用于"重置"功能） */
export async function resetAllData(): Promise<void> {
  await Promise.all(
    (
      [
        'users',
        'pets',
        'weights',
        'births',
        'photos',
        'posts',
        'comments',
        'healths',
        'diaries',
        'todos',
        'cart',
        'orders',
        'matches',
        'matchReplies',
        'messages',
        'meta',
      ] as const
    ).map((s) => clearStore(s)),
  )
  await ensureSeedData()
}
