import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MatchCard, authorOf, matchCityOf } from '../components/MatchCard'
import { Empty, TopBar } from '../components/ui'
import { data } from '../data/repo'
import { useApp } from '../store/AppContext'
import type { MatchPost, MatchReply, User } from '../types'

/** 本地相猪：同城板块 */
export default function MatchesPage() {
  const navigate = useNavigate()
  const { currentUser } = useApp()
  const [matches, setMatches] = useState<MatchPost[]>([])
  const [replies, setReplies] = useState<MatchReply[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [onlySameCity, setOnlySameCity] = useState(true)
  const [loaded, setLoaded] = useState(false)

  const load = useCallback(async () => {
    const [m, r, u] = await Promise.all([
      data.listMatches(),
      data.listMatchReplies(),
      data.listUsers(),
    ])
    setMatches(m)
    setReplies(r)
    setUsers(u)
  }, [])

  useEffect(() => {
    load()
      .catch(() => undefined)
      .finally(() => setLoaded(true))
  }, [load])

  const myCity = (currentUser?.city ?? '').trim()

  const visible = useMemo(() => {
    if (!onlySameCity || !myCity) return matches
    return matches.filter((m) => matchCityOf(m, users) === myCity)
  }, [matches, users, onlySameCity, myCity])

  if (!loaded) return <div className="loading">加载中…</div>

  return (
    <div className="page page--plain">
      <TopBar
        title="本地相猪"
        onBack={() => navigate('/account')}
        right={
          <button className="icon-btn" onClick={() => navigate('/matches/new')} aria-label="发布相亲帖">
            ＋
          </button>
        }
      />

      <div className="section" style={{ marginTop: 12 }}>
        <div className="card hero-card">
          <div style={{ fontSize: 22 }}>💕 本地相猪</div>
          <div className="fs-13 text-2 mt-8">
            留下自家猪猪的照片、性别与择偶要求，和同城的猪友互相看看、聊聊。
          </div>
          <div className="fs-12 text-3 mt-8">
            我的城市：{myCity || '还没有设置'}
          </div>
        </div>

        <div className="chips mt-12">
          <button
            className={`chip${onlySameCity ? ' chip--on' : ''}`}
            onClick={() => setOnlySameCity(true)}
          >
            同城{myCity ? ` · ${myCity}` : ''}
          </button>
          <button
            className={`chip${onlySameCity ? '' : ' chip--on'}`}
            onClick={() => setOnlySameCity(false)}
          >
            全部城市
          </button>
        </div>

        {!myCity ? (
          <div className="card mt-12 flex-between">
            <span className="fs-13 text-2">设置城市后就能只看同城猪友</span>
            <button className="btn btn--soft btn--sm" onClick={() => navigate('/account')}>
              去设置
            </button>
          </div>
        ) : null}

        <button
          className="btn btn--primary btn--block mt-12"
          onClick={() => navigate('/matches/new')}
        >
          💕 发布我家猪猪的相亲帖
        </button>
      </div>

      <div className="section">
        <div className="section-title" style={{ marginBottom: 10 }}>
          {onlySameCity && myCity ? `同城猪友（${visible.length}）` : `全部相亲帖（${visible.length}）`}
        </div>
        {visible.length === 0 ? (
          <Empty
            icon="💕"
            text={
              onlySameCity && myCity
                ? '这个城市还没有人发相亲帖，来发第一条吧'
                : '还没有相亲帖，来发第一条吧'
            }
          />
        ) : (
          <div className="list">
            {visible.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                author={authorOf(m.userId, m.authorName, m.authorAvatar, users)}
                city={matchCityOf(m, users)}
                replyCount={replies.filter((r) => r.matchId === m.id).length}
                onOpen={() => navigate(`/matches/${m.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="fs-12 text-3" style={{ textAlign: 'center', marginTop: 22 }}>
        本机示例社区 · 数据只保存在自己电脑上
      </div>
    </div>
  )
}
