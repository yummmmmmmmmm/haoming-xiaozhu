import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Empty, TopBar, relativeTime } from '../components/ui'
import { data } from '../data/repo'
import { useApp } from '../store/AppContext'
import type { Order } from '../types'

export default function OrdersPage() {
  const navigate = useNavigate()
  const { currentUser } = useApp()
  const [orders, setOrders] = useState<Order[]>([])

  const load = useCallback(async () => {
    if (!currentUser) return
    setOrders(await data.listOrders(currentUser.id))
  }, [currentUser])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="page page--plain">
      <TopBar title="我的订单" onBack={() => navigate('/shop')} />

      {orders.length === 0 ? (
        <>
          <Empty icon="📦" text="还没有订单，去商城逛逛吧" />
          <button className="btn btn--primary btn--block" onClick={() => navigate('/shop')}>
            去商城
          </button>
        </>
      ) : (
        <div className="list" style={{ marginTop: 12 }}>
          {orders.map((order) => (
            <div className="card" key={order.id}>
              <div className="flex-between fs-12 text-3">
                <span>订单号 {order.id.slice(-8).toUpperCase()}</span>
                <span>{relativeTime(order.createdAt)}</span>
              </div>
              <div className="divider" />
              {order.items.map((item) => (
                <div className="row" key={item.productId} style={{ boxShadow: 'none', padding: '8px 0' }}>
                  <img className="row__thumb" src={item.image} alt={item.name} />
                  <div className="row__body">
                    <div className="row__title">{item.name}</div>
                    <div className="row__sub">
                      ¥{item.price.toFixed(1)} × {item.qty}
                    </div>
                  </div>
                </div>
              ))}
              <div className="divider" />
              <div className="flex-between">
                <span className="tag tag--green">{order.status}</span>
                <span>
                  <span className="text-2 fs-13">合计 </span>
                  <span className="price">¥{order.total.toFixed(2)}</span>
                </span>
              </div>
              <div className="fs-12 text-3 mt-8">收货：{order.address}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
