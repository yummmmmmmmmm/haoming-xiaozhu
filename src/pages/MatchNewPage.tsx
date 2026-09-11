import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TopBar } from '../components/ui'
import { data, newId } from '../data/repo'
import { CITY_OPTIONS } from '../data/seed'
import { useApp } from '../store/AppContext'
import type { MatchPost } from '../types'

/** 本地相猪：发布一条"给自家猪猪找对象"的帖子 */
export default function MatchNewPage() {
  const navigate = useNavigate()
  const { currentUser, pets, activePet, updateProfile, toast } = useApp()
  const [petId, setPetId] = useState(activePet?.id ?? pets[0]?.id ?? '')
  const [requirement, setRequirement] = useState('')
  const [city, setCity] = useState(currentUser?.city ?? '')
  const [busy, setBusy] = useState(false)

  const pet = pets.find((p) => p.id === petId) ?? pets[0] ?? null

  const submit = async () => {
    if (!currentUser) return
    if (!pet) {
      toast('先添加一只荷兰猪档案吧')
      return
    }
    if (!requirement.trim()) {
      toast('写一下择偶要求吧')
      return
    }
    setBusy(true)
    try {
      if (city !== (currentUser.city ?? '')) {
        await updateProfile({ city })
      }
      const match: MatchPost = {
        id: newId('m'),
        userId: currentUser.id,
        authorName: currentUser.nickname,
        authorAvatar: currentUser.avatar,
        city: city.trim(),
        petId: pet.id,
        petName: pet.name,
        petAvatar: pet.avatar,
        petGender: pet.gender,
        breed: pet.breed,
        requirement: requirement.trim(),
        createdAt: Date.now(),
      }
      await data.saveMatch(match)
      toast('发布成功 💕')
      navigate('/matches', { replace: true })
    } finally {
      setBusy(false)
    }
  }

  if (!currentUser) return null

  if (pets.length === 0) {
    return (
      <div className="page page--plain">
        <TopBar title="发布相亲帖" onBack={() => navigate(-1)} />
        <div className="section">
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 30 }}>🐹</div>
            <div className="fs-13 text-2 mt-8">还没有荷兰猪档案，先创建一只再来发相亲帖吧</div>
            <button
              className="btn btn--primary btn--block mt-12"
              onClick={() => navigate('/pets/edit/new')}
            >
              去添加档案
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page page--plain" style={{ paddingBottom: 96 }}>
      <TopBar title="发布相亲帖" onBack={() => navigate(-1)} />

      <div className="section" style={{ marginTop: 12 }}>
        <div className="field">
          <label className="field__label">选择出镜的猪猪</label>
          <div className="chips">
            {pets.map((p) => (
              <button
                key={p.id}
                className={`chip${pet?.id === p.id ? ' chip--on' : ''}`}
                onClick={() => setPetId(p.id)}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {pet ? (
          <div className="card match-card__pet">
            <img className="match-card__photo" src={pet.avatar} alt={pet.name} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="flex-center gap-8">
                <span className="match-card__name">{pet.name}</span>
                <span className={pet.gender === '公' ? 'tag tag--blue' : 'tag'}>{pet.gender}</span>
              </div>
              <div className="fs-12 text-3">
                {pet.breed} · {pet.color}
              </div>
              <div className="fs-12 text-3 mt-8">照片取自「我的荷兰猪」档案，可在档案里更换</div>
            </div>
          </div>
        ) : null}

        <div className="field mt-12">
          <label className="field__label">择偶要求</label>
          <textarea
            className="input"
            value={requirement}
            onChange={(e) => setRequirement(e.target.value)}
            placeholder="例如：杭州本地找一只温顺的公猪，6 个月以上、体重 700g+…"
          />
        </div>

        <div className="field">
          <label className="field__label">所在城市（同城匹配用）</label>
          <div className="chips">
            {CITY_OPTIONS.map((c) => (
              <button
                key={c}
                className={`chip${city === c ? ' chip--on' : ''}`}
                onClick={() => setCity(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <button className="btn btn--primary btn--block" onClick={submit} disabled={busy}>
          {busy ? '发布中…' : '发布相亲帖'}
        </button>
      </div>
    </div>
  )
}
