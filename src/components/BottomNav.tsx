import { useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppContext'

/** 底部导航：首页 / 论坛 / 快速记录（弹层） / 商城 / 账户 */
export function BottomNav({ onQuickRecord }: { onQuickRecord: () => void }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { cartCount } = useApp()

  const homeOn = pathname === '/'
  const forumOn = pathname.startsWith('/forum')
  const shopOn = pathname.startsWith('/shop')
  const accountOn = pathname.startsWith('/account')

  return (
    <nav className="bottom-nav">
      <button
        className={`bottom-nav__item${homeOn ? ' bottom-nav__item--on' : ''}`}
        onClick={() => navigate('/')}
      >
        <span className="bottom-nav__icon">🏠</span>
        <span>首页</span>
      </button>

      <button
        className={`bottom-nav__item${forumOn ? ' bottom-nav__item--on' : ''}`}
        onClick={() => navigate('/forum')}
      >
        <span className="bottom-nav__icon">💬</span>
        <span>论坛</span>
      </button>

      <button className="bottom-nav__item" onClick={onQuickRecord}>
        <span className="bottom-nav__center">
          <span className="bottom-nav__center-icon">＋</span>
        </span>
        <span className="bottom-nav__center-label">记录</span>
      </button>

      <button
        className={`bottom-nav__item${shopOn ? ' bottom-nav__item--on' : ''}`}
        onClick={() => navigate('/shop')}
      >
        <span className="bottom-nav__icon">
          🛒
          {cartCount > 0 ? <span className="bottom-nav__badge">{cartCount}</span> : null}
        </span>
        <span>商城</span>
      </button>

      <button
        className={`bottom-nav__item${accountOn ? ' bottom-nav__item--on' : ''}`}
        onClick={() => navigate('/account')}
      >
        <span className="bottom-nav__icon">👤</span>
        <span>账户</span>
      </button>
    </nav>
  )
}
