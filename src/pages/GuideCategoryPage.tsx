import { useNavigate, useParams } from 'react-router-dom'
import { Empty, TopBar } from '../components/ui'
import { GUIDE_CATEGORIES, articlesOfCategory } from '../data/seed'

export default function GuideCategoryPage() {
  const { catId = '' } = useParams()
  const navigate = useNavigate()
  const category = GUIDE_CATEGORIES.find((c) => c.id === catId)
  const articles = articlesOfCategory(catId)

  return (
    <div className="page page--plain">
      <TopBar title={category?.name ?? '指南'} onBack={() => navigate('/guide')} />

      <div className="section" style={{ marginTop: 12 }}>
        {category ? (
          <div className="card" style={{ background: `${category.color}1f` }}>
            <div style={{ fontSize: 26 }}>{category.icon}</div>
            <div style={{ fontSize: 17, fontWeight: 800, marginTop: 6 }}>{category.name}</div>
            <div className="fs-13 text-2 mt-8">{category.desc}</div>
          </div>
        ) : null}
      </div>

      {catId === 'breeding' ? (
        <div className="section">
          <button className="btn btn--primary btn--block" onClick={() => navigate('/matches')}>
            💕 去「本地相猪」看看同城的猪猪 ›
          </button>
        </div>
      ) : null}

      {articles.length === 0 ? (
        <Empty icon="📄" text="这个分类还没有文章" />
      ) : (
        <div className="section list">
          {articles.map((a) => (
            <div className="row" key={a.id} onClick={() => navigate(`/guide/a/${a.id}`)}>
              <img className="row__thumb" src={a.cover} alt={a.title} />
              <div className="row__body">
                <div className="row__title">{a.title}</div>
                <div className="row__sub">{a.summary}</div>
              </div>
              <span className="row__action">›</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
