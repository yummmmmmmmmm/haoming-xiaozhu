// ============================================================
// 私信会话的聚合与展示辅助
// ============================================================

import { avatarImage } from '../data/seed'
import type { Message, User } from '../types'

export interface Conversation {
  /** 对方的用户 id */
  userId: string
  /** 最后一条消息 */
  last: Message
  /** 我还没读的条数 */
  unread: number
}

/** 把"与我有关的全部私信"按对方聚合成会话列表（最近的在前） */
export function buildConversations(messages: Message[], myId: string): Conversation[] {
  const map = new Map<string, Conversation>()
  for (const m of messages) {
    const otherId = m.fromUserId === myId ? m.toUserId : m.fromUserId
    const unreadAdd = m.toUserId === myId && !m.read ? 1 : 0
    const existed = map.get(otherId)
    if (existed) {
      existed.last = m
      existed.unread += unreadAdd
    } else {
      map.set(otherId, { userId: otherId, last: m, unread: unreadAdd })
    }
  }
  return [...map.values()].sort((a, b) => b.last.createdAt - a.last.createdAt)
}

/** 我的未读私信总数 */
export function unreadCount(messages: Message[], myId: string): number {
  return messages.filter((m) => m.toUserId === myId && !m.read).length
}

/** 取用户表里的昵称 / 头像，读不到时给个兜底 */
export function displayName(users: User[], userId: string, fallback = '未知用户'): string {
  return users.find((u) => u.id === userId)?.nickname || fallback
}

export function displayAvatar(users: User[], userId: string): string {
  return (
    users.find((u) => u.id === userId)?.avatar || avatarImage('🐹', '#FFE0B2', '#FF9A62')
  )
}
