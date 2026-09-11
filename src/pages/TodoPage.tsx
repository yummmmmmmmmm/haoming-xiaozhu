import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { NoPet, PetSwitcher } from '../components/PetSwitcher'
import { Empty, Modal, TopBar } from '../components/ui'
import { data, newId, today } from '../data/repo'
import { useApp } from '../store/AppContext'
import type { TodoRecord } from '../types'

const PRESETS = [
  { title: '喂主粮', cycleDays: 1, icon: '🥣' },
  { title: '换垫料', cycleDays: 3, icon: '🧻' },
  { title: '补干草', cycleDays: 2, icon: '🌾' },
  { title: '洗澡', cycleDays: 60, icon: '🛁' },
  { title: '剪指甲', cycleDays: 28, icon: '✂️' },
  { title: '称体重', cycleDays: 7, icon: '⚖️' },
]

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00`)
  d.setDate(d.getDate() + days)
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function daysLeft(dueDate: string): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const due = new Date(`${dueDate}T00:00:00`)
  return Math.round((due.getTime() - now.getTime()) / 86400000)
}

function dueText(dueDate: string, done: boolean): string {
  if (done) return '已完成'
  const d = daysLeft(dueDate)
  if (d < 0) return `已逾期 ${-d} 天`
  if (d === 0) return '今天要做'
  if (d === 1) return '明天'
  return `${d} 天后`
}

export default function TodoPage() {
  const navigate = useNavigate()
  const { currentUser, pets, activePet, toast } = useApp()
  const [records, setRecords] = useState<TodoRecord[]>([])
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState(today())
  const [cycleDays, setCycleDays] = useState(0)
  const [note, setNote] = useState('')

  const load = useCallback(async () => {
    if (!activePet) {
      setRecords([])
      return
    }
    setRecords(await data.listTodos(activePet.id))
  }, [activePet])

  useEffect(() => {
    load()
  }, [load])

  const hasPet = pets.length > 0

  const pending = useMemo(() => records.filter((r) => !r.done), [records])
  const overdue = useMemo(
    () => pending.filter((r) => daysLeft(r.dueDate) < 0).length,
    [pending],
  )

  const save = async () => {
    if (!currentUser || !activePet) return
    if (!title.trim()) {
      toast('给这件事起个名字吧')
      return
    }
    const record: TodoRecord = {
      id: newId('td'),
      userId: currentUser.id,
      petId: activePet.id,
      title: title.trim(),
      dueDate,
      cycleDays: Number(cycleDays) || 0,
      done: false,
      note: note.trim(),
      createdAt: Date.now(),
    }
    await data.saveTodo(record)
    setOpen(false)
    setTitle('')
    setNote('')
    setDueDate(today())
    setCycleDays(0)
    await load()
    toast('已添加提醒 ⏰')
  }

  /** 完成：周期任务自动顺延到下一次，单次任务直接标记完成 */
  const complete = async (record: TodoRecord) => {
    const next: TodoRecord = record.cycleDays > 0
      ? { ...record, dueDate: addDays(record.dueDate, record.cycleDays) }
      : { ...record, done: true }
    await data.saveTodo(next)
    await load()
    toast(record.cycleDays > 0 ? `完成，下次 ${next.dueDate}` : '已完成 ✅')
  }

  const reopen = async (record: TodoRecord) => {
    await data.saveTodo({ ...record, done: false })
    await load()
  }

  const remove = async (id: string) => {
    await data.deleteTodo(id)
    await load()
    toast('已删除')
  }

  return (
    <div className="page page--plain">
      <TopBar title="待办提醒" onBack={() => navigate(-1)} />

      {!hasPet ? (
        <NoPet />
      ) : (
        <>
          <div style={{ marginTop: 12 }}>
            <PetSwitcher />
          </div>

          <div className="hero-stats">
            <div className="stat">
              <div className="stat__num">{pending.length}</div>
              <div className="stat__label">待完成</div>
            </div>
            <div className="stat">
              <div className="stat__num" style={{ color: overdue > 0 ? 'var(--red)' : undefined }}>
                {overdue}
              </div>
              <div className="stat__label">已逾期</div>
            </div>
            <div className="stat">
              <div className="stat__num">{records.filter((r) => r.done).length}</div>
              <div className="stat__label">已完成</div>
            </div>
          </div>

          <button className="btn btn--primary btn--block mt-12" onClick={() => setOpen(true)}>
            ＋ 添加提醒
          </button>

          <div className="section">
            <div className="section-title" style={{ marginBottom: 10 }}>
              提醒列表（{records.length}）
            </div>
            {records.length === 0 ? (
              <Empty icon="⏰" text="还没有提醒，试试「换垫料」「称体重」这类周期事项" />
            ) : (
              <div className="list">
                {records.map((r) => {
                  const late = !r.done && daysLeft(r.dueDate) < 0
                  return (
                    <div className="row" key={r.id}>
                      <button
                        className={`todo-check${r.done ? ' todo-check--on' : ''}`}
                        onClick={() => (r.done ? reopen(r) : complete(r))}
                        aria-label="完成"
                      >
                        {r.done ? '✓' : ''}
                      </button>
                      <div className="row__body">
                        <div
                          className="row__title"
                          style={{
                            textDecoration: r.done ? 'line-through' : 'none',
                            opacity: r.done ? 0.55 : 1,
                          }}
                        >
                          {r.title}
                        </div>
                        <div className="row__sub" style={{ color: late ? 'var(--red)' : undefined }}>
                          {dueText(r.dueDate, r.done)}
                          {r.cycleDays > 0 ? ` · 每 ${r.cycleDays} 天` : ''}
                          {r.note ? ` · ${r.note}` : ''}
                        </div>
                      </div>
                      <button className="row__action" onClick={() => remove(r.id)}>
                        ✕
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={`给${activePet?.name ?? ''}添加提醒`}>
        <div className="field">
          <label className="field__label">快捷选择</label>
          <div className="chips">
            {PRESETS.map((p) => (
              <button
                key={p.title}
                className={`chip${title === p.title ? ' chip--on' : ''}`}
                onClick={() => {
                  setTitle(p.title)
                  setCycleDays(p.cycleDays)
                  setDueDate(addDays(today(), p.cycleDays))
                }}
              >
                {p.icon} {p.title}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label className="field__label">要做什么</label>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例如：换垫料"
          />
        </div>

        <div className="field">
          <label className="field__label">下次要做的时间</label>
          <input
            className="input"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        <div className="field">
          <label className="field__label">重复周期</label>
          <div className="chips">
            {[0, 1, 2, 3, 7, 30].map((d) => (
              <button
                key={d}
                className={`chip${cycleDays === d ? ' chip--on' : ''}`}
                onClick={() => setCycleDays(d)}
              >
                {d === 0 ? '不重复' : `${d} 天`}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label className="field__label">备注（选填）</label>
          <input
            className="input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="例如：用纸棉，铺 2cm 厚"
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
