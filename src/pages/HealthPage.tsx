import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { NoPet, PetSwitcher } from '../components/PetSwitcher'
import { Modal, TopBar } from '../components/ui'
import { data, newId, today } from '../data/repo'
import { useApp } from '../store/AppContext'
import type { HealthKind, HealthRecord } from '../types'

const KIND_LABEL: Record<HealthKind, string> = {
  vaccine: '疫苗',
  deworm: '驱虫',
  vet: '就医',
  bath: '洗澡',
  other: '其他',
}

const KIND_ICON: Record<HealthKind, string> = {
  vaccine: '💉',
  deworm: '🐛',
  vet: '🏥',
  bath: '🛁',
  other: '📌',
}

export default function HealthPage() {
  const navigate = useNavigate()
  const { currentUser, pets, activePet, toast } = useApp()
  const [records, setRecords] = useState<HealthRecord[]>([])
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(today())
  const [kind, setKind] = useState<HealthKind>('vaccine')
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')

  const load = useCallback(async () => {
    if (!activePet) {
      setRecords([])
      return
    }
    setRecords(await data.listHealths(activePet.id))
  }, [activePet])

  useEffect(() => {
    load()
  }, [load])

  const hasPet = pets.length > 0

  const stats = useMemo(() => {
    const count = (k: HealthKind) => records.filter((r) => r.kind === k).length
    return { vaccine: count('vaccine'), deworm: count('deworm'), vet: count('vet') }
  }, [records])

  const save = async () => {
    if (!currentUser || !activePet) return
    const record: HealthRecord = {
      id: newId('h'),
      userId: currentUser.id,
      petId: activePet.id,
      date,
      kind,
      title: title.trim() || KIND_LABEL[kind],
      note: note.trim(),
      createdAt: Date.now(),
    }
    await data.saveHealth(record)
    setOpen(false)
    setTitle('')
    setNote('')
    setDate(today())
    setKind('vaccine')
    await load()
    toast('已记录 💉')
  }

  const remove = async (id: string) => {
    await data.deleteHealth(id)
    await load()
    toast('已删除')
  }

  return (
    <div className="page page--plain">
      <TopBar title="健康打卡" onBack={() => navigate(-1)} />

      {!hasPet ? (
        <NoPet />
      ) : (
        <>
          <div style={{ marginTop: 12 }}>
            <PetSwitcher />
          </div>

          <div className="hero-stats">
            <div className="stat">
              <div className="stat__num">{stats.vaccine}</div>
              <div className="stat__label">疫苗 💉</div>
            </div>
            <div className="stat">
              <div className="stat__num">{stats.deworm}</div>
              <div className="stat__label">驱虫 🐛</div>
            </div>
            <div className="stat">
              <div className="stat__num">{stats.vet}</div>
              <div className="stat__label">就医 🏥</div>
            </div>
          </div>

          <button className="btn btn--primary btn--block mt-12" onClick={() => setOpen(true)}>
            ＋ 新增一条健康记录
          </button>

          <div className="section">
            <div className="section-title" style={{ marginBottom: 10 }}>
              打卡记录（{records.length}）
            </div>
            {records.length === 0 ? (
              <div className="empty">
                <div className="empty__icon">💉</div>
                <div>还没有记录，可以记疫苗、驱虫或就医</div>
              </div>
            ) : (
              <div className="list">
                {records.map((r) => (
                  <div className="row" key={r.id}>
                    <div
                      className="row__thumb"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 22,
                      }}
                    >
                      {KIND_ICON[r.kind]}
                    </div>
                    <div className="row__body">
                      <div className="row__title">
                        <span className="tag">{KIND_LABEL[r.kind]}</span> {r.title}
                      </div>
                      <div className="row__sub">
                        {r.date}
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

      <Modal open={open} onClose={() => setOpen(false)} title={`给${activePet?.name ?? ''}打卡`}>
        <div className="field">
          <label className="field__label">类型</label>
          <div className="chips">
            {(Object.keys(KIND_LABEL) as HealthKind[]).map((k) => (
              <button
                key={k}
                className={`chip${kind === k ? ' chip--on' : ''}`}
                onClick={() => setKind(k)}
              >
                {KIND_ICON[k]} {KIND_LABEL[k]}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label className="field__label">日期</label>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <div className="field">
          <label className="field__label">做了什么（选填）</label>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例如：驱虫滴剂 0.4ml"
          />
        </div>

        <div className="field">
          <label className="field__label">备注（选填）</label>
          <input
            className="input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="例如：体重 780g，一切正常"
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
