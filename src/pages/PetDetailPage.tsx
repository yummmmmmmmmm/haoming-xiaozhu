import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Empty, TopBar, ageText, daysToBirthday } from '../components/ui'
import { data } from '../data/repo'
import { useApp } from '../store/AppContext'

export default function PetDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { pets, toast } = useApp()
  const pet = pets.find((p) => p.id === id)

  const [weightCount, setWeightCount] = useState(0)
  const [latestWeight, setLatestWeight] = useState<number | null>(null)
  const [birthCount, setBirthCount] = useState(0)
  const [photoCount, setPhotoCount] = useState(0)
  const [healthCount, setHealthCount] = useState(0)
  const [diaryCount, setDiaryCount] = useState(0)
  const [todoCount, setTodoCount] = useState(0)

  useEffect(() => {
    if (!pet) return
    Promise.all([
      data.listWeights(pet.id),
      data.listBirths(pet.id),
      data.listPhotos(pet.userId),
      data.listHealths(pet.id),
      data.listDiaries(pet.id),
      data.listTodos(pet.id),
    ])
      .then(([weights, births, photos, healths, diaries, todos]) => {
        setWeightCount(weights.length)
        setLatestWeight(weights.length ? weights[weights.length - 1].weight : null)
        setBirthCount(births.length)
        setPhotoCount(photos.filter((p) => p.petId === pet.id).length)
        setHealthCount(healths.length)
        setDiaryCount(diaries.length)
        setTodoCount(todos.filter((t) => !t.done).length)
      })
      .catch(() => undefined)
  }, [pet])

  if (!pet) {
    return (
      <div className="page page--plain">
        <TopBar title="档案" onBack={() => navigate('/pets')} />
        <Empty icon="🐹" text="没找到这个档案" />
      </div>
    )
  }

  const days = daysToBirthday(pet.birthday)

  return (
    <div className="page page--plain">
      <TopBar
        title={pet.name}
        onBack={() => navigate('/pets')}
        right={
          <button className="icon-btn" onClick={() => navigate(`/pets/edit/${pet.id}`)} aria-label="编辑">
            ✏️
          </button>
        }
      />

      <div className="section" style={{ marginTop: 12 }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <img
            src={pet.avatar}
            alt={pet.name}
            style={{ width: 92, height: 92, borderRadius: 26, objectFit: 'cover', margin: '0 auto' }}
          />
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 10 }}>{pet.name}</div>
          <div className="fs-13 text-2">
            {pet.breed} · {pet.gender} · {pet.color}
          </div>
          <div className="flex-center gap-8" style={{ justifyContent: 'center', marginTop: 10 }}>
            <span className="tag">🎂 {ageText(pet.birthday)}</span>
            {days !== null && days <= 30 ? (
              <span className="tag tag--green">还有 {days} 天生日</span>
            ) : null}
          </div>
          {pet.note ? <div className="fs-13 text-2 mt-12">{pet.note}</div> : null}
        </div>

        <div className="hero-stats">
          <div className="stat">
            <div className="stat__num">{latestWeight !== null ? `${latestWeight}g` : '—'}</div>
            <div className="stat__label">最新体重</div>
          </div>
          <div className="stat">
            <div className="stat__num">{birthCount}</div>
            <div className="stat__label">生产记录</div>
          </div>
          <div className="stat">
            <div className="stat__num">{photoCount}</div>
            <div className="stat__label">相册照片</div>
          </div>
        </div>

        <div className="list mt-16">
          <div className="row" onClick={() => navigate('/record/weight')}>
            <div className="row__thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
              ⚖️
            </div>
            <div className="row__body">
              <div className="row__title">体重记录</div>
              <div className="row__sub">已记录 {weightCount} 次 · 查看趋势曲线</div>
            </div>
            <span className="row__action">›</span>
          </div>

          <div className="row" onClick={() => navigate('/record/birth')}>
            <div className="row__thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
              🎂
            </div>
            <div className="row__body">
              <div className="row__title">生日与生产记录</div>
              <div className="row__sub">配种 / 怀孕 / 生产 · 共 {birthCount} 条</div>
            </div>
            <span className="row__action">›</span>
          </div>

          <div className="row" onClick={() => navigate('/record/health')}>
            <div className="row__thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
              💉
            </div>
            <div className="row__body">
              <div className="row__title">健康打卡</div>
              <div className="row__sub">疫苗 / 驱虫 / 就医 · 共 {healthCount} 条</div>
            </div>
            <span className="row__action">›</span>
          </div>

          <div className="row" onClick={() => navigate('/record/diary')}>
            <div className="row__thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
              📔
            </div>
            <div className="row__body">
              <div className="row__title">饲养日记</div>
              <div className="row__sub">记录了 {diaryCount} 篇小日常</div>
            </div>
            <span className="row__action">›</span>
          </div>

          <div className="row" onClick={() => navigate('/record/todo')}>
            <div className="row__thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
              ⏰
            </div>
            <div className="row__body">
              <div className="row__title">待办提醒</div>
              <div className="row__sub">
                {todoCount > 0 ? `${todoCount} 件待完成` : '暂无待办'}
              </div>
            </div>
            <span className="row__action">›</span>
          </div>

          <div className="row" onClick={() => navigate('/album')}>
            <div className="row__thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
              🖼️
            </div>
            <div className="row__body">
              <div className="row__title">相册</div>
              <div className="row__sub">{photoCount} 张照片</div>
            </div>
            <span className="row__action">›</span>
          </div>
        </div>

        <button
          className="btn btn--ghost btn--block mt-16"
          onClick={() => {
            toast(`记得多陪陪${pet.name}哦 🐹`)
          }}
        >
          {pet.name} 的专属档案
        </button>
      </div>
    </div>
  )
}
