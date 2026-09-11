import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { authorOf, matchCityOf } from '../components/MatchCard'
import { Empty, Modal, TopBar, relativeTime } from '../components/ui'
import { data, newId } from '../data/repo'
import { avatarImage } from '../data/seed'
import { useApp } from '../store/AppContext'
import type { MatchPost, MatchReply, User } from '../types'

/** 本地相猪：相亲帖详情 + 猪友之间相互回复 */
export default function MatchDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { currentUser, toast } = useApp()
  const [match, setMatch] = useState<MatchPost | null>(null)
  const [replies, setReplies] = useState<MatchReply[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loaded, setLoaded] = useState(false)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  const load = useCallback(async () => {
    const [list, replyList, userList] = await Promise.all([
      data.listMatches(),
      data.listMatchReplies(id),
      data.listUsers(),
    ])
    setMatch(list.find((m) => m.id === id) ?? null)
    setReplies(replyList)
    setUsers(userList)
  }, [id])

  useEffect(() => {
    load()
      .catch(() => undefined)
      .finally(() => setLoaded(true))
  }, [load])

  const send = async () => {
    if (!match || !currentUser) return
    const content = text.trim()
    if (!content) {
      toast('写点什么再发吧')
      return
    }
    setBusy(true)
    try {
      const reply: MatchReply = {
        id: newId('mr'),
        matchId: match.id,
        userId: currentUser.id,
        authorName: currentUser.nickname,
        authorAvatar: currentUser.avatar || avatarImage('🐹', '#FFE0B2', '#FF9A62'),
        content,
        createdAt: Date.now(),
      }
      await data.saveMatchReply(reply)
      setText('')
      await load()
      toast('回复成功 💬')
    } finally {
      setBusy(false)
    }
  }

  const removeReply = async (reply: MatchReply) => {
    await data.deleteMatchReply(reply.id)
    await load()
    toast('已删除')
  }

  const removeMatch = async () => {
    if (!match) return
    await data.deleteMatch(match.id)
    toast('已删除')
    navigate('/matches', { replace: true })
  }

  if (!loaded) return <div className="loading">加载中…</div>

  if (!match) {
    return (
      <div className="page page--plain">
        <TopBar title="相亲帖" onBack={() => navigate('/matches')} />
        <Empty icon="💕" text="这条相亲帖不存在了" />
      </div>
    )
  }

  const author = authorOf(match.userId, match.authorName, match.authorAvatar, users)
  const city = matchCityOf(match, users)
  const isMine = currentUser && match.userId === currentUser.id

  return (
    <div className="page page--plain" style={{ paddingBottom: 96 }}>
      <TopBar
        title="相亲帖"
        onBack={() => navigate(-1)}
        right={
          isMine ? (
            <button className="icon-btn" onClick={() => setConfirmDel(true)} aria-label="删除">
              🗑️
            </button>
          ) : null
        }
      />

      <div className="section" style={{ marginTop: 12 }}>
        <div className="card">
          <div className="post-card__head">
            <img className="avatar" src={author.avatar} alt={author.name} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="post-card__author">{author.name}</div>
              <div className="post-card__time">
                {relativeTime(match.createdAt)} · 本地相猪
              </div>
            </div>
            <span className="tag tag--blue">📍 {city || '未填城市'}</span>
          </div>

          <div className="match-card__pet" style={{ marginTop: 12 }}>
            <img className="match-card__photo" src={match.petAvatar} alt={match.petName} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="flex-center gap-8">
                <span className="match-card__name">{match.petName}</span>
                <span className={match.petGender === '公' ? 'tag tag--blue' : 'tag'}>
                  {match.petGender}
                </span>
              </div>
              <div className="fs-12 text-3">{match.breed}</div>
            </div>
          </div>

          <div className="divider" />

          <div className="fs-13 text-2">择偶要求</div>
          <div className="post-card__content mt-8">{match.requirement}</div>

          <div className="divider" />

          <div className="flex-between">
            <span className="fs-13 text-3">💬 {replies.length} 条回复</span>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-title" style={{ marginBottom: 10 }}>
          猪友回复（{replies.length}）
        </div>

        {replies.length === 0 ? (
          <Empty icon="💬" text="还没有猪友回复，来说两句吧" />
        ) : (
          <div className="list">
            {replies.map((r) => {
              const replyAuthor = authorOf(r.userId, r.authorName, r.authorAvatar, users)
              return (
                <div className="comment" key={r.id}>
                  <img className="avatar avatar--sm" src={replyAuthor.avatar} alt={replyAuthor.name} />
                  <div className="comment__body">
                    <div className="comment__head">
                      <span className="comment__name">{replyAuthor.name}</span>
                      <span className="comment__time">{relativeTime(r.createdAt)}</span>
                    </div>
                    <div className="comment__text">{r.content}</div>
                    {currentUser && r.userId === currentUser.id ? (
                      <div className="comment__actions">
                        <button className="comment__action" onClick={() => removeReply(r)}>
                          删除
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="fs-12 text-3" style={{ textAlign: 'center', marginTop: 22 }}>
        本机示例社区 · 数据只保存在自己电脑上
      </div>

      <div className="comment-bar">
        <div className="comment-bar__row">
          <input
            className="input comment-bar__input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') send()
            }}
            placeholder="回复这位猪友…"
          />
          <button className="btn btn--primary btn--sm" onClick={send} disabled={busy}>
            发送
          </button>
        </div>
      </div>

      <Modal open={confirmDel} onClose={() => setConfirmDel(false)} title="删除这条相亲帖？">
        <div className="fs-13 text-2" style={{ textAlign: 'center' }}>
          帖子和它的全部回复都会被删除，且无法恢复
        </div>
        <div className="modal__actions">
          <button className="btn btn--ghost" onClick={() => setConfirmDel(false)}>
            取消
          </button>
          <button className="btn btn--primary" onClick={removeMatch}>
            删除
          </button>
        </div>
      </Modal>
    </div>
  )
}
