import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import { cleanup, fireEvent } from '@testing-library/react'
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

const REMEMBER_KEY = 'haoming-xiaozhu.remember'

/**
 * 阶段2 · 批次A（纯净态：无任何猪猪档案）
 * 对应验收 A1–A7 与 PRD 2.4 / 2.5
 */

function loginInputs(root: ParentNode) {
  return {
    username: must<HTMLInputElement>(root, 'input[placeholder="输入用户名"]'),
    password: must<HTMLInputElement>(root, 'input[placeholder="输入密码"]'),
  }
}

function registerInputs(root: ParentNode) {
  return {
    username: must<HTMLInputElement>(root, 'input[placeholder="用户名就是你在论坛的昵称"]'),
    password: must<HTMLInputElement>(root, 'input[placeholder="至少 4 位"]'),
  }
}

function submit(root: ParentNode, label: string) {
  const btn = [...root.querySelectorAll('button[type="submit"]')].find((b) =>
    (b.textContent ?? '').includes(label),
  )
  assert.ok(btn, `未找到提交按钮「${label}」`)
  fireEvent.click(btn)
}

function setValue(el: HTMLInputElement, value: string) {
  fireEvent.change(el, { target: { value } })
}

async function mountLogin() {
  const view = await renderApp('/login', { authed: false })
  await waitForText(view.container, '记住账号密码')
  return view
}

function switchToRegister(root: ParentNode) {
  const btn = [...root.querySelectorAll('b')].find((b) => (b.textContent ?? '').includes('注册一个'))
  assert.ok(btn, '未找到「注册一个」切换入口')
  fireEvent.click(btn)
}

async function doLogin(root: ParentNode, username: string, password: string) {
  const inputs = loginInputs(root)
  setValue(inputs.username, username)
  setValue(inputs.password, password)
  submit(root, '登录')
}

describe('阶段2 批次A · 登录与路由守卫', () => {
  beforeEach(async () => {
    window.localStorage.clear()
    await resetStore()
  })

  it('未登录访问任意受保护页面都跳转登录页（验收 A1）', async () => {
    for (const path of ['/', '/account', '/record/diary', '/pets', '/shop/cart', '/forum/new']) {
      const view = await renderApp(path, { authed: false })
      await waitForText(view.container, '记住账号密码')
      assert.equal(view.container.querySelector('.login__title')?.textContent, '好命小猪')
      view.unmount()
      cleanup()
    }
  })

  it('注册用户名 1 个字符时提示长度不足（验收 A2）', async () => {
    const view = await mountLogin()
    switchToRegister(view.container)
    const inputs = registerInputs(view.container)
    setValue(inputs.username, 'a')
    setValue(inputs.password, '1234')
    submit(view.container, '注册并进入')
    await waitForText(view.container, '用户名至少 2 个字符')
  })

  it('注册密码 3 位时提示长度不足（验收 A3）', async () => {
    const view = await mountLogin()
    switchToRegister(view.container)
    const inputs = registerInputs(view.container)
    setValue(inputs.username, 'xiaozhu')
    setValue(inputs.password, '123')
    submit(view.container, '注册并进入')
    await waitForText(view.container, '密码至少 4 位')
  })

  it('重复用户名注册会提示已被注册（验收 A4）', async () => {
    await seedUser()
    const view = await mountLogin()
    switchToRegister(view.container)
    const inputs = registerInputs(view.container)
    setValue(inputs.username, QA_USERNAME)
    setValue(inputs.password, '1234')
    submit(view.container, '注册并进入')
    await waitForText(view.container, '这个用户名已经被注册了')
  })

  it('注册成功后自动进入首页（验收 A5）', async () => {
    const view = await mountLogin()
    switchToRegister(view.container)
    const inputs = registerInputs(view.container)
    setValue(inputs.username, 'xiaozhu')
    setValue(inputs.password, '1234')
    submit(view.container, '注册并进入')
    await waitForText(view.container, '你好，xiaozhu 🐹')
  })

  it('正确登录后进入首页并在底部显示「你好，昵称 🐹」（验收 A5）', async () => {
    await seedUser()
    const view = await mountLogin()
    await doLogin(view.container, QA_USERNAME, QA_PASSWORD)
    await waitForText(view.container, '你好，qa 🐹')
    assert.ok(view.container.textContent?.includes('分类指南'), '应进入首页')
    // 底部导航存在（受保护页面才有的 TabLayout）
    assert.ok(view.container.querySelector('.bottom-nav'), '登录后应显示底部导航')
  })

  it('勾选「记住账号密码」后刷新，账号密码回填且勾选框选中（验收 A6）', async () => {
    await seedUser()
    const view = await mountLogin()
    fireEvent.click(must<HTMLInputElement>(view.container, 'input[type="checkbox"]'))
    await doLogin(view.container, QA_USERNAME, QA_PASSWORD)
    await waitForText(view.container, '你好，qa 🐹')

    const saved = window.localStorage.getItem(REMEMBER_KEY)
    assert.ok(saved, '勾选记住密码后应写入本机 localStorage')
    assert.deepEqual(JSON.parse(saved), { username: QA_USERNAME, password: QA_PASSWORD })

    // 刷新等价于全新挂载
    view.unmount()
    cleanup()
    const refreshed = await mountLogin()
    await until(
      () =>
        must<HTMLInputElement>(refreshed.container, 'input[placeholder="输入用户名"]').value ===
        QA_USERNAME,
      '用户名被自动回填',
    )
    assert.equal(
      must<HTMLInputElement>(refreshed.container, 'input[placeholder="输入密码"]').value,
      QA_PASSWORD,
      '密码应被自动回填',
    )
    assert.equal(
      must<HTMLInputElement>(refreshed.container, 'input[type="checkbox"]').checked,
      true,
      '记住账号密码的勾选框应保持选中',
    )
  })

  it('不勾选「记住账号密码」时不写入本机（验收 A6 反向）', async () => {
    await seedUser()
    const view = await mountLogin()
    await doLogin(view.container, QA_USERNAME, QA_PASSWORD)
    await waitForText(view.container, '你好，qa 🐹')
    assert.equal(window.localStorage.getItem(REMEMBER_KEY), null)
  })

  it('刷新页面后需要重新登录（验收 A7，登录态只存内存）', async () => {
    await seedUser()
    const view = await mountLogin()
    await doLogin(view.container, QA_USERNAME, QA_PASSWORD)
    await waitForText(view.container, '你好，qa 🐹')

    view.unmount()
    cleanup()
    const refreshed = await renderApp('/', { authed: false })
    await waitForText(refreshed.container, '记住账号密码')
  })

  it('登录页提供微信/抖音授权占位，点击提示待接入（PRD 2.4）', async () => {
    const view = await mountLogin()
    assert.ok(view.container.textContent?.includes('其他方式登录'))
    const wechat = [...view.container.querySelectorAll('button')].find((b) =>
      (b.textContent ?? '').includes('微信登录'),
    )
    assert.ok(wechat, '应有微信登录入口')
    fireEvent.click(wechat)
    await waitForText(document.body, '微信授权需接入开放平台，本机版请先用账号密码登录')

    const douyin = [...view.container.querySelectorAll('button')].find((b) =>
      (b.textContent ?? '').includes('抖音登录'),
    )
    assert.ok(douyin, '应有抖音登录入口')
    fireEvent.click(douyin)
    await waitForText(document.body, '抖音授权需接入开放平台，本机版请先用账号密码登录')
  })

  it('用户名不存在与密码错误都有明确提示', async () => {
    await seedUser()
    const view = await mountLogin()
    await doLogin(view.container, 'nobody', 'whatever')
    await waitForText(view.container, '这个用户名还没有注册过')

    await doLogin(view.container, QA_USERNAME, 'wrong-password')
    await waitForText(view.container, '密码不对，再试一次')
  })
})
