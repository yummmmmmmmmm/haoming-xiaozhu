import { useState, type ReactNode } from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { BottomNav } from './components/BottomNav'
import { QuickRecordSheet } from './components/QuickRecordSheet'
import { Toasts } from './components/ui'
import { useApp } from './store/AppContext'

import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import GuidePage from './pages/GuidePage'
import GuideCategoryPage from './pages/GuideCategoryPage'
import GuideArticlePage from './pages/GuideArticlePage'
import ForumPage from './pages/ForumPage'
import ForumNewPage from './pages/ForumNewPage'
import ForumPostPage from './pages/ForumPostPage'
import ShopPage from './pages/ShopPage'
import ProductPage from './pages/ProductPage'
import CartPage from './pages/CartPage'
import OrdersPage from './pages/OrdersPage'
import PetsPage from './pages/PetsPage'
import PetEditPage from './pages/PetEditPage'
import PetDetailPage from './pages/PetDetailPage'
import WeightPage from './pages/WeightPage'
import BirthPage from './pages/BirthPage'
import HealthPage from './pages/HealthPage'
import DiaryPage from './pages/DiaryPage'
import TodoPage from './pages/TodoPage'
import AlbumPage from './pages/AlbumPage'
import AccountPage from './pages/AccountPage'

function RequireAuth({ children }: { children: ReactNode }) {
  const { ready, currentUser } = useApp()
  if (!ready) return <div className="loading">好命小猪加载中…</div>
  if (!currentUser) return <Navigate to="/login" replace />
  return <>{children}</>
}

/** 带底部导航的页面（主标签页） */
function TabLayout() {
  const [quickOpen, setQuickOpen] = useState(false)
  return (
    <>
      <Outlet />
      <BottomNav onQuickRecord={() => setQuickOpen(true)} />
      <QuickRecordSheet open={quickOpen} onClose={() => setQuickOpen(false)} />
    </>
  )
}

/** 不带底部导航的页面（详情 / 表单等） */
function PlainLayout() {
  return (
    <>
      <Outlet />
    </>
  )
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          element={
            <RequireAuth>
              <TabLayout />
            </RequireAuth>
          }
        >
          <Route path="/" element={<HomePage />} />
          <Route path="/guide" element={<GuidePage />} />
          <Route path="/forum" element={<ForumPage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/pets" element={<PetsPage />} />
          <Route path="/account" element={<AccountPage />} />
        </Route>

        <Route
          element={
            <RequireAuth>
              <PlainLayout />
            </RequireAuth>
          }
        >
          <Route path="/guide/c/:catId" element={<GuideCategoryPage />} />
          <Route path="/guide/a/:id" element={<GuideArticlePage />} />
          <Route path="/forum/new" element={<ForumNewPage />} />
          <Route path="/forum/p/:id" element={<ForumPostPage />} />
          <Route path="/shop/p/:id" element={<ProductPage />} />
          <Route path="/shop/cart" element={<CartPage />} />
          <Route path="/shop/orders" element={<OrdersPage />} />
          <Route path="/pets/edit/:id" element={<PetEditPage />} />
          <Route path="/pets/:id" element={<PetDetailPage />} />
          <Route path="/record/weight" element={<WeightPage />} />
          <Route path="/record/birth" element={<BirthPage />} />
          <Route path="/record/health" element={<HealthPage />} />
          <Route path="/record/diary" element={<DiaryPage />} />
          <Route path="/record/todo" element={<TodoPage />} />
          <Route path="/album" element={<AlbumPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* 轻提示挂在最外层，保证登录页等非受保护页面也能看到提示 */}
      <Toasts />
    </>
  )
}
