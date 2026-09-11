import { useCallback, useEffect, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { NoPet, PetSwitcher } from '../components/PetSwitcher'
import { Modal, TopBar } from '../components/ui'
import { data, newId, today } from '../data/repo'
import { useApp } from '../store/AppContext'
import type { Photo } from '../types'
import { fileToCompressedDataUrl } from '../utils/image'

export default function AlbumPage() {
  const navigate = useNavigate()
  const { currentUser, pets, activePet, toast } = useApp()
  const [photos, setPhotos] = useState<Photo[]>([])
  const [scope, setScope] = useState<'pet' | 'all'>('pet')
  const [viewing, setViewing] = useState<Photo | null>(null)
  const [uploading, setUploading] = useState(false)

  const load = useCallback(async () => {
    if (!currentUser) return
    const all = await data.listPhotos(currentUser.id)
    setPhotos(all)
  }, [currentUser])

  useEffect(() => {
    load()
  }, [load])

  const hasPet = pets.length > 0
  const visible = scope === 'all' || !activePet ? photos : photos.filter((p) => p.petId === activePet.id)

  const onUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!currentUser || !activePet) return
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    setUploading(true)
    try {
      const urls = await Promise.all(files.map((f) => fileToCompressedDataUrl(f, 1200, 0.82)))
      for (const url of urls) {
        const photo: Photo = {
          id: newId('ph'),
          userId: currentUser.id,
          petId: activePet.id,
          dataUrl: url,
          caption: '',
          date: today(),
          createdAt: Date.now(),
        }
        await data.savePhoto(photo)
      }
      await load()
      toast(`已添加 ${urls.length} 张照片 🖼️`)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const removePhoto = async (photo: Photo) => {
    await data.deletePhoto(photo.id)
    setViewing(null)
    await load()
    toast('已删除')
  }

  const petName = (petId: string) => pets.find((p) => p.id === petId)?.name ?? '未知'

  return (
    <div className="page page--plain">
      <TopBar title="相册" onBack={() => navigate(-1)} />

      {!hasPet ? (
        <NoPet />
      ) : (
        <>
          <div style={{ marginTop: 12 }}>
            <PetSwitcher />
          </div>

          <div className="chips" style={{ marginTop: 10 }}>
            <button
              className={`chip${scope === 'pet' ? ' chip--on' : ''}`}
              onClick={() => setScope('pet')}
            >
              {activePet?.name} 的相册
            </button>
            <button
              className={`chip${scope === 'all' ? ' chip--on' : ''}`}
              onClick={() => setScope('all')}
            >
              全部照片
            </button>
          </div>

          <label className="btn btn--primary btn--block mt-12" style={{ cursor: 'pointer' }}>
            {uploading ? '处理中…' : '＋ 添加照片'}
            <input type="file" accept="image/*" multiple hidden onChange={onUpload} />
          </label>

          {visible.length === 0 ? (
            <div className="empty">
              <div className="empty__icon">🖼️</div>
              <div>还没有照片，上传几张猪猪的可爱瞬间吧</div>
            </div>
          ) : (
            <div className="grid-3" style={{ marginTop: 14 }}>
              {visible.map((p) => (
                <button key={p.id} onClick={() => setViewing(p)}>
                  <img
                    src={p.dataUrl}
                    alt={p.caption || '照片'}
                    style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 12 }}
                  />
                  {scope === 'all' ? (
                    <div className="fs-12 text-3" style={{ marginTop: 3 }}>
                      {petName(p.petId)}
                    </div>
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      <Modal open={viewing !== null} onClose={() => setViewing(null)} title="查看照片">
        {viewing ? (
          <>
            <img
              src={viewing.dataUrl}
              alt="照片"
              style={{ width: '100%', borderRadius: 14, marginBottom: 10 }}
            />
            <div className="fs-13 text-2" style={{ textAlign: 'center' }}>
              {petName(viewing.petId)} · {viewing.date}
            </div>
            <div className="modal__actions">
              <button className="btn btn--ghost" onClick={() => setViewing(null)}>
                关闭
              </button>
              <button
                className="btn btn--primary"
                style={{ background: 'var(--red)' }}
                onClick={() => removePhoto(viewing)}
              >
                删除
              </button>
            </div>
          </>
        ) : null}
      </Modal>
    </div>
  )
}
