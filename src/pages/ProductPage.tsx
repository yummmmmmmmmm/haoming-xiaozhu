import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Empty, TopBar } from '../components/ui'
import { data, newId } from '../data/repo'
import { PRODUCTS } from '../data/seed'
import { useApp } from '../store/AppContext'
import type { CartItem } from '../types'

export default function ProductPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { currentUser, refreshCart, toast, cartCount } = useApp()
  const product = PRODUCTS.find((p) => p.id === id)
  const [qty, setQty] = useState(1)

  const related = PRODUCTS.filter((p) => p.category === product?.category && p.id !== product?.id).slice(
    0,
    4,
  )

  useEffect(() => {
    setQty(1)
  }, [id])

  if (!product) {
    return (
      <div className="page page--plain">
        <TopBar title="商品" onBack={() => navigate('/shop')} />
        <Empty icon="🛒" text="没找到这个商品" />
      </div>
    )
  }

  const addToCart = async (silent = false) => {
    if (!currentUser) return
    const items = await data.listCart(currentUser.id)
    const exist = items.find((c) => c.productId === product.id)
    const item: CartItem = exist
      ? { ...exist, qty: exist.qty + qty }
      : { id: newId('c'), userId: currentUser.id, productId: product.id, qty }
    await data.saveCartItem(item)
    await refreshCart()
    if (!silent) toast('已加入购物车 🛒')
  }

  return (
    <div className="page page--plain" style={{ paddingBottom: 92 }}>
      <TopBar
        title="商品详情"
        onBack={() => navigate('/shop')}
        right={
          <button className="icon-btn" onClick={() => navigate('/shop/cart')} aria-label="购物车">
            🛒
            {cartCount > 0 ? (
              <span className="bottom-nav__badge" style={{ top: 0, right: 2 }}>
                {cartCount}
              </span>
            ) : null}
          </button>
        }
      />

      <div className="section" style={{ marginTop: 12 }}>
        <img
          src={product.image}
          alt={product.name}
          style={{ width: '100%', borderRadius: 'var(--radius)', aspectRatio: '1', objectFit: 'cover' }}
        />

        <div className="card mt-12">
          <div className="flex-between">
            <div>
              <span className="price" style={{ fontSize: 22 }}>
                ¥{product.price.toFixed(1)}
              </span>
              {product.originalPrice ? (
                <span className="price--old">¥{product.originalPrice.toFixed(1)}</span>
              ) : null}
            </div>
            {product.isNew ? <span className="tag tag--green">新品</span> : null}
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, marginTop: 8 }}>{product.name}</div>
          <div className="fs-12 text-3 mt-8">
            已售 {product.sales} · 库存 {product.stock}
          </div>

          <div className="divider" />

          <div className="fs-13 text-2">{product.desc}</div>

          <div className="divider" />

          <div className="section-title" style={{ fontSize: 14, marginBottom: 8 }}>
            规格参数
          </div>
          <div className="chips">
            {product.specs.map((s) => (
              <span className="chip" key={s}>
                {s}
              </span>
            ))}
          </div>
        </div>

        {related.length > 0 ? (
          <div className="section">
            <div className="section-title" style={{ marginBottom: 10 }}>
              同类商品
            </div>
            <div className="hscroll">
              {related.map((p) => (
                <button
                  key={p.id}
                  className="guide-card"
                  style={{ width: 120 }}
                  onClick={() => navigate(`/shop/p/${p.id}`)}
                >
                  <img src={p.image} alt={p.name} style={{ aspectRatio: '1' }} />
                  <div className="guide-card__body">
                    <div className="guide-card__title">{p.name}</div>
                    <div className="price fs-13" style={{ marginTop: 4 }}>
                      ¥{p.price.toFixed(1)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* 底部操作条 */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: 430,
          background: 'rgba(255,255,255,.97)',
          borderTop: '1px solid var(--line)',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          zIndex: 45,
        }}
      >
        <div className="flex-center gap-8">
          <button className="btn btn--ghost btn--sm" onClick={() => setQty((q) => Math.max(1, q - 1))}>
            －
          </button>
          <span style={{ minWidth: 24, textAlign: 'center', fontWeight: 700 }}>{qty}</span>
          <button className="btn btn--ghost btn--sm" onClick={() => setQty((q) => q + 1)}>
            ＋
          </button>
        </div>
        <button
          className="btn btn--soft"
          style={{ flex: 1 }}
          onClick={() => addToCart(false)}
        >
          加入购物车
        </button>
        <button
          className="btn btn--primary"
          style={{ flex: 1 }}
          onClick={async () => {
            await addToCart(true)
            navigate('/shop/cart')
          }}
        >
          立即购买
        </button>
      </div>
    </div>
  )
}
