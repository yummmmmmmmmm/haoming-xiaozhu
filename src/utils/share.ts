/**
 * 「分享给朋友」的公共实现。
 *
 * 两个容易踩的坑：
 * 1. 路由用的是 HashRouter，location.href 会带上 #/account 这类片段。
 *    直接分享出去，朋友一打开就落在某个内页而不是首页，所以只取 origin + pathname。
 * 2. 本地预览时（localhost / 127.0.0.1 / file://）地址对朋友无效，
 *    这时不调起系统分享面板，只复制并回一个能提示的状态。
 */

export type ShareResult = 'shared' | 'copied' | 'local' | 'failed'

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', '::1']

/** 站点首页地址：剥掉 hash，避免朋友进来直接落在内页 */
export function siteUrl() {
  const { origin, pathname } = window.location
  return `${origin}${pathname}`
}

/** 是否为本机预览地址（这种地址发给朋友打不开） */
export function isLocalPreview() {
  return window.location.protocol === 'file:' || LOCAL_HOSTS.includes(window.location.hostname)
}

/** 剪贴板兜底：navigator.clipboard 只在 https / localhost 下可用 */
async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return true
  }

  const holder = document.createElement('textarea')
  holder.value = text
  holder.setAttribute('readonly', '')
  holder.style.position = 'fixed'
  holder.style.top = '-1000px'
  document.body.appendChild(holder)
  holder.select()
  let ok = false
  try {
    ok = document.execCommand('copy')
  } finally {
    document.body.removeChild(holder)
  }
  return ok
}

export async function shareApp(): Promise<ShareResult> {
  const local = isLocalPreview()
  const url = siteUrl()

  // 手机浏览器和桌面版 Chrome / Edge 都支持系统分享面板，体验比复制好
  if (!local && typeof navigator.share === 'function') {
    try {
      await navigator.share({
        title: '好命小猪',
        text: '荷兰猪饲养科普 + 猪友社群，一起记录猪猪日常',
        url,
      })
      return 'shared'
    } catch (error) {
      // 用户在系统面板里点了取消，不算失败，也不必再弹复制提示
      if ((error as DOMException | undefined)?.name === 'AbortError') return 'shared'
    }
  }

  try {
    const ok = await copyText(url)
    if (!ok) return 'failed'
    return local ? 'local' : 'copied'
  } catch {
    return 'failed'
  }
}
