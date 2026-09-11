import { useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppContext'

/** 多只荷兰猪的切换条 */
export function PetSwitcher({ showAdd = true }: { showAdd?: boolean }) {
  const { pets, activePetId, setActivePetId } = useApp()
  const navigate = useNavigate()

  if (pets.length === 0) return null

  return (
    <div className="hscroll" style={{ padding: '2px 0' }}>
      {pets.map((p) => (
        <button
          key={p.id}
          className={`chip flex-center gap-8${p.id === activePetId ? ' chip--on' : ''}`}
          onClick={() => setActivePetId(p.id)}
        >
          <img
            src={p.avatar}
            alt={p.name}
            style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover' }}
          />
          {p.name}
        </button>
      ))}
      {showAdd ? (
        <button className="chip" onClick={() => navigate('/pets/edit/new')}>
          ＋ 添加
        </button>
      ) : null}
    </div>
  )
}

/** 还没有荷兰猪时的提示 */
export function NoPet() {
  const navigate = useNavigate()
  return (
    <div className="empty">
      <div className="empty__icon">🐹</div>
      <div style={{ marginBottom: 14 }}>还没有添加荷兰猪，先建个档案吧</div>
      <button className="btn btn--primary" onClick={() => navigate('/pets/edit/new')}>
        添加我的第一只猪
      </button>
    </div>
  )
}
