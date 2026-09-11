import { useEffect, useState } from 'react'
import { Modal } from './ui'
import { data, newId, today } from '../data/repo'
import { useApp } from '../store/AppContext'
import type { DiaryRecord } from '../types'

const MOODS = ['😊 开心', '😴 犯困', '😋 吃香香', '😤 有点生气', '🤒 身体抱恙', '🤗 黏人']

/**
 * 「记入饲养日记」弹窗
 * 指南文章 / 论坛帖子点按钮后弹出，内容已按来源预填，用户可以再改
 */
export function DiaryQuickAdd({
  open,
  onClose,
  defaultContent,
  source,
}: {
  open: boolean
  onClose: () => void
  defaultContent: string
  source: string
}) {
  const { currentUser, pets, activePet, toast } = useApp()
  const [petId, setPetId] = useState('')
  const [date, setDate] = useState(today())
  const [mood, setMood] = useState(MOODS[0])
  const [content, setContent] = useState(defaultContent)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setContent(defaultContent)
    setDate(today())
    setMood(MOODS[0])
    setPetId(activePet?.id ?? pets[0]?.id ?? '')
  }, [open, defaultContent, activePet, pets])

  const save = async () => {
    if (!currentUser) return
    const target = pets.find((p) => p.id === petId) ?? pets[0]
    if (!target) {
      toast('先去「我的荷兰猪」添加一只吧')
      return
    }
    const text = content.trim()
    if (!text) {
      toast('内容还是空的呢')
      return
    }
    setBusy(true)
    try {
      const record: DiaryRecord = {
        id: newId('d'),
        userId: currentUser.id,
        petId: target.id,
        date,
        mood,
        content: text,
        images: [],
        source,
        createdAt: Date.now(),
      }
      await data.saveDiary(record)
      toast('已记入饲养日记 📔')
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="记入饲养日记">
      {pets.length === 0 ? (
        <div className="fs-13 text-2" style={{ textAlign: 'center' }}>
          还没有荷兰猪档案，先去「我的荷兰猪」添加一只，日记要记在它名下。
        </div>
      ) : (
        <>
          {pets.length > 1 ? (
            <div className="field">
              <label className="field__label">记给谁</label>
              <div className="chips">
                {pets.map((p) => (
                  <button
                    key={p.id}
                    className={`chip${petId === p.id ? ' chip--on' : ''}`}
                    onClick={() => setPetId(p.id)}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="field">
            <label className="field__label">日期</label>
            <input
              className="input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="field">
            <label className="field__label">它今天的心情</label>
            <div className="chips">
              {MOODS.map((m) => (
                <button
                  key={m}
                  className={`chip${mood === m ? ' chip--on' : ''}`}
                  onClick={() => setMood(m)}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label className="field__label">内容（摘录好了，可以再改）</label>
            <textarea
              className="input"
              style={{ minHeight: 150 }}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          <div className="fs-12 text-3" style={{ marginBottom: 10 }}>
            来源：{source}
          </div>

          <div className="modal__actions">
            <button className="btn btn--ghost" onClick={onClose}>
              取消
            </button>
            <button className="btn btn--primary" onClick={save} disabled={busy}>
              {busy ? '保存中…' : '保存到日记'}
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}
