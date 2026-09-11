import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { DiaryQuickAdd } from '../components/DiaryQuickAdd'
import { Empty, TopBar } from '../components/ui'
import { GUIDE_ARTICLES, GUIDE_CATEGORIES } from '../data/seed'

export default function GuideArticlePage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const article = GUIDE_ARTICLES.find((a) => a.id === id)
  const category = GUIDE_CATEGORIES.find((c) => c.id === article?.categoryId)
  const [diaryOpen, setDiaryOpen] = useState(false)

  /** 把文章摘成一段可以直接存进饲养日记的文字 */
  const diaryDraft = useMemo(() => {
    if (!article) return ''
    const headings = article.content
      .filter((p) => p.startsWith('## '))
      .map((p) => p.replace('## ', ''))
    const intro = article.content.find((p) => !p.startsWith('## ')) ?? ''
    return [
      `【饲养指南 · ${article.title}】`,
      article.summary,
      intro,
      headings.length > 0 ? `要点：${headings.join(' / ')}` : '',
    ]
      .filter(Boolean)
      .join('\n')
  }, [article])

  const related = GUIDE_ARTICLES.filter(
    (a) => a.categoryId === article?.categoryId && a.id !== article?.id,
  ).slice(0, 3)

  if (!article) {
    return (
      <div className="page page--plain">
        <TopBar title="文章" onBack={() => navigate('/guide')} />
        <Empty icon="📄" text="没找到这篇文章" />
      </div>
    )
  }

  return (
    <div className="page page--plain">
      <TopBar title={category?.name ?? '指南'} onBack={() => navigate('/guide')} />

      <div className="section" style={{ marginTop: 12 }}>
        <img className="article__cover" src={article.cover} alt={article.title} />
        <h1 className="article__title">{article.title}</h1>
        <div className="article__meta">
          {category ? (
            <span className="tag">
              {category.icon} {category.name}
            </span>
          ) : null}
          {article.tags.map((t) => (
            <span className="tag tag--blue" key={t}>
              #{t}
            </span>
          ))}
        </div>

        <div className="card">
          {article.content.map((para, i) =>
            para.startsWith('## ') ? (
              <h2 className="article__h" key={i}>
                {para.replace('## ', '')}
              </h2>
            ) : (
              <p className="article__p" key={i}>
                {para}
              </p>
            ),
          )}
        </div>

        <button className="btn btn--soft btn--block mt-12" onClick={() => setDiaryOpen(true)}>
          📔 记入饲养日记
        </button>
      </div>

      {related.length > 0 ? (
        <div className="section">
          <div className="section-title" style={{ marginBottom: 10 }}>
            相关阅读
          </div>
          <div className="list">
            {related.map((a) => (
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
        </div>
      ) : null}

      <DiaryQuickAdd
        open={diaryOpen}
        onClose={() => setDiaryOpen(false)}
        defaultContent={diaryDraft}
        source={`饲养指南 · ${article.title}`}
      />
    </div>
  )
}
