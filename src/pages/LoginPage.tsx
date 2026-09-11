import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppContext'

const REMEMBER_KEY = 'haoming-xiaozhu.remember'

interface Remembered {
  username: string
  password: string
}

function readRemembered(): Remembered | null {
  try {
    const raw = window.localStorage.getItem(REMEMBER_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Remembered
    if (typeof parsed?.username !== 'string') return null
    return { username: parsed.username, password: parsed.password ?? '' }
  } catch {
    return null
  }
}

export default function LoginPage() {
  const { ready, currentUser, login, register, toast } = useApp()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // 打开时把之前记住的账号密码填回去
  useEffect(() => {
    const saved = readRemembered()
    if (!saved) return
    setUsername(saved.username)
    setPassword(saved.password)
    setRemember(true)
  }, [])

  if (!ready) return <div className="loading">好命小猪加载中…</div>
  if (currentUser) return <Navigate to="/" replace />

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'login') {
        await login(username, password)
        toast('欢迎回来 🐹')
      } else {
        await register(username, password)
        toast('注册成功，欢迎加入好命小猪！')
      }
      if (remember) {
        window.localStorage.setItem(
          REMEMBER_KEY,
          JSON.stringify({ username: username.trim(), password }),
        )
      } else {
        window.localStorage.removeItem(REMEMBER_KEY)
      }
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : '出错了，请重试')
    } finally {
      setBusy(false)
    }
  }

  const oauthTip = (name: string) => {
    toast(`${name}授权需接入开放平台，本机版请先用账号密码登录`)
  }

  const switchMode = (next: 'login' | 'register') => {
    setMode(next)
    setError('')
  }

  return (
    <div className="login">
      <div className="login__logo">🐹</div>
      <div className="login__title">好命小猪</div>
      <div className="login__sub">荷兰猪饲养 · 分享 · 记录 · 好物</div>

      <form className="login__form" onSubmit={onSubmit}>
        {error ? <div className="login__error">{error}</div> : null}

        <div className="field">
          <label className="field__label">用户名</label>
          <input
            className="input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={mode === 'login' ? '输入用户名' : '用户名就是你在论坛的昵称'}
            autoComplete="username"
          />
        </div>

        <div className="field">
          <label className="field__label">密码</label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === 'login' ? '输入密码' : '至少 4 位'}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
        </div>

        <label className="checkbox">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          <span className="checkbox__box">{remember ? '✓' : ''}</span>
          <span>记住账号密码</span>
        </label>

        <button className="btn btn--primary btn--block" type="submit" disabled={busy}>
          {busy ? '处理中…' : mode === 'login' ? '登录' : '注册并进入'}
        </button>
      </form>

      <div className="login__or">
        <span>其他方式登录</span>
      </div>

      <div className="login__oauth">
        <button className="oauth-btn oauth-btn--wechat" onClick={() => oauthTip('微信')}>
          <span className="oauth-btn__icon">💬</span>
          微信登录
        </button>
        <button className="oauth-btn oauth-btn--douyin" onClick={() => oauthTip('抖音')}>
          <span className="oauth-btn__icon">🎵</span>
          抖音登录
        </button>
      </div>

      <div className="fs-12 text-3" style={{ textAlign: 'center', marginTop: 12 }}>
        微信 / 抖音授权登录待接入，当前请使用账号密码
      </div>

      <div className="login__switch">
        {mode === 'login' ? (
          <>
            还没有账号？
            <b onClick={() => switchMode('register')}> 注册一个</b>
          </>
        ) : (
          <>
            已经有账号了？
            <b onClick={() => switchMode('login')}> 去登录</b>
          </>
        )}
      </div>

      <div className="fs-12 text-3" style={{ textAlign: 'center', marginTop: 26 }}>
        账号和数据都只保存在你这台电脑上，不会上传网络
      </div>
    </div>
  )
}
