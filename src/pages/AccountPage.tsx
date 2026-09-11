import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Empty, Modal, TopBar } from '../components/ui'
import { data, resetAllData } from '../data/repo'
import { CITY_OPTIONS, avatarImage } from '../data/seed'
import { useApp } from '../store/AppContext'
import type { Order, Photo, Post } from '../types'

interface GalleryItem {
  key: string
  url: string
  caption: string
  date: string
}

export default function AccountPage() {
  const navigate = useNavigate()
  const { currentUser, pets, logout, toast, cartCount, refreshCart, updateProfile } = useApp()
  const [weightCount, setWeightCount] = useState(0)
  const [birthCount, setBirthCount] = useState(0)
  const [healthCount, setHealthCount] = useState(0)
  const [diaryCount, setDiaryCount] = useState(0)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [myPosts, setMyPosts] = useState<Post[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [editOpen, setEditOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [viewing, setViewing] = useState<GalleryItem | null>(null)
  const [nickname, setNickname] = useState(currentUser?.nickname ?? '')
  const [signature, setSignature] = useState(currentUser?.signature ?? '')
  const [city, setCity] = useState(currentUser?.city ?? '')

  const load = useCallback(async () => {
    if (!currentUser) return
    let w = 0
    let b = 0
    let h = 0
    let d = 0
    for (const pet of pets) {
      w += (await data.listWeights(pet.id)).length
      b += (await data.listBirths(pet.id)).length
      h += (await data.listHealths(pet.id)).length
      d += (await data.listDiaries(pet.id)).length
    }
    const [photoList, allPosts, orderList] = await Promise.all([
      data.listPhotos(currentUser.id),
      data.listPosts(),
      data.listOrders(currentUser.id),
    ])
    setWeightCount(w)
    setBirthCount(b)
    setHealthCount(h)
    setDiaryCount(d)
    setPhotos(photoList)
    setMyPosts(allPosts.filter((p) => p.userId === currentUser.id))
    setOrders(orderList)
    await refreshCart()
  }, [currentUser, pets, refreshCart])

  useEffect(() => {
    load()
  }, [load])

  /** 个人相册 = 自己上传的照片 + 自己发帖里的配图 */
  const gallery = useMemo<GalleryItem[]>(() => {
    const fromPhotos = photos.map<GalleryItem>((p) => ({
      key: `ph-${p.id}`,
      url: p.dataUrl,
      caption: p.caption || '猪猪照片',
      date: p.date,
    }))
    const fromPosts = myPosts.flatMap<GalleryItem>((post) =>
      post.images.map((img, i) => ({
        key: `po-${post.id}-${i}`,
        url: img,
        caption: post.content.slice(0, 18) || '帖子配图',
        date: new Date(post.createdAt).toISOString().slice(0, 10),
      })),
    )
    return [...fromPhotos, ...fromPosts]
  }, [photos, myPosts])

  if (!currentUser) return null

  const totalSpent = orders.reduce((sum, o) => sum + o.total, 0)

  const saveProfile = async () => {
    await updateProfile({
      nickname: nickname.trim() || currentUser.username,
      signature: signature.trim(),
      city: city.trim(),
    })
    toast('资料已更新 ✨')
    setEditOpen(false)
  }

  const doReset = async () => {
    await resetAllData()
    setResetOpen(false)
    toast('本机数据已重置')
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="page">
      <TopBar title="账户" />

      <div className="section" style={{ marginTop: 12 }}>
        <div className="card flex-center gap-12">
          <img
            className="avatar avatar--lg"
            src={currentUser.avatar || avatarImage('🐹', '#FFE0B2', '#FF9A62')}
            alt={currentUser.nickname}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{currentUser.nickname}</div>
            <div className="fs-12 text-3">
              @{currentUser.username}
              {currentUser.city ? ` · 📍${currentUser.city}` : ''}
            </div>
            <div className="fs-13 text-2 mt-8">{currentUser.signature || '还没有个性签名'}</div>
          </div>
          <button className="icon-btn" onClick={() => setEditOpen(true)} aria-label="编辑资料">
            ✏️
          </button>
        </div>

        <div className="hero-stats">
          <div className="stat">
            <div className="stat__num">{pets.length}</div>
            <div className="stat__label">荷兰猪</div>
          </div>
          <div className="stat">
            <div className="stat__num">{diaryCount}</div>
            <div className="stat__label">饲养日记</div>
          </div>
          <div className="stat">
            <div className="stat__num">{gallery.length}</div>
            <div className="stat__label">相册照片</div>
          </div>
          <div className="stat">
            <div className="stat__num">{healthCount}</div>
            <div className="stat__label">健康打卡</div>
          </div>
        </div>

        <div className="fs-12 text-3 mt-8" style={{ textAlign: 'center' }}>
          体重 {weightCount} 条 · 生产 {birthCount} 条
        </div>
      </div>

      <div className="section">
        <div className="section-title" style={{ marginBottom: 10 }}>
          🐹 我的荷兰猪
        </div>
        {pets.length === 0 ? (
          <div className="card" style={{ textAlign: 'center' }} onClick={() => navigate('/pets/edit/new')}>
            <div className="fs-13 text-2">还没有添加，点这里创建第一个档案</div>
          </div>
        ) : (
          <div className="list">
            {pets.map((p) => (
              <div className="row" key={p.id} onClick={() => navigate(`/pets/${p.id}`)}>
                <img className="row__thumb" src={p.avatar} alt={p.name} />
                <div className="row__body">
                  <div className="row__title">{p.name}</div>
                  <div className="row__sub">{p.breed} · {p.gender}</div>
                </div>
                <span className="row__action">›</span>
              </div>
            ))}
          </div>
        )}
        <button className="btn btn--ghost btn--block mt-8" onClick={() => navigate('/pets')}>
          管理全部档案 ›
        </button>
      </div>

      {/* ---------------- 个人相册 ---------------- */}
      <div className="section">
        <div className="section-head">
          <div className="section-title">🖼️ 个人相册（{gallery.length}）</div>
          <div className="section-more" onClick={() => navigate('/album')}>
            去相册 ›
          </div>
        </div>
        {gallery.length === 0 ? (
          <Empty icon="🖼️" text="相册还是空的，上传猪猪照片就会出现在这里" />
        ) : (
          <>
            <div className="grid-3">
              {gallery.slice(0, 9).map((g) => (
                <button key={g.key} onClick={() => setViewing(g)}>
                  <img
                    src={g.url}
                    alt={g.caption}
                    style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 14 }}
                  />
                </button>
              ))}
            </div>
            {gallery.length > 9 ? (
              <button className="btn btn--ghost btn--block mt-8" onClick={() => navigate('/album')}>
                查看全部 {gallery.length} 张 ›
              </button>
            ) : null}
          </>
        )}
      </div>

      <div className="section">
        <div className="section-title" style={{ marginBottom: 10 }}>
          🛍️ 我的购买
        </div>
        <div className="grid-2">
          <button className="card" onClick={() => navigate('/shop/cart')}>
            <div className="stat__num">{cartCount}</div>
            <div className="stat__label">购物车件数</div>
          </button>
          <button className="card" onClick={() => navigate('/shop/orders')}>
            <div className="stat__num">{orders.length}</div>
            <div className="stat__label">历史订单</div>
          </button>
        </div>
        <div className="card mt-12 flex-between">
          <span className="text-2">累计消费（模拟）</span>
          <span className="price" style={{ fontSize: 18 }}>
            ¥{totalSpent.toFixed(2)}
          </span>
        </div>
        <button className="btn btn--ghost btn--block mt-8" onClick={() => navigate('/shop/orders')}>
          查看全部订单 ›
        </button>
      </div>

      <div className="section">
        <div className="section-title" style={{ marginBottom: 10 }}>
          ⚙️ 设置
        </div>
        <div className="list">
          <div className="row" onClick={() => navigate('/guide')}>
            <div className="row__thumb row__thumb--emoji">📖</div>
            <div className="row__body">
              <div className="row__title">饲养指南</div>
              <div className="row__sub">随时查阅饲养知识</div>
            </div>
            <span className="row__action">›</span>
          </div>
          <div className="row" onClick={() => navigate('/matches')}>
            <div className="row__thumb row__thumb--emoji">💕</div>
            <div className="row__body">
              <div className="row__title">本地相猪</div>
              <div className="row__sub">看看同城猪友，给自家猪猪找对象</div>
            </div>
            <span className="row__action">›</span>
          </div>
          <div className="row" onClick={() => setResetOpen(true)}>
            <div className="row__thumb row__thumb--emoji">🧹</div>
            <div className="row__body">
              <div className="row__title">重置本机数据</div>
              <div className="row__sub">清空账号、记录、订单等全部本地数据</div>
            </div>
            <span className="row__action">›</span>
          </div>
        </div>
      </div>

      <button className="btn btn--ghost btn--block mt-16" onClick={logout}>
        退出登录
      </button>

      <div className="fs-12 text-3" style={{ textAlign: 'center', marginTop: 16, lineHeight: 1.8 }}>
        好命小猪 · 本地版
        <br />
        所有数据仅保存在这台电脑的浏览器中，未上传网络
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="编辑资料">
        <div className="field">
          <label className="field__label">昵称</label>
          <input
            className="input"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="在论坛里显示的名字"
          />
        </div>
        <div className="field">
          <label className="field__label">个性签名</label>
          <input
            className="input"
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            placeholder="说点什么"
          />
        </div>
        <div className="field">
          <label className="field__label">所在城市（用于本地相猪的同城匹配）</label>
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
        <div className="modal__actions">
          <button className="btn btn--ghost" onClick={() => setEditOpen(false)}>
            取消
          </button>
          <button className="btn btn--primary" onClick={saveProfile}>
            保存
          </button>
        </div>
      </Modal>

      <Modal open={viewing !== null} onClose={() => setViewing(null)} title="查看照片">
        {viewing ? (
          <>
            <img src={viewing.url} alt={viewing.caption} style={{ width: '100%', borderRadius: 16 }} />
            <div className="fs-13 text-2 mt-8" style={{ textAlign: 'center' }}>
              {viewing.caption} · {viewing.date}
            </div>
          </>
        ) : null}
      </Modal>

      <Modal open={resetOpen} onClose={() => setResetOpen(false)} title="重置本机数据？">
        <div className="fs-13 text-2" style={{ textAlign: 'center' }}>
          账号、荷兰猪档案、记录、照片、订单都会被清空，且无法恢复。论坛示例内容会保留。
        </div>
        <div className="modal__actions">
          <button className="btn btn--ghost" onClick={() => setResetOpen(false)}>
            取消
          </button>
          <button
            className="btn btn--primary"
            style={{ background: 'var(--red)', color: '#fff' }}
            onClick={doReset}
          >
            确认重置
          </button>
        </div>
      </Modal>
    </div>
  )
}
