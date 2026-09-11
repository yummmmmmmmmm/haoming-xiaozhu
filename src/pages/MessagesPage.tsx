import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Empty, Sheet, TopBar, relativeTime } from '../components/ui'
import { data } from '../data/repo'
import { useApp } from '../store/AppContext'
import type { Message, User } from '../types'
import { displayAvatar, displayName, buildConversations } from '../utils/conversations'

/** 账户 · 我的私信：会话列表 + 发起私信 */
export default function MessagesPage() {
  const navigate = useNavigate()
  const { currentUser } = useApp()
  const [loaded, setLoaded] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)

  const load = useCallback(async () => {
    if (!currentUser) return
    const [msgList, userList] = await Promise.all([
      data.listMessages(currentUser.id),
      data.listUsers(),
    ])
    setMessages(msgList)
    setUsers(userList)
  }, [currentUser])

  useEffect(() => {
    load()
      .catch(() => undefined)
      .finally(() => setLoaded(true))
  }, [load])

  const conversations = useMemo(
    () => (currentUser ? buildConversations(messages, currentUser.id) : []),
    [messages, currentUser],
  )

  const others = useMemo(
    () => users.filter((u) => u.id !== currentUser?.id),
    [users, currentUser],
  )

  if (!loaded) return <div className="loading">加载中…</div>

  return (
    <div className="page page--plain">
      <TopBar
        title="我的私信"
        onBack={() => navigate('/account')}
        right={
          <button className="icon-btn" onClick={() => setPickerOpen(true)} aria-label="发起私信">
            ✍️
          </button>
        }
      />

      <div className="section" style={{ marginTop: 12 }}>
        {conversations.length === 0 ? (
          <Empty icon="💬" text="还没有私信，点右上角给猪友发第一条吧" />
        ) : (
          <div className="list">
            {conversations.map((c) => (
              <div
                className="row"
                key={c.userId}
                onClick={() => navigate(`/messages/${c.userId}`)}
              >
                <img
                  className="row__thumb"
                  src={displayAvatar(users, c.userId)}
                  alt={displayName(users, c.userId)}
                />
                <div className="row__body">
                  <div className="row__title">{displayName(users, c.userId)}</div>
                  <div className="row__sub chat-row__preview">{c.last.content}</div>
                </div>
                <div className="chat-row__side">
                  <span className="fs-12 text-3">{relativeTime(c.last.createdAt)}</span>
                  {c.unread > 0 ? <span className="row__badge">{c.unread}</span> : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="fs-12 text-3" style={{ textAlign: 'center', marginTop: 22 }}>
        私信只保存在本机 · 一起聊聊猪猪的那些事
      </div>

      <Sheet open={pickerOpen} onClose={() => setPickerOpen(false)}>
        <div className="sheet__title">发起私信</div>
        <div className="sheet__sub">选择一位猪友开始聊天</div>
        {others.length === 0 ? (
          <Empty icon="🐹" text="本机还没有第二位猪友" />
        ) : (
          <div className="list">
            {others.map((u) => (
              <div
                className="row"
                key={u.id}
                onClick={() => {
                  setPickerOpen(false)
                  navigate(`/messages/${u.id}`)
                }}
              >
                <img
                  className="row__thumb"
                  src={displayAvatar(users, u.id)}
                  alt={u.nickname}
                />
                <div className="row__body">
                  <div className="row__title">{u.nickname}</div>
                  <div className="row__sub">
                    @{u.username}
                    {u.city ? ` · 📍${u.city}` : ''}
                  </div>
                </div>
                <span className="row__action">›</span>
              </div>
            ))}
          </div>
        )}
      </Sheet>
    </div>
  )
}
