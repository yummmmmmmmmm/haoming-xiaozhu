import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Pet, User } from '../types'
import { data, ensureSeedData, hashPassword, newId } from '../data/repo'

interface ToastItem {
  id: string
  text: string
}

interface AppContextValue {
  ready: boolean
  currentUser: User | null
  login: (username: string, password: string) => Promise<void>
  register: (username: string, password: string) => Promise<void>
  updateProfile: (
    patch: Partial<Pick<User, 'nickname' | 'signature' | 'avatar' | 'city'>>,
  ) => Promise<void>
  logout: () => void
  pets: Pet[]
  refreshPets: () => Promise<void>
  activePetId: string | null
  setActivePetId: (id: string | null) => void
  activePet: Pet | null
  cartCount: number
  refreshCart: () => Promise<void>
  toast: (text: string) => void
  toasts: ToastItem[]
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  // 登录态只存在内存中：按你的要求"每次打开都要先登录"
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [pets, setPets] = useState<Pet[]>([])
  const [activePetId, setActivePetId] = useState<string | null>(null)
  const [cartCount, setCartCount] = useState(0)
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    ensureSeedData()
      .catch(() => undefined)
      .finally(() => setReady(true))
  }, [])

  const toast = useCallback((text: string) => {
    const id = newId('t')
    setToasts((prev) => [...prev, { id, text }])
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 1800)
  }, [])

  const refreshPets = useCallback(async () => {
    if (!currentUser) {
      setPets([])
      return
    }
    const list = await data.listPets(currentUser.id)
    setPets(list)
    setActivePetId((prev) => {
      if (prev && list.some((p) => p.id === prev)) return prev
      return list[0]?.id ?? null
    })
  }, [currentUser])

  const refreshCart = useCallback(async () => {
    if (!currentUser) {
      setCartCount(0)
      return
    }
    const list = await data.listCart(currentUser.id)
    setCartCount(list.reduce((sum, item) => sum + item.qty, 0))
  }, [currentUser])

  useEffect(() => {
    refreshPets()
  }, [refreshPets])

  useEffect(() => {
    refreshCart()
  }, [refreshCart])

  const login = useCallback(
    async (username: string, password: string) => {
      const users = await data.listUsers()
      const found = users.find((u) => u.username.toLowerCase() === username.trim().toLowerCase())
      if (!found) throw new Error('这个用户名还没有注册过')
      if (found.password !== hashPassword(password)) throw new Error('密码不对，再试一次')
      setCurrentUser(found)
    },
    [],
  )

  const register = useCallback(async (username: string, password: string) => {
    const name = username.trim()
    if (name.length < 2) throw new Error('用户名至少 2 个字符')
    if (password.length < 4) throw new Error('密码至少 4 位')
    const users = await data.listUsers()
    if (users.some((u) => u.username.toLowerCase() === name.toLowerCase())) {
      throw new Error('这个用户名已经被注册了')
    }
    const user: User = {
      id: newId('u'),
      username: name,
      password: hashPassword(password),
      // 用户名即是昵称
      nickname: name,
      avatar: '',
      signature: '我和我的猪猪们 🐹',
      city: '',
      createdAt: Date.now(),
    }
    await data.saveUser(user)
    setCurrentUser(user)
  }, [])

  const updateProfile = useCallback(
    async (patch: Partial<Pick<User, 'nickname' | 'signature' | 'avatar' | 'city'>>) => {
      if (!currentUser) return
      const next: User = { ...currentUser, ...patch }
      await data.saveUser(next)
      setCurrentUser(next)
    },
    [currentUser],
  )

  const logout = useCallback(() => {
    setCurrentUser(null)
    setPets([])
    setActivePetId(null)
    setCartCount(0)
  }, [])

  const activePet = useMemo(
    () => pets.find((p) => p.id === activePetId) ?? pets[0] ?? null,
    [pets, activePetId],
  )

  const value: AppContextValue = {
    ready,
    currentUser,
    login,
    register,
    updateProfile,
    logout,
    pets,
    refreshPets,
    activePetId: activePet?.id ?? null,
    setActivePetId,
    activePet,
    cartCount,
    refreshCart,
    toast,
    toasts,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp 必须在 AppProvider 内使用')
  return ctx
}
