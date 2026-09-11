// ============================================================
// 本地相猪的卡片与"作者信息解析"
// 关键点：用户名 / 头像 / 城市都优先从用户表实时读取（同城用户调取），
// 只有读不到真实账号时（本机示例邻居）才回落到发帖时的快照。
// ============================================================

import { avatarImage } from '../data/seed'
import type { MatchPost, User } from '../types'
import { relativeTime } from './ui'

export interface AuthorDisplay {
  name: string
  avatar: string
}

/** 按 userId 调取用户表里的昵称与头像 */
export function authorOf(
  userId: string | null,
  fallbackName: string,
  fallbackAvatar: string,
  users: User[],
): AuthorDisplay {
  const user = userId ? users.find((u) => u.id === userId) : undefined
  return {
    name: user?.nickname || fallbackName,
    avatar: user?.avatar || fallbackAvatar || avatarImage('🐹', '#FFE0B2', '#FF9A62'),
  }
}

/** 相亲帖所属城市：以用户表里的最新城市为准 */
export function matchCityOf(match: MatchPost, users: User[]): string {
  const user = users.find((u) => u.id === match.userId)
  return (user?.city || match.city || '').trim()
}

export function MatchCard({
  match,
  author,
  city,
  replyCount,
  onOpen,
}: {
  match: MatchPost
  author: AuthorDisplay
  city: string
  replyCount: number
  onOpen: () => void
}) {
  return (
    <article className="match-card" onClick={onOpen}>
      <div className="match-card__head">
        <img className="avatar avatar--sm" src={author.avatar} alt={author.name} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="post-card__author">{author.name}</div>
          <div className="post-card__time">{relativeTime(match.createdAt)}</div>
        </div>
        <span className="tag tag--blue">📍 {city || '未填城市'}</span>
      </div>

      <div className="match-card__pet">
        <img className="match-card__photo" src={match.petAvatar} alt={match.petName} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="flex-center gap-8">
            <span className="match-card__name">{match.petName}</span>
            <span className={match.petGender === '公' ? 'tag tag--blue' : 'tag'}>
              {match.petGender}
            </span>
          </div>
          <div className="fs-12 text-3">{match.breed}</div>
          <div className="match-card__req">💕 {match.requirement}</div>
        </div>
      </div>

      <div className="post-card__foot">
        <span className="like">💬 {replyCount}</span>
      </div>
    </article>
  )
}
