import assert from 'node:assert/strict'
import { useEffect, useState, type ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { render, type RenderResult } from '@testing-library/react'
import App from '../../src/App'
import { data, hashPassword, newId, resetAllData } from '../../src/data/repo'
import { AppProvider, useApp } from '../../src/store/AppContext'
import type { Pet, User } from '../../src/types'

/**
 * 组件测试脚手架
 * - resetStore：清空本机数据并恢复示例帖，保证每个用例从同一基线出发
 * - seedUser / seedPet：按需要预置数据
 * - renderApp：挂载真实的 App（含路由与 RequireAuth），可选是否已登录
 */

export const QA_USERNAME = 'qa'
export const QA_PASSWORD = 'qa1234'
export const LOADING_TEXT = '好命小猪加载中…'

export async function resetStore(): Promise<void> {
  await resetAllData()
}

export async function seedUser(
  username = QA_USERNAME,
  password = QA_PASSWORD,
): Promise<User> {
  const user: User = {
    id: newId('u'),
    username,
    password: hashPassword(password),
    nickname: username,
    avatar: '',
    signature: '',
    createdAt: Date.now(),
  }
  await data.saveUser(user)
  return user
}

// listPets 按 createdAt 升序决定"默认猪猪"，若多次 seedPet 落在同一毫秒，
// 排序退化为主键顺序，用例结果将不确定。这里保证每次 seedPet 的 createdAt 严格递增。
let lastPetCreatedAt = 0

export async function seedPet(userId: string, patch: Partial<Pet> = {}): Promise<Pet> {
  const now = Date.now()
  lastPetCreatedAt = now > lastPetCreatedAt ? now : lastPetCreatedAt + 1
  const pet: Pet = {
    id: newId('pet'),
    userId,
    name: '布丁',
    avatar: '',
    breed: '美国短毛',
    gender: '母',
    birthday: '2025-06-01',
    color: '三花',
    note: '',
    createdAt: lastPetCreatedAt,
    ...patch,
  }
  await data.savePet(pet)
  return pet
}

/** 在指定根节点内查找元素，找不到直接失败，错误信息保持简短 */
export function must<T extends Element = Element>(root: ParentNode, selector: string): T {
  const el = root.querySelector(selector)
  assert.ok(el, `未找到元素：${selector}`)
  return el as unknown as T
}

/**
 * 轮询等待条件成立。
 * 说明：@testing-library 的 waitFor 在本项目（非 vitest 的 node:test 环境）下会失控
 * 并耗尽内存，因此这里用真实定时器实现一个等价且可控的等待。
 */
export async function until(
  predicate: () => boolean,
  label: string,
  timeout = 5000,
): Promise<void> {
  const deadline = Date.now() + timeout
  for (;;) {
    if (predicate()) return
    if (Date.now() > deadline) throw new Error(`等待超时：${label}`)
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
}

/** 等待某个根节点内出现指定文案（避免使用全局 screen 造成多实例干扰） */
export async function waitForText(
  root: ParentNode,
  text: string,
  timeout = 5000,
): Promise<void> {
  await until(() => (root.textContent ?? '').includes(text), `页面上出现「${text}」`, timeout)
}

/**
 * 自动用预置账号登录，避免每个路由用例都手写一遍登录流程。
 * 只在首次登录时介入：一旦登录过就让出控制权，
 * 这样「退出登录 / 重置数据」后的行为与真实应用一致（会回到登录页）。
 */
function AutoLogin({
  children,
  username,
  password,
}: {
  children: ReactNode
  username: string
  password: string
}) {
  const { ready, currentUser, login } = useApp()
  const [loggedOnce, setLoggedOnce] = useState(false)
  useEffect(() => {
    if (loggedOnce || !ready || currentUser) return
    void login(username, password)
      .then(() => setLoggedOnce(true))
      .catch(() => undefined)
  }, [loggedOnce, ready, currentUser, login, username, password])
  if (!loggedOnce && !currentUser) return <div className="loading">{LOADING_TEXT}</div>
  return <>{children}</>
}

export async function renderApp(
  path: string,
  options: { authed?: boolean; username?: string; password?: string } = {},
): Promise<RenderResult> {
  const authed = options.authed ?? true
  const result = render(
    <MemoryRouter initialEntries={[path]}>
      <AppProvider>{authed ? (
        <AutoLogin
          username={options.username ?? QA_USERNAME}
          password={options.password ?? QA_PASSWORD}
        >
          <App />
        </AutoLogin>
      ) : (
        <App />
      )}</AppProvider>
    </MemoryRouter>,
  )
  await until(
    () => result.container.querySelector('.loading') === null,
    `页面 ${path} 完成加载`,
    5000,
  )
  return result
}
