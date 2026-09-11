import { useEffect, useState, type ChangeEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { TopBar } from '../components/ui'
import { data, newId } from '../data/repo'
import { BREEDS, COLOR_OPTIONS, petAvatar } from '../data/seed'
import { useApp } from '../store/AppContext'
import type { Pet } from '../types'
import { fileToCompressedDataUrl } from '../utils/image'

const EMOJIS = ['🐹', '🐿️', '🐰', '🐻', '🐼', '🐨', '🦔', '🐾']
const GENDERS: Pet['gender'][] = ['公', '母', '未知']

export default function PetEditPage() {
  const { id = 'new' } = useParams()
  const navigate = useNavigate()
  const { currentUser, refreshPets, setActivePetId, toast, pets } = useApp()
  const isNew = id === 'new'

  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState(petAvatar('🐹'))
  const [breed, setBreed] = useState(BREEDS[0])
  const [gender, setGender] = useState<Pet['gender']>('未知')
  const [birthday, setBirthday] = useState('')
  const [color, setColor] = useState(COLOR_OPTIONS[0])
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (isNew) return
    const found = pets.find((p) => p.id === id)
    if (!found) return
    setName(found.name)
    setAvatar(found.avatar)
    setBreed(found.breed)
    setGender(found.gender)
    setBirthday(found.birthday)
    setColor(found.color)
    setNote(found.note)
  }, [id, isNew, pets])

  const onPickPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = await fileToCompressedDataUrl(file, 400, 0.85)
    setAvatar(url)
    e.target.value = ''
  }

  const save = async () => {
    if (!currentUser) return
    if (!name.trim()) {
      toast('先给猪猪起个名字吧')
      return
    }
    setBusy(true)
    try {
      const existing = isNew ? null : pets.find((p) => p.id === id)
      const pet: Pet = {
        id: existing?.id ?? newId('pet'),
        userId: currentUser.id,
        name: name.trim(),
        avatar,
        breed,
        gender,
        birthday,
        color,
        note: note.trim(),
        createdAt: existing?.createdAt ?? Date.now(),
      }
      await data.savePet(pet)
      await refreshPets()
      setActivePetId(pet.id)
      toast(isNew ? '添加成功 🐹' : '已保存')
      navigate(isNew ? '/pets' : `/pets/${pet.id}`, { replace: true })
    } finally {
      setBusy(false)
    }
  }

  const removePet = async () => {
    if (isNew) return
    await data.deletePet(id)
    await refreshPets()
    toast('已删除该档案及记录')
    navigate('/pets', { replace: true })
  }

  return (
    <div className="page page--plain">
      <TopBar title={isNew ? '添加荷兰猪' : '编辑档案'} onBack={() => navigate(-1)} />

      <div className="section" style={{ marginTop: 12 }}>
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <img
            src={avatar}
            alt="头像"
            style={{
              width: 92,
              height: 92,
              borderRadius: 26,
              objectFit: 'cover',
              boxShadow: 'var(--shadow-sm)',
            }}
          />
          <div className="chips" style={{ justifyContent: 'center', marginTop: 12 }}>
            {EMOJIS.map((e) => (
              <button
                key={e}
                className="chip"
                style={{ fontSize: 18, padding: '6px 9px' }}
                onClick={() => setAvatar(petAvatar(e))}
              >
                {e}
              </button>
            ))}
            <label className="chip" style={{ cursor: 'pointer' }}>
              📷 上传
              <input type="file" accept="image/*" hidden onChange={onPickPhoto} />
            </label>
          </div>
        </div>

        <div className="field">
          <label className="field__label">名字 *</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：毛毛"
          />
        </div>

        <div className="field">
          <label className="field__label">品种</label>
          <div className="chips">
            {BREEDS.map((b) => (
              <button
                key={b}
                className={`chip${breed === b ? ' chip--on' : ''}`}
                onClick={() => setBreed(b)}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label className="field__label">性别</label>
          <div className="chips">
            {GENDERS.map((g) => (
              <button
                key={g}
                className={`chip${gender === g ? ' chip--on' : ''}`}
                onClick={() => setGender(g)}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label className="field__label">生日</label>
          <input
            className="input"
            type="date"
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
          />
        </div>

        <div className="field">
          <label className="field__label">毛色</label>
          <div className="chips">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c}
                className={`chip${color === c ? ' chip--on' : ''}`}
                onClick={() => setColor(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label className="field__label">备注</label>
          <textarea
            className="input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="性格、喜好、健康状况等（选填）"
          />
        </div>

        <button className="btn btn--primary btn--block" onClick={save} disabled={busy}>
          {busy ? '保存中…' : isNew ? '添加' : '保存'}
        </button>

        {!isNew ? (
          <button
            className="btn btn--ghost btn--block mt-12"
            onClick={removePet}
            style={{ color: 'var(--red)' }}
          >
            删除这只猪的档案
          </button>
        ) : null}
      </div>
    </div>
  )
}
