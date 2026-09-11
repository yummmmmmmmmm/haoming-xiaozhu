import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Carousel } from '../components/Carousel'
import { PostCard } from '../components/PostCard'
import { ProductCard } from '../components/ProductCard'
import { SmartDiagnose } from '../components/SmartDiagnose'
import { TopBar } from '../components/ui'
import { data } from '../data/repo'
import { GUIDE_ARTICLES, GUIDE_CATEGORIES, PRODUCTS, SLIDES } from '../data/seed'
import { useApp } from '../store/AppContext'
import type { Comment, Post, Product } from '../types'

type TabKey = 'guide' | 'forum' | 'shop'

const TABS: { key: TabKey; icon: string; label: string }[] = [
  { key: 'guide', icon: '📖', label: '饲养指南' },
  { key: 'forum', icon: '💬', label: '论坛分享' },
  { key: 'shop', icon: '🛒', label: '商城购买' },
]

export default function HomePage() {
  const navigate = useNavigate()
  const { currentUser, cartCount, toast } = useApp()
  const [tab, setTab] = useState<TabKey>('guide')
  const [posts, setPosts] = useState<Post[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const startX = useRef<number | null>(null)

  useEffect(() => {
    Promise.all([data.listPosts(), data.listComments()])
      .then(([postList, commentList]) => {
        setPosts(postList)
        setComments(commentList)
      })
      .catch(() => undefined)
  }, [])

  const commentCounts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const c of comments) map[c.postId] = (map[c.postId] ?? 0) + 1
    return map
  }, [comments])

  const hotArticles = useMemo(() => GUIDE_ARTICLES.slice(0, 6), [])
  const hotProducts = useMemo(() => PRODUCTS.slice(0, 6), [])

  const onSlideSelect = (slideId: string, target: string) => {
    // 直接按 slide 的目标 id 跳转，不能依赖 posts 这类异步加载的状态：
    // 轮播在数据加载完成前就可以点击，用状态查找会把用户带到列表页而不是详情页。
    if (!slideId) {
      navigate(target === 'guide' ? '/guide' : target === 'forum' ? '/forum' : '/shop')
      return
    }
    if (target === 'guide') {
      const article = GUIDE_ARTICLES.find((a) => a.id === slideId)
      navigate(article ? `/guide/a/${article.id}` : '/guide')
    } else if (target === 'forum') {
      navigate(`/forum/p/${slideId}`)
    } else {
      const product = PRODUCTS.find((p) => p.id === slideId)
      navigate(product ? `/shop/p/${product.id}` : '/shop')
    }
  }

  const toggleLike = async (post: Post) => {
    const next: Post = {
      ...post,
      liked: !post.liked,
      likes: post.likes + (post.liked ? -1 : 1),
    }
    await data.savePost(next)
    setPosts((prev) => prev.map((p) => (p.id === post.id ? next : p)))
  }

  const tabIndex = TABS.findIndex((t) => t.key === tab)

  return (
    <div className="page">
      <TopBar
        brand
        right={
          <>
            <button className="icon-btn" onClick={() => navigate('/shop/cart')} aria-label="购物车">
              🛒
              {cartCount > 0 ? (
                <span className="icon-btn__badge">{cartCount}</span>
              ) : null}
            </button>
          </>
        }
      />

      <div style={{ marginTop: 12 }}>
        <Carousel
          slides={SLIDES}
          onSelect={(s) => onSlideSelect(s.targetId ?? '', s.target)}
        />
      </div>

      {/* 三个功能按钮：可横滑、可点击切换 */}
      <div className="segmented" style={{ marginTop: 14 }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`segmented__item${tab === t.key ? ' segmented__item--on' : ''}`}
            onClick={() => setTab(t.key)}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* 内容区：跟随上方按钮切换，也支持左右滑动切换 */}
      <div
        onTouchStart={(e) => {
          startX.current = e.touches[0].clientX
        }}
        onTouchEnd={(e) => {
          if (startX.current == null) return
          const dx = e.changedTouches[0].clientX - startX.current
          if (Math.abs(dx) > 55) {
            const next = tabIndex + (dx < 0 ? 1 : -1)
            if (next >= 0 && next < TABS.length) setTab(TABS[next].key)
          }
          startX.current = null
        }}
      >
        {tab === 'guide' ? (
          <div className="section">
            <div className="section-head">
              <div className="section-title">📖 分类指南</div>
              <div className="section-more" onClick={() => navigate('/guide')}>
                全部 ›
              </div>
            </div>
            <div className="grid-3">
              {GUIDE_CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  className="card"
                  style={{ padding: '14px 6px', textAlign: 'center' }}
                  onClick={() => navigate(`/guide/c/${c.id}`)}
                >
                  <div style={{ fontSize: 24 }}>{c.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginTop: 6 }}>{c.name}</div>
                </button>
              ))}
            </div>

            {/* 智能问疾：放在分类指南六个按钮下面 */}
            <SmartDiagnose style={{ marginTop: 14 }} />

            <div className="section-head" style={{ marginTop: 18 }}>
              <div className="section-title">🔥 新手必看</div>
            </div>
            <div className="list">
              {hotArticles.slice(0, 3).map((a) => (
                <div className="row" key={a.id} onClick={() => navigate(`/guide/a/${a.id}`)}>
                  <img className="row__thumb" src={a.cover} alt={a.title} />
                  <div className="row__body">
                    <div className="row__title">{a.title}</div>
                    <div className="row__sub">{a.summary}</div>
                  </div>
                  <span className="row__action">›</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {tab === 'forum' ? (
          <div className="section">
            <div className="section-head">
              <div className="section-title">💬 大家在聊</div>
              <div className="section-more" onClick={() => navigate('/forum')}>
                去论坛 ›
              </div>
            </div>
            <div className="list">
              {posts.slice(0, 3).map((p) => (
                <PostCard
                  key={p.id}
                  post={p}
                  commentCount={commentCounts[p.id] ?? 0}
                  onToggleLike={toggleLike}
                  onOpen={() => navigate(`/forum/p/${p.id}`)}
                />
              ))}
            </div>
            <button
              className="btn btn--primary btn--block mt-12"
              onClick={() => navigate('/forum/new')}
            >
              ✏️ 发一条分享
            </button>
          </div>
        ) : null}

        {tab === 'shop' ? (
          <div className="section">
            <div className="section-head">
              <div className="section-title">🛒 好物推荐</div>
              <div className="section-more" onClick={() => navigate('/shop')}>
                去商城 ›
              </div>
            </div>
            <div className="grid-2">
              {hotProducts.map((p: Product) => (
                <ProductCard key={p.id} product={p} onClick={(x) => navigate(`/shop/p/${x.id}`)} />
              ))}
            </div>
            <button
              className="btn btn--ghost btn--block mt-12"
              onClick={() => {
                navigate('/shop')
                toast('挑点猪猪爱吃爱用的吧')
              }}
            >
              查看全部商品 ›
            </button>
          </div>
        ) : null}
      </div>

      <div className="fs-12 text-3" style={{ textAlign: 'center', marginTop: 28 }}>
        {currentUser ? `你好，${currentUser.nickname} 🐹` : ''}
      </div>
    </div>
  )
}
