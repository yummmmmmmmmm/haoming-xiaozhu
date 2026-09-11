import { useCallback, useEffect, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { NoPet, PetSwitcher } from '../components/PetSwitcher'
import { Empty, Modal, TopBar } from '../components/ui'
import { data, newId, today } from '../data/repo'
import { useApp } from '../store/AppContext'
import type { DiaryRecord } from '../types'
import { fileToCompressedDataUrl } from '../utils/image'

const MOODS = ['😊 开心', '😴 犯困', '😋 吃香香', '😤 有点生气', '🤒 身体抱恙', '🤗 黏人']

export default function DiaryPage() {
  const navigate = useNavigate()
  const { currentUser, pets, activePet, toast } = useApp()
  const [records, setRecords] = useState<DiaryRecord[]>([])
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(today())
  const [mood, setMood] = useState(MOODS[0])
  const [content, setContent] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [viewing, setViewing] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!activePet) {
      setRecords([])
      return
    }
    setRecords(await data.listDiaries(activePet.id))
  }, [activePet])

  useEffect(() => {
    load()
  }, [load])

  const hasPet = pets.length > 0

  const onPickImages = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    const rest = 4 - images.length
    const urls = await Promise.all(
      files.slice(0, rest).map((f) => fileToCompressedDataUrl(f, 1000, 0.8)),
    )
    setImages((prev) => [...prev, ...urls])
    e.target.value = ''
  }

  const resetForm = () => {
    setDate(today())
    setMood(MOODS[0])
    setContent('')
    setImages([])
  }

  const save = async () => {
    if (!currentUser || !activePet) return
    if (!content.trim() && images.length === 0) {
      toast('写点什么或者加张图吧')
      return
    }
    const record: DiaryRecord = {
      id: newId('d'),
      userId: currentUser.id,
      petId: activePet.id,
      date,
      mood,
      content: content.trim(),
      images,
      createdAt: Date.now(),
    }
    await data.saveDiary(record)
    setOpen(false)
    resetForm()
    await load()
    toast('日记已保存 📔')
  }

  const remove = async (id: string) => {
    await data.deleteDiary(id)
    await load()
    toast('已删除')
  }

  return (
    <div className="page page--plain">
      <TopBar title="饲养日记" onBack={() => navigate(-1)} />

      {!hasPet ? (
        <NoPet />
      ) : (
        <>
          <div style={{ marginTop: 12 }}>
            <PetSwitcher />
          </div>

          <button className="btn btn--primary btn--block mt-12" onClick={() => setOpen(true)}>
            ✍️ 写一篇饲养日记
          </button>

          <div className="fs-12 text-3 mt-8" style={{ textAlign: 'center' }}>
            也可以在看指南、刷论坛时点「📔 记入饲养日记」摘录过来
          </div>

          <div className="section">
            <div className="section-title" style={{ marginBottom: 10 }}>
              日记（{records.length}）
            </div>
            {records.length === 0 ? (
              <Empty icon="📔" text="还没有日记，记录一下它今天的小心情吧" />
            ) : (
              <div className="list">
                {records.map((r) => (
                  <div className="card" key={r.id}>
                    <div className="flex-between">
                      <div className="flex-center gap-8">
                        <span className="tag">{r.mood}</span>
                        <span className="fs-12 text-3">{r.date}</span>
                      </div>
                      <button className="row__action" onClick={() => remove(r.id)}>
                        ✕
                      </button>
                    </div>

                    {r.source ? (
                      <div className="fs-12 text-3 mt-8">摘录自 {r.source}</div>
                    ) : null}

                    {r.content ? (
                      <div className="post-card__content mt-8">{r.content}</div>
                    ) : null}

                    {r.images.length > 0 ? (
                      <div className="grid-3 mt-8">
                        {r.images.map((img, i) => (
                          <button key={i} onClick={() => setViewing(img)}>
                            <img
                              src={img}
                              alt={`日记配图 ${i + 1}`}
                              style={{
                                width: '100%',
                                aspectRatio: '1',
                                objectFit: 'cover',
                                borderRadius: 14,
                              }}
                            />
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={`记录${activePet?.name ?? ''}的今天`}>
        <div className="field">
          <label className="field__label">日期</label>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
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
          <label className="field__label">今天发生了什么</label>
          <textarea
            className="input"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="例如：今天第一次主动爬到我手上要吃的，太惊喜了…"
          />
        </div>

        <div className="field">
          <label className="field__label">配图（最多 4 张）</label>
          <div className="grid-3">
            {images.map((img, i) => (
              <div key={i} style={{ position: 'relative' }}>
                <img
                  src={img}
                  alt={`配图 ${i + 1}`}
                  style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 14 }}
                />
                <button
                  className="img-remove"
                  onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                >
                  ✕
                </button>
              </div>
            ))}
            {images.length < 4 ? (
              <label className="img-add">
                ＋
                <input type="file" accept="image/*" multiple hidden onChange={onPickImages} />
              </label>
            ) : null}
          </div>
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

      <Modal open={viewing !== null} onClose={() => setViewing(null)} title="查看照片">
        {viewing ? (
          <img src={viewing} alt="日记照片" style={{ width: '100%', borderRadius: 16 }} />
        ) : null}
      </Modal>
    </div>
  )
}
