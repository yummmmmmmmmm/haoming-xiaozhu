import { useNavigate } from 'react-router-dom'
import { SmartDiagnose } from '../components/SmartDiagnose'
import { TopBar } from '../components/ui'
import { GUIDE_ARTICLES, GUIDE_CATEGORIES, articlesOfCategory } from '../data/seed'

export default function GuidePage() {
  const navigate = useNavigate()

  return (
    <div className="page">
      <TopBar title="饲养指南" onBack={() => navigate(-1)} />

      <div className="section" style={{ marginTop: 12 }}>
        <div className="card hero-card">
          <div style={{ fontSize: 16, fontWeight: 800 }}>🐹 荷兰猪饲养指南</div>
          <div className="fs-13 text-2 mt-8">
            从接回家到日常护理，这里整理了荷兰猪饲养最常遇到的问题。先看「新手必看」，再按需要查阅。
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-title" style={{ marginBottom: 10 }}>
          📚 按主题查看
        </div>
        <div className="list">
          {GUIDE_CATEGORIES.map((c) => {
            const count = articlesOfCategory(c.id).length
            return (
              <div className="row" key={c.id} onClick={() => navigate(`/guide/c/${c.id}`)}>
                <div
                  className="row__thumb"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24,
                    background: `${c.color}26`,
                  }}
                >
                  {c.icon}
                </div>
                <div className="row__body">
                  <div className="row__title">{c.name}</div>
                  <div className="row__sub">
                    {c.desc} · {count} 篇
                  </div>
                </div>
                <span className="row__action">›</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="section">
        <SmartDiagnose />
      </div>

      <div className="section">
        <div className="section-title" style={{ marginBottom: 10 }}>
          📄 全部文章（{GUIDE_ARTICLES.length}）
        </div>
        <div className="list">
          {GUIDE_ARTICLES.map((a) => {
            const cat = GUIDE_CATEGORIES.find((c) => c.id === a.categoryId)
            return (
              <div className="row" key={a.id} onClick={() => navigate(`/guide/a/${a.id}`)}>
                <img className="row__thumb" src={a.cover} alt={a.title} />
                <div className="row__body">
                  <div className="row__title">{a.title}</div>
                  <div className="row__sub">
                    {cat?.icon} {cat?.name} · {a.summary}
                  </div>
                </div>
                <span className="row__action">›</span>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}
