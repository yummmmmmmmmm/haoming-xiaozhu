// ============================================================
// 商品引用：论坛里引用"自己在商城买到的商品"，
// 帖子/回复下方的其他用户都能看见，点击直达商城商品详情。
// ============================================================

import { useNavigate } from 'react-router-dom'
import { PRODUCTS } from '../data/seed'
import type { Product } from '../types'

/**
 * 商品引用卡片。商品可能因下架/换版而不存在，此时安全地不渲染。
 * 点击时阻止冒泡，避免连带触发外层"打开帖子"之类的交互。
 */
export function ProductRef({ productId }: { productId?: string }) {
  const navigate = useNavigate()
  if (!productId) return null
  const product = PRODUCTS.find((p) => p.id === productId)
  if (!product) return null

  return (
    <button
      type="button"
      className="product-ref"
      aria-label={`查看商品 ${product.name}`}
      onClick={(e) => {
        e.stopPropagation()
        navigate(`/shop/p/${product.id}`)
      }}
    >
      <img className="product-ref__img" src={product.image} alt={product.name} />
      <span className="product-ref__body">
        <span className="product-ref__tag">🛍️ 引用商品</span>
        <span className="product-ref__name">{product.name}</span>
      </span>
      <span className="product-ref__price">¥{product.price.toFixed(1)}</span>
      <span className="product-ref__go">去看看 ›</span>
    </button>
  )
}

/** 从"已购商品"里挑一个引用（只能引用买过的） */
export function ProductRefPicker({
  items,
  value,
  onChange,
}: {
  items: Product[]
  value: string
  onChange: (productId: string) => void
}) {
  return (
    <div className="chips">
      <button
        type="button"
        className={`chip${value === '' ? ' chip--on' : ''}`}
        onClick={() => onChange('')}
      >
        不引用
      </button>
      {items.map((p) => (
        <button
          key={p.id}
          type="button"
          className={`chip${value === p.id ? ' chip--on' : ''}`}
          aria-label={`引用商品 ${p.name}`}
          onClick={() => onChange(p.id)}
        >
          🛍️ {p.name}
        </button>
      ))}
    </div>
  )
}

/** 用户"买过的商品"去重列表（论坛只能引用已购商品） */
export function purchasedProducts(
  orders: { items: { productId: string }[] }[],
): Product[] {
  const ids = new Set<string>()
  orders.forEach((o) => o.items.forEach((i) => ids.add(i.productId)))
  return PRODUCTS.filter((p) => ids.has(p.id))
}
