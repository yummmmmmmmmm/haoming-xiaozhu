import { useNavigate } from 'react-router-dom'
import { TopBar, ageText } from '../components/ui'
import { useApp } from '../store/AppContext'

export default function PetsPage() {
  const navigate = useNavigate()
  const { pets, activePetId, setActivePetId } = useApp()

  return (
    <div className="page">
      <TopBar
        title="我的荷兰猪"
        onBack={() => navigate('/account')}
        right={
          <button className="icon-btn" onClick={() => navigate('/pets/edit/new')} aria-label="添加">
            ＋
          </button>
        }
      />

      {pets.length === 0 ? (
        <div className="empty">
          <div className="empty__icon">🐹</div>
          <div style={{ marginBottom: 14 }}>还没有荷兰猪，先建个档案吧</div>
          <button className="btn btn--primary" onClick={() => navigate('/pets/edit/new')}>
            添加我的第一只猪
          </button>
        </div>
      ) : (
        <div className="list" style={{ marginTop: 12 }}>
          {pets.map((p) => (
            <div
              className="row"
              key={p.id}
              onClick={() => {
                setActivePetId(p.id)
                navigate(`/pets/${p.id}`)
              }}
            >
              <img className="row__thumb" src={p.avatar} alt={p.name} />
              <div className="row__body">
                <div className="row__title">
                  {p.name}
                  {p.id === activePetId ? (
                    <span className="tag" style={{ marginLeft: 6 }}>
                      当前
                    </span>
                  ) : null}
                </div>
                <div className="row__sub">
                  {p.breed} · {p.gender} · {ageText(p.birthday)}
                </div>
              </div>
              <span className="row__action">›</span>
            </div>
          ))}
          <button
            className="btn btn--ghost btn--block mt-8"
            onClick={() => navigate('/pets/edit/new')}
          >
            ＋ 再添加一只
          </button>
        </div>
      )}
    </div>
  )
}
