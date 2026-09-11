import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ProductCard } from '../components/ProductCard'
import { TopBar } from '../components/ui'
import { PRODUCTS, PRODUCT_CATEGORIES } from '../data/seed'
import { useApp } from '../store/AppContext'

export default function ShopPage() {
  const navigate = useNavigate()
  const { cartCount } = useApp()
  const [category, setCategory] = useState('全部')

  const visible = useMemo(
    () => (category === '全部' ? PRODUCTS : PRODUCTS.filter((p) => p.category === category)),
    [category],
  )

  return (
    <div className="page">
      <TopBar
        title="商城购买"
        right={
          <button className="icon-btn" onClick={() => navigate('/shop/cart')} aria-label="购物车">
            🛒
            {cartCount > 0 ? <span className="icon-btn__badge">{cartCount}</span> : null}
          </button>
        }
      />

      <div className="section" style={{ marginTop: 12 }}>
        <div className="card hero-card">
          <div style={{ fontSize: 16, fontWeight: 800 }}>🐹 好命小猪优选</div>
          <div className="fs-13 text-2 mt-8">
            主粮、笼具、垫料、玩具和周边，给猪猪挑点好东西。本机模拟下单，不产生真实支付。
          </div>
        </div>
      </div>

      <div className="chips" style={{ marginTop: 14, overflowX: 'auto', flexWrap: 'nowrap' }}>
        {['全部', ...PRODUCT_CATEGORIES].map((c) => (
          <button
            key={c}
            className={`chip${category === c ? ' chip--on' : ''}`}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid-2" style={{ marginTop: 14 }}>
        {visible.map((p) => (
          <ProductCard key={p.id} product={p} onClick={(x) => navigate(`/shop/p/${x.id}`)} />
        ))}
      </div>

      <div className="fs-12 text-3" style={{ textAlign: 'center', marginTop: 22 }}>
        共 {visible.length} 件商品 · 数据保存在本机
      </div>
    </div>
  )
}
