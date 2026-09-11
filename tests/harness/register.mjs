// ============================================================
// 测试环境引导（由构建产物以 banner 方式最先导入）
// 作用：在测试代码执行之前，把浏览器环境（jsdom）与
//      IndexedDB（fake-indexeddb）注入全局，供 React 组件测试使用。
// ============================================================
import { JSDOM } from 'jsdom'
import { afterEach } from 'node:test'

// 注意：@testing-library/react 必须在本文件建立好 jsdom 全局之后再加载，
// 否则它内部的 screen 会在没有 document 的情况下初始化，导致查询全部报错。
// 因此这里不能用静态 import（静态 import 会被提升到模块体之前执行）。

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://127.0.0.1:5173/',
  pretendToBeVisual: true,
})

const { window } = dom

// jsdom 未实现的 API，按测试需要补上最小实现
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  })
}
if (!window.scrollTo) window.scrollTo = () => undefined
if (!window.Element.prototype.scrollIntoView) {
  window.Element.prototype.scrollIntoView = () => undefined
}

globalThis.window = window

// 把 jsdom window 上的浏览器 API 映射到全局，供直接使用裸全局的代码调用
for (const key of Object.getOwnPropertyNames(window)) {
  if (key === 'window' || key in globalThis) continue
  let value
  try {
    value = window[key]
  } catch {
    continue
  }
  if (value === undefined) continue
  try {
    Object.defineProperty(globalThis, key, {
      value,
      writable: true,
      configurable: true,
    })
  } catch {
    // 少数只读全局跳过即可
  }
}

// Node 自带全局 File / Blob，优先级高于上面的映射结果，
// 但 jsdom 的 FileReader 只认 jsdom 自己的 Blob，所以这里统一换成 jsdom 的实现。
for (const key of ['File', 'Blob', 'FileList', 'FileReader']) {
  Object.defineProperty(globalThis, key, {
    value: window[key],
    writable: true,
    configurable: true,
  })
}

// jsdom 默认不加载图片：给 img.src 赋值后 onload / onerror 都不会触发，
// 而项目里上传照片要 await Image.onload 解码，否则测试会一直挂住。
// 这里补一个最小实现，让真实的上传流程可以在测试中跑通。
class TestImage {
  constructor() {
    this.width = 800
    this.height = 600
    this.onload = null
    this.onerror = null
    this._src = ''
  }

  get src() {
    return this._src
  }

  set src(value) {
    this._src = value
    queueMicrotask(() => {
      if (typeof this.onload === 'function') this.onload({ type: 'load' })
    })
  }
}
window.Image = TestImage
globalThis.Image = TestImage

// IndexedDB（本机数据库）在 Node 中的实现。
// 注意：fake-indexeddb/auto 检测到 window 存在时会把实现挂在 window 上，
// 而项目代码使用的是裸全局，所以这里要回填到 globalThis。
await import('fake-indexeddb/auto')
for (const key of [
  'indexedDB',
  'IDBCursor',
  'IDBCursorWithValue',
  'IDBDatabase',
  'IDBFactory',
  'IDBIndex',
  'IDBKeyRange',
  'IDBObjectStore',
  'IDBOpenDBRequest',
  'IDBRequest',
  'IDBTransaction',
  'IDBVersionChangeEvent',
]) {
  if (window[key] !== undefined) {
    Object.defineProperty(globalThis, key, {
      value: window[key],
      writable: true,
      configurable: true,
    })
  }
}

// React 18 的 act 环境标识
globalThis.IS_REACT_ACT_ENVIRONMENT = true

// 此时浏览器环境已就绪，可以安全加载 Testing Library
const { cleanup } = await import('@testing-library/react')

// 每个用例结束后卸载已挂载的 React 树
afterEach(() => {
  cleanup()
})
