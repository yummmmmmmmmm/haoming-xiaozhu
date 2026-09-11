import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LineChart } from '../components/LineChart'
import { NoPet, PetSwitcher } from '../components/PetSwitcher'
import { Modal, TopBar } from '../components/ui'
import { data, newId, today } from '../data/repo'
import { useApp } from '../store/AppContext'
import type { WeightRecord } from '../types'

export default function WeightPage() {
  const navigate = useNavigate()
  const { currentUser, pets, activePet, toast } = useApp()
  const [records, setRecords] = useState<WeightRecord[]>([])
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(today())
  const [weight, setWeight] = useState('')
  const [note, setNote] = useState('')

  const load = useCallback(async () => {
    if (!activePet) {
      setRecords([])
      return
    }
    setRecords(await data.listWeights(activePet.id))
  }, [activePet])

  useEffect(() => {
    load()
  }, [load])

  const chartData = useMemo(
    () =>
      records.map((r) => ({
        label: `${Number(r.date.slice(5, 7))}/${Number(r.date.slice(8, 10))}`,
        value: r.weight,
      })),
    [records],
  )

  const hasPet = pets.length > 0

  const save = async () => {
    if (!currentUser || !activePet) return
    const value = Number(weight)
    if (!value || value <= 0) {
      toast('请输入体重（克）')
      return
    }
    const record: WeightRecord = {
      id: newId('w'),
      userId: currentUser.id,
      petId: activePet.id,
      date,
      weight: Math.round(value),
      note: note.trim(),
      createdAt: Date.now(),
    }
    await data.saveWeight(record)
    setOpen(false)
    setWeight('')
    setNote('')
    setDate(today())
    await load()
    toast('已记录 ⚖️')
  }

  const remove = async (id: string) => {
    await data.deleteWeight(id)
    await load()
    toast('已删除')
  }

  const latest = records.length ? records[records.length - 1].weight : null
  const first = records.length ? records[0].weight : null
  const diff = latest !== null && first !== null ? latest - first : null

  return (
    <div className="page page--plain">
      <TopBar title="体重记录" onBack={() => navigate(-1)} />

      {!hasPet ? (
        <NoPet />
      ) : (
        <>
          <div style={{ marginTop: 12 }}>
            <PetSwitcher />
          </div>

          <div className="hero-stats">
            <div className="stat">
              <div className="stat__num">{latest !== null ? `${latest}` : '—'}</div>
              <div className="stat__label">最新(g)</div>
            </div>
            <div className="stat">
              <div className="stat__num">{records.length}</div>
              <div className="stat__label">记录次数</div>
            </div>
            <div className="stat">
              <div className="stat__num" style={{ color: diff && diff < 0 ? 'var(--red)' : undefined }}>
                {diff !== null ? `${diff > 0 ? '+' : ''}${diff}` : '—'}
              </div>
              <div className="stat__label">首末变化(g)</div>
            </div>
          </div>

          <div className="card mt-12">
            <div className="section-title" style={{ fontSize: 14, marginBottom: 6 }}>
              {activePet?.name} 的体重趋势
            </div>
            <LineChart data={chartData} unit="g" />
          </div>

          <button className="btn btn--primary btn--block mt-12" onClick={() => setOpen(true)}>
            ＋ 记录一次体重
          </button>

          <div className="section">
            <div className="section-title" style={{ marginBottom: 10 }}>
              历史记录
            </div>
            {records.length === 0 ? (
              <div className="empty">
                <div className="empty__icon">⚖️</div>
                <div>还没有记录，点上面按钮记一次吧</div>
              </div>
            ) : (
              <div className="list">
                {[...records].reverse().map((r) => (
                  <div className="row" key={r.id}>
                    <div
                      className="row__thumb"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--primary)' }}
                    >
                      {r.weight}
                    </div>
                    <div className="row__body">
                      <div className="row__title">{r.weight} 克</div>
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

      <Modal open={open} onClose={() => setOpen(false)} title={`给${activePet?.name ?? ''}记体重`}>
        <div className="field">
          <label className="field__label">日期</label>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="field">
          <label className="field__label">体重（克）</label>
          <input
            className="input"
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="例如 850"
          />
        </div>
        <div className="field">
          <label className="field__label">备注（选填）</label>
          <input
            className="input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="例如：空腹称重"
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
