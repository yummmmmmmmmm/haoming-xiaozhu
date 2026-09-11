import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { NoPet, PetSwitcher } from '../components/PetSwitcher'
import { Modal, TopBar, ageText, daysToBirthday } from '../components/ui'
import { data, newId, today } from '../data/repo'
import { useApp } from '../store/AppContext'
import type { BirthRecord, BirthType } from '../types'

const TYPE_LABEL: Record<BirthType, string> = {
  mating: '配种',
  pregnant: '怀孕',
  birth: '生产',
}

const TYPE_ICON: Record<BirthType, string> = {
  mating: '💕',
  pregnant: '🤰',
  birth: '🍼',
}

export default function BirthPage() {
  const navigate = useNavigate()
  const { currentUser, pets, activePet, toast } = useApp()
  const [records, setRecords] = useState<BirthRecord[]>([])
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(today())
  const [type, setType] = useState<BirthType>('birth')
  const [partner, setPartner] = useState('')
  const [babies, setBabies] = useState('')
  const [note, setNote] = useState('')

  const load = useCallback(async () => {
    if (!activePet) {
      setRecords([])
      return
    }
    setRecords(await data.listBirths(activePet.id))
  }, [activePet])

  useEffect(() => {
    load()
  }, [load])

  const hasPet = pets.length > 0
  const days = activePet ? daysToBirthday(activePet.birthday) : null

  const save = async () => {
    if (!currentUser || !activePet) return
    const record: BirthRecord = {
      id: newId('b'),
      userId: currentUser.id,
      petId: activePet.id,
      date,
      type,
      partner: partner.trim(),
      babies: Number(babies) || 0,
      note: note.trim(),
      createdAt: Date.now(),
    }
    await data.saveBirth(record)
    setOpen(false)
    setPartner('')
    setBabies('')
    setNote('')
    setDate(today())
    setType('birth')
    await load()
    toast('已记录 🎂')
  }

  const remove = async (id: string) => {
    await data.deleteBirth(id)
    await load()
    toast('已删除')
  }

  return (
    <div className="page page--plain">
      <TopBar title="生日 / 生产" onBack={() => navigate(-1)} />

      {!hasPet ? (
        <NoPet />
      ) : (
        <>
          <div style={{ marginTop: 12 }}>
            <PetSwitcher />
          </div>

          <div className="card mt-12">
            <div className="flex-between">
              <div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>
                  🎂 {activePet?.name} 的生日
                </div>
                <div className="fs-13 text-2 mt-8">
                  {activePet?.birthday || '还没填写生日'} · {ageText(activePet?.birthday ?? '')}
                </div>
              </div>
              {days !== null ? (
                <div className="stat" style={{ flex: 'none', padding: '10px 16px' }}>
                  <div className="stat__num">{days}</div>
                  <div className="stat__label">天后生日</div>
                </div>
              ) : null}
            </div>
            <button
              className="btn btn--ghost btn--block mt-12"
              onClick={() => navigate(`/pets/edit/${activePet?.id}`)}
            >
              修改生日 / 档案
            </button>
          </div>

          <button className="btn btn--primary btn--block mt-12" onClick={() => setOpen(true)}>
            ＋ 新增一条记录
          </button>

          <div className="section">
            <div className="section-title" style={{ marginBottom: 10 }}>
              记录（{records.length}）
            </div>
            {records.length === 0 ? (
              <div className="empty">
                <div className="empty__icon">🍼</div>
                <div>还没有记录，可以记配种、怀孕或生产</div>
              </div>
            ) : (
              <div className="list">
                {records.map((r) => (
                  <div className="row" key={r.id}>
                    <div
                      className="row__thumb"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}
                    >
                      {TYPE_ICON[r.type]}
                    </div>
                    <div className="row__body">
                      <div className="row__title">
                        {TYPE_LABEL[r.type]}
                        {r.type === 'birth' && r.babies > 0 ? ` · ${r.babies} 只宝宝` : ''}
                      </div>
                      <div className="row__sub">
                        {r.date}
                        {r.partner ? ` · 伴侣：${r.partner}` : ''}
                        {r.note ? ` · ${r.note}` : ''}
                      </div>
                    </div>
                    <button className="row__action" onClick={() => remove(r.id)}>
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={`记录${activePet?.name ?? ''}的事件`}>
        <div className="field">
          <label className="field__label">类型</label>
          <div className="chips">
            {(Object.keys(TYPE_LABEL) as BirthType[]).map((t) => (
              <button
                key={t}
                className={`chip${type === t ? ' chip--on' : ''}`}
                onClick={() => setType(t)}
              >
                {TYPE_ICON[t]} {TYPE_LABEL[t]}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label className="field__label">日期</label>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <div className="field">
          <label className="field__label">伴侣（选填）</label>
          <input
            className="input"
            value={partner}
            onChange={(e) => setPartner(e.target.value)}
            placeholder="配种对象的名字"
          />
        </div>

        {type === 'birth' ? (
          <div className="field">
            <label className="field__label">宝宝数量</label>
            <input
              className="input"
              type="number"
              value={babies}
              onChange={(e) => setBabies(e.target.value)}
              placeholder="例如 2"
            />
          </div>
        ) : null}

        <div className="field">
          <label className="field__label">备注（选填）</label>
          <input
            className="input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="例如：一切顺利"
          />
        </div>

        <div className="modal__actions">
          <button className="btn btn--ghost" onClick={() => setOpen(false)}>
            取消
          </button>
          <button className="btn btn--primary" onClick={save}>
            保存
          </button>
        </div>
      </Modal>
    </div>
  )
}
