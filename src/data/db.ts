// ============================================================
// 本机数据库（IndexedDB）
// 作用：把数据持久化保存在"这台电脑的浏览器"里，
//      刷新 / 关闭 / 重启后都不会丢失。
// 说明：这一层只负责"存/取"，业务不直接依赖它，
//      将来换成云端时只要替换 repository 层即可。
// ============================================================

export const STORES = [
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

export type StoreName = (typeof STORES)[number]

const DB_NAME = 'haoming-xiaozhu'
const DB_VERSION = 4

let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      for (const name of STORES) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath: 'id' })
        }
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

function tx<T>(
  store: StoreName,
  mode: IDBTransactionMode,
  run: (os: IDBObjectStore) => IDBRequest,
): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(store, mode)
        const request = run(transaction.objectStore(store))
        request.onsuccess = () => resolve(request.result as T)
        request.onerror = () => reject(request.error)
      }),
  )
}

export function getAll<T>(store: StoreName): Promise<T[]> {
  return tx<T[]>(store, 'readonly', (os) => os.getAll())
}

export function getOne<T>(store: StoreName, id: string): Promise<T | undefined> {
  return tx<T | undefined>(store, 'readonly', (os) => os.get(id))
}

export function putOne<T extends { id: string }>(store: StoreName, value: T): Promise<void> {
  return tx<void>(store, 'readwrite', (os) => os.put(value))
}

export async function putMany<T extends { id: string }>(
  store: StoreName,
  values: T[],
): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(store, 'readwrite')
    const os = transaction.objectStore(store)
    values.forEach((v) => os.put(v))
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
}

export function removeOne(store: StoreName, id: string): Promise<void> {
  return tx<void>(store, 'readwrite', (os) => os.delete(id))
}

export function clearStore(store: StoreName): Promise<void> {
  return tx<void>(store, 'readwrite', (os) => os.clear())
}

export function uid(prefix = ''): string {
  const rand = Math.random().toString(36).slice(2, 8)
  return `${prefix}${Date.now().toString(36)}${rand}`
}

export function today(): string {
  const d = new Date()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}
