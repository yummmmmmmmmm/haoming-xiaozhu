import { useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { TopBar } from '../components/ui'
import { data, newId } from '../data/repo'
import { POST_TOPICS, avatarImage } from '../data/seed'
import { useApp } from '../store/AppContext'
import type { Post } from '../types'
import { fileToCompressedDataUrl } from '../utils/image'

export default function ForumNewPage() {
  const navigate = useNavigate()
  const { currentUser, toast } = useApp()
  const [content, setContent] = useState('')
  const [topic, setTopic] = useState(POST_TOPICS[0])
  const [images, setImages] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  const onPickImages = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    const rest = 9 - images.length
    const picked = files.slice(0, rest)
    const urls = await Promise.all(picked.map((f) => fileToCompressedDataUrl(f)))
    setImages((prev) => [...prev, ...urls])
    e.target.value = ''
  }

  const submit = async () => {
    if (!currentUser) return
    if (!content.trim() && images.length === 0) {
      toast('写点什么或者加张图吧')
      return
    }
    setBusy(true)
    try {
      const post: Post = {
        id: newId('p'),
        userId: currentUser.id,
        authorName: currentUser.nickname,
        authorAvatar:
          currentUser.avatar || avatarImage('🐹', '#FFE0B2', '#FF9A62'),
        content: content.trim(),
        images,
        topic,
        likes: 0,
        liked: false,
        createdAt: Date.now(),
      }
      await data.savePost(post)
      toast('发布成功 🎉')
      navigate('/forum', { replace: true })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page page--plain">
      <TopBar title="发布分享" onBack={() => navigate(-1)} />

      <div className="section" style={{ marginTop: 12 }}>
        <div className="field">
          <label className="field__label">选择话题</label>
          <div className="chips">
            {POST_TOPICS.map((t) => (
              <button
                key={t}
                className={`chip${topic === t ? ' chip--on' : ''}`}
                onClick={() => setTopic(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label className="field__label">说点什么</label>
          <textarea
            className="input"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="分享你家猪猪的可爱瞬间、饲养心得，或者提问求助…"
          />
        </div>

        <div className="field">
          <label className="field__label">配图（最多 9 张）</label>
          <div className="grid-3">
            {images.map((img, i) => (
              <div key={i} style={{ position: 'relative' }}>
                <img
                  src={img}
                  alt={`配图 ${i + 1}`}
                  style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 12 }}
                />
                <button
                  className="icon-btn"
                  style={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    width: 24,
                    height: 24,
                    fontSize: 13,
                    background: 'rgba(0,0,0,.5)',
                    color: '#fff',
                  }}
                  onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                >
                  ✕
                </button>
              </div>
            ))}
            {images.length < 9 ? (
              <label
                style={{
                  aspectRatio: '1',
                  borderRadius: 12,
                  border: '1.5px dashed var(--line)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 26,
                  color: 'var(--text-3)',
                  background: 'var(--surface)',
                }}
              >
                ＋
                <input type="file" accept="image/*" multiple hidden onChange={onPickImages} />
              </label>
            ) : null}
          </div>
        </div>

        <button
          className="btn btn--primary btn--block"
          onClick={submit}
          disabled={busy}
          style={{ marginTop: 8 }}
        >
          {busy ? '发布中…' : '发布'}
        </button>
      </div>
    </div>
  )
}
