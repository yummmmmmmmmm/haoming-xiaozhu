import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Empty, TopBar, relativeTime } from '../components/ui'
import { data, newId } from '../data/repo'
import { useApp } from '../store/AppContext'
import type { Message, User } from '../types'
import { displayAvatar, displayName } from '../utils/conversations'

/** 与某位猪友的私信会话 */
export default function ChatPage() {
  const { userId: otherId = '' } = useParams()
  const navigate = useNavigate()
  const { currentUser, toast } = useApp()
  const [messages, setMessages] = useState<Message[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loaded, setLoaded] = useState(false)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  const load = useCallback(async () => {
    if (!currentUser) return
    const [all, userList] = await Promise.all([
      data.listMessages(currentUser.id),
      data.listUsers(),
    ])
    setMessages(all.filter((m) => m.fromUserId === otherId || m.toUserId === otherId))
    setUsers(userList)
  }, [currentUser, otherId])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        await load()
      } finally {
        if (alive) setLoaded(true)
      }
      // 打开会话即把对方发来的消息标记为已读
      if (alive && currentUser) await data.markConversationRead(currentUser.id, otherId)
    })().catch(() => undefined)
    return () => {
      alive = false
    }
  }, [load, currentUser, otherId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ block: 'end' })
  }, [messages.length])

  const send = async () => {
    if (!currentUser) return
    const content = text.trim()
    if (!content) {
      toast('写点什么再发吧')
      return
    }
    setBusy(true)
    try {
      await data.saveMessage({
        id: newId('msg'),
        fromUserId: currentUser.id,
        toUserId: otherId,
        content,
        read: false,
        createdAt: Date.now(),
      })
      setText('')
      await load()
      toast('已发送 💬')
    } finally {
      setBusy(false)
    }
  }

  if (!loaded) return <div className="loading">加载中…</div>

  const otherName = displayName(users, otherId)
  const exists = users.some((u) => u.id === otherId)

  return (
    <div className="page page--plain" style={{ paddingBottom: 92 }}>
      <TopBar title={exists ? otherName : '私信'} onBack={() => navigate('/messages')} />

      {!exists ? (
        <Empty icon="💬" text="这位猪友不在本机用户里（示例社区的邻居还没注册账号）" />
      ) : (
        <>
          <div className="section" style={{ marginTop: 12 }}>
            <div className="card flex-center gap-12">
              <img
                className="avatar avatar--lg"
                src={displayAvatar(users, otherId)}
                alt={otherName}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 17, fontWeight: 800 }}>{otherName}</div>
                <div className="fs-12 text-3">私信消息只保存在本机</div>
              </div>
            </div>
          </div>

          <div className="section">
            {messages.length === 0 ? (
              <Empty icon="👋" text="还没有聊过，先打个招呼吧" />
            ) : (
              <div className="chat">
                {messages.map((m) => {
                  const mine = m.fromUserId === currentUser?.id
                  return (
                    <div className={`chat__row${mine ? ' chat__row--mine' : ''}`} key={m.id}>
                      {!mine ? (
                        <img
                          className="avatar avatar--sm"
                          src={displayAvatar(users, m.fromUserId)}
                          alt={displayName(users, m.fromUserId)}
                        />
                      ) : null}
                      <div className={`chat__bubble${mine ? ' chat__bubble--mine' : ''}`}>
                        <div className="chat__text">{m.content}</div>
                        <div className="chat__meta">{relativeTime(m.createdAt)}</div>
                      </div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>
            )}
          </div>
        </>
      )}

      {exists ? (
        <div className="comment-bar">
          <div className="comment-bar__row">
            <input
              className="input comment-bar__input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') send()
              }}
              placeholder={`给 ${otherName} 发消息…`}
            />
            <button className="btn btn--primary btn--sm" onClick={send} disabled={busy}>
              发送
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
