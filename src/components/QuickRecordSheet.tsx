import { useNavigate } from 'react-router-dom'
import { Sheet } from './ui'

const MODULES = [
  { key: 'birth', icon: '🎂', label: '生日', desc: '生日 / 生产', to: '/record/birth' },
  { key: 'weight', icon: '⚖️', label: '体重', desc: '记录体重变化', to: '/record/weight' },
  { key: 'album', icon: '🖼️', label: '相册', desc: '存下可爱瞬间', to: '/album' },
  { key: 'health', icon: '💉', label: '健康打卡', desc: '疫苗 / 驱虫 / 就医', to: '/record/health' },
  { key: 'diary', icon: '📔', label: '饲养日记', desc: '今天的小心情', to: '/record/diary' },
  { key: 'todo', icon: '⏰', label: '待办提醒', desc: '喂食 / 换垫料', to: '/record/todo' },
]

/** 快速记录弹层：生日 / 体重 / 相册 / 健康打卡 / 饲养日记 / 待办提醒 */
export function QuickRecordSheet({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const navigate = useNavigate()
  return (
    <Sheet open={open} onClose={onClose}>
      <div className="sheet__title">快速记录</div>
      <div className="sheet__sub">今天想给猪猪记点什么？</div>
      <div className="quick-grid">
        {MODULES.map((m) => (
          <button
            className="quick-item"
            key={m.key}
            onClick={() => {
              onClose()
              navigate(m.to)
            }}
          >
            <span className="quick-item__icon">{m.icon}</span>
            <span className="quick-item__label">{m.label}</span>
            <span className="quick-item__desc">{m.desc}</span>
          </button>
        ))}
      </div>
    </Sheet>
  )
}
