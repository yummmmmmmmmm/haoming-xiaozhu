import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Empty, Modal, TopBar } from '../components/ui'
import { data, newId } from '../data/repo'
import { PRODUCTS } from '../data/seed'
import { useApp } from '../store/AppContext'
import type { CartItem, Order, OrderItem } from '../types'

export default function CartPage() {
  const navigate = useNavigate()
  const { currentUser, refreshCart, toast } = useApp()
  const [items, setItems] = useState<CartItem[]>([])
  const [checkout, setCheckout] = useState(false)
  const [address, setAddress] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!currentUser) return
    const list = await data.listCart(currentUser.id)
    setItems(list)
  }, [currentUser])

  useEffect(() => {
    load()
  }, [load])

  const detailed = useMemo(
    () =>
      items
        .map((item) => {
          const product = PRODUCTS.find((p) => p.id === item.productId)
          return product ? { item, product } : null
        })
        .filter((x): x is { item: CartItem; product: (typeof PRODUCTS)[number] } => x !== null),
    [items],
  )

  const total = detailed.reduce((sum, d) => sum + d.product.price * d.item.qty, 0)

  const changeQty = async (cartItem: CartItem, delta: number) => {
    const qty = cartItem.qty + delta
    if (qty <= 0) {
      await data.deleteCartItem(cartItem.id)
    } else {
      await data.saveCartItem({ ...cartItem, qty })
    }
    await load()
    await refreshCart()
  }

  const removeItem = async (cartItem: CartItem) => {
    await data.deleteCartItem(cartItem.id)
    await load()
    await refreshCart()
    toast('已移出购物车')
  }

  const submitOrder = async () => {
    if (!currentUser || detailed.length === 0) return
    setBusy(true)
    try {
      const orderItems: OrderItem[] = detailed.map((d) => ({
        productId: d.product.id,
        name: d.product.name,
        price: d.product.price,
        qty: d.item.qty,
        image: d.product.image,
      }))
      const order: Order = {
        id: newId('o'),
        userId: currentUser.id,
        items: orderItems,
        total: Number(total.toFixed(2)),
        status: '已下单',
        address: address.trim() || '本机演示订单（未填写收货地址）',
        createdAt: Date.now(),
      }
      await data.saveOrder(order)
      await data.clearCart(currentUser.id)
      await refreshCart()
      setCheckout(false)
      toast('下单成功（模拟）🎉')
      navigate('/shop/orders', { replace: true })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page page--plain">
      <TopBar
        title="购物车"
        onBack={() => navigate('/shop')}
        right={
          <button className="icon-btn" onClick={() => navigate('/shop/orders')} aria-label="订单">
            📦
          </button>
        }
      />

      {detailed.length === 0 ? (
        <>
          <Empty icon="🛒" text="购物车还是空的，去挑点好物吧" />
          <button className="btn btn--primary btn--block" onClick={() => navigate('/shop')}>
            去商城逛逛
          </button>
        </>
      ) : (
        <>
          <div className="list" style={{ marginTop: 12 }}>
            {detailed.map(({ item, product }) => (
              <div className="row" key={item.id}>
                <img className="row__thumb" src={product.image} alt={product.name} />
                <div className="row__body">
                  <div className="row__title">{product.name}</div>
                  <div className="price fs-13" style={{ marginTop: 2 }}>
                    ¥{product.price.toFixed(1)}
                  </div>
                  <div className="flex-center gap-8" style={{ marginTop: 6 }}>
                    <button className="btn btn--ghost btn--sm" onClick={() => changeQty(item, -1)}>
                      －
                    </button>
                    <span style={{ minWidth: 20, textAlign: 'center' }}>{item.qty}</span>
                    <button className="btn btn--ghost btn--sm" onClick={() => changeQty(item, 1)}>
                      ＋
                    </button>
                    <button
                      className="fs-12 text-3"
                      style={{ marginLeft: 8, background: 'none' }}
                      onClick={() => removeItem(item)}
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="card mt-12 flex-between">
            <span className="text-2">合计</span>
            <span className="price" style={{ fontSize: 20 }}>
              ¥{total.toFixed(2)}
            </span>
          </div>

          <button
            className="btn btn--primary btn--block mt-12"
            onClick={() => setCheckout(true)}
          >
            结算（模拟下单）
          </button>
          <div className="fs-12 text-3" style={{ textAlign: 'center', marginTop: 12 }}>
            本机模拟下单，不会产生真实支付
          </div>
        </>
      )}

      <Modal open={checkout} onClose={() => setCheckout(false)} title="确认下单">
        <div className="fs-13 text-2" style={{ textAlign: 'center', marginBottom: 12 }}>
          共 {detailed.reduce((s, d) => s + d.item.qty, 0)} 件 · 合计 ¥{total.toFixed(2)}
        </div>
        <div className="field">
          <label className="field__label">收货地址（选填，仅供记录）</label>
          <input
            className="input"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="例如：上海市 xx 区 xx 路"
          />
        </div>
        <div className="modal__actions">
          <button className="btn btn--ghost" onClick={() => setCheckout(false)}>
            再想想
          </button>
          <button className="btn btn--primary" onClick={submitOrder} disabled={busy}>
            {busy ? '提交中…' : '确认下单'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
