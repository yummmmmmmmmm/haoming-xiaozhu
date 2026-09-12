import { MessagesSquare, PenLine } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PostCard } from '../components/PostCard'
import { Empty, TopBar } from '../components/ui'
import { data } from '../data/repo'
import { POST_TOPICS } from '../data/seed'
import { useApp } from '../store/AppContext'
import type { Comment, Post } from '../types'

export default function ForumPage() {
  const navigate = useNavigate()
  const { currentUser } = useApp()
  const [posts, setPosts] = useState<Post[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [topic, setTopic] = useState<string>('全部')

  const load = useCallback(async () => {
    const [postList, commentList] = await Promise.all([data.listPosts(), data.listComments()])
    setPosts(postList)
    setComments(commentList)
  }, [])

  useEffect(() => {
    load().catch(() => undefined)
  }, [load])

  const commentCounts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const c of comments) map[c.postId] = (map[c.postId] ?? 0) + 1
    return map
  }, [comments])

  const toggleLike = async (post: Post) => {
    const next: Post = {
      ...post,
      liked: !post.liked,
      likes: post.likes + (post.liked ? -1 : 1),
    }
    await data.savePost(next)
    setPosts((prev) => prev.map((p) => (p.id === post.id ? next : p)))
  }

  const visible = topic === '全部' ? posts : posts.filter((p) => p.topic === topic)

  return (
    <div className="page">
      <TopBar
        title="论坛分享"
        right={
          <button className="icon-btn" onClick={() => navigate('/forum/new')} aria-label="发帖">
            <PenLine size={17} strokeWidth={1.75} />
          </button>
        }
      />

      <div className="chips" style={{ marginTop: 12, overflowX: 'auto', flexWrap: 'nowrap' }}>
        {['全部', ...POST_TOPICS].map((t) => (
          <button
            key={t}
            className={`chip${topic === t ? ' chip--on' : ''}`}
            onClick={() => setTopic(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <Empty icon={<MessagesSquare size={36} strokeWidth={1.4} />} text="这个话题下还没有帖子，来发第一条吧" />
      ) : (
        <div className="list" style={{ marginTop: 14 }}>
          {visible.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              commentCount={commentCounts[p.id] ?? 0}
              onToggleLike={toggleLike}
              onOpen={() => navigate(`/forum/p/${p.id}`)}
            />
          ))}
        </div>
      )}

      {currentUser ? (
        <div className="fs-12 text-3" style={{ textAlign: 'center', marginTop: 22 }}>
          这是本机示例社区，你发的帖子只保存在自己电脑上
        </div>
      ) : null}
    </div>
  )
}
