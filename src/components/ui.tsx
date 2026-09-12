import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { useApp } from '../store/AppContext'

/**
 * 品牌标记：一只极简的荷兰猪侧脸（耳朵 + 圆头 + 粉鼻）。
 * 鼻尖用「粉鼻色」点一下，是全站最小的彩蛋之一。
 */
function BrandMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="6.6" cy="8.2" r="3" fill="currentColor" opacity="0.45" />
      <circle cx="17.4" cy="8.2" r="3" fill="currentColor" opacity="0.45" />
      <path
        d="M12 5.2c4.9 0 8.2 3.1 8.2 7.2 0 4.2-3.4 6.9-8.2 6.9S3.8 16.6 3.8 12.4c0-4.1 3.3-7.2 8.2-7.2Z"
        fill="currentColor"
      />
      <ellipse cx="12" cy="12.8" rx="1.7" ry="1.3" fill="#d98b7e" />
    </svg>
  )
}

// ---------------- 顶部栏 ----------------
export function TopBar({
  title,
  onBack,
  right,
  brand,
}: {
  title?: string
  onBack?: () => void
  right?: ReactNode
  brand?: boolean
}) {
  return (
    <header className="topbar">
      <div className="topbar__side">
        {onBack ? (
          <button className="icon-btn" onClick={onBack} aria-label="返回">
            <ChevronLeft size={20} strokeWidth={1.75} />
          </button>
        ) : null}
      </div>
      {brand ? (
        <div className="brand" style={{ flex: 1 }}>
          <div className="brand__logo">
            <BrandMark />
          </div>
          <div className="brand__name">好命小猪：荷兰猪社区</div>
        </div>
      ) : (
        <div className="topbar__title">{title}</div>
      )}
      <div className="topbar__side">{right}</div>
    </header>
  )
}

// ---------------- 空状态 ----------------
export function Empty({
  icon = '🐹',
  text = '这里还什么都没有',
}: {
  icon?: ReactNode
  text?: string
}) {
  return (
    <div className="empty">
      <div className="empty__icon">{icon}</div>
      <div>{text}</div>
    </div>
  )
}

// ---------------- 底部弹出层 ----------------
export function Sheet({
  open,
  onClose,
  children,
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
}) {
  if (!open) return null
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__handle" />
        {children}
      </div>
    </div>
  )
}

// ---------------- 居中弹窗 ----------------
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  if (!open) return null
  return (
    <div className="overlay overlay--center" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__title">{title}</div>
        {children}
      </div>
    </div>
  )
}

// ---------------- 轻提示 ----------------
export function Toasts() {
  const { toasts } = useApp()
  return (
    <div className="toast-wrap">
      {toasts.map((t) => (
        <div className="toast" key={t.id}>
          {t.text}
        </div>
      ))}
    </div>
  )
}

// ---------------- 相对时间 ----------------
export function relativeTime(ts: number): string {
  const diff = Date.now() - ts
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min} 分钟前`
  const hour = Math.floor(min / 60)
  if (hour < 24) return `${hour} 小时前`
  const day = Math.floor(hour / 24)
  if (day < 30) return `${day} 天前`
  const d = new Date(ts)
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日`
}

/** 由生日换算年龄文案 */
export function ageText(birthday: string): string {
  if (!birthday) return '生日未填'
  const b = new Date(birthday)
  if (Number.isNaN(b.getTime())) return '生日未填'
  const now = new Date()
  let months =
    (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth())
  if (now.getDate() < b.getDate()) months -= 1
  if (months < 0) return '还没出生？'
  const years = Math.floor(months / 12)
  const rest = months % 12
  if (years <= 0) return `${rest} 个月`
  return rest > 0 ? `${years} 岁 ${rest} 个月` : `${years} 岁`
}

/** 距离下次生日的天数 */
export function daysToBirthday(birthday: string): number | null {
  if (!birthday) return null
  const b = new Date(birthday)
  if (Number.isNaN(b.getTime())) return null
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const next = new Date(now.getFullYear(), b.getMonth(), b.getDate())
  if (next.getTime() < now.getTime()) next.setFullYear(now.getFullYear() + 1)
  return Math.round((next.getTime() - now.getTime()) / 86400000)
}
