import type { Product } from '../types'

export function ProductCard({
  product,
  onClick,
}: {
  product: Product
  onClick: (product: Product) => void
}) {
  return (
    <button className="product-card" onClick={() => onClick(product)}>
      <img src={product.image} alt={product.name} />
      <div className="product-card__body">
        <div className="product-card__name">{product.name}</div>
        <div className="flex-between mt-8">
          <div>
            <span className="price">¥{product.price.toFixed(1)}</span>
            {product.originalPrice ? (
              <span className="price--old">¥{product.originalPrice.toFixed(1)}</span>
            ) : null}
          </div>
          {product.isNew ? <span className="tag tag--green">新品</span> : null}
        </div>
        <div className="fs-12 text-3" style={{ marginTop: 4 }}>
          已售 {product.sales}
        </div>
      </div>
    </button>
  )
}
