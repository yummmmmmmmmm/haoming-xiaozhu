import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { DiaryQuickAdd } from '../components/DiaryQuickAdd'
import { ProductRef, ProductRefPicker, purchasedProducts } from '../components/ProductRef'
import { Empty, Modal, Sheet, TopBar, relativeTime } from '../components/ui'
import { data, newId } from '../data/repo'
import { avatarImage } from '../data/seed'
import { useApp } from '../store/AppContext'
import type { Comment, Post, Product } from '../types'

export default function ForumPostPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { currentUser, toast } = useApp()
  const [post, setPost] = useState<Post | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [loaded, setLoaded] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [text, setText] = useState('')
  const [replyTo, setReplyTo] = useState<Comment | null>(null)
  const [busy, setBusy] = useState(false)
  const [diaryOpen, setDiaryOpen] = useState(false)
  const [purchased, setPurchased] = useState<Product[]>([])
  const [refProductId, setRefProductId] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)

  // 只有买过的商品才能被引用
  useEffect(() => {
    if (!currentUser) return
    let alive = true
    data
      .listOrders(currentUser.id)
      .then((orders) => {
        if (alive) setPurchased(purchasedProducts(orders))
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [currentUser])

  /** 把帖子和前几条回复摘成一段可以存进饲养日记的文字 */
  const diaryDraft = useMemo(() => {
    if (!post) return ''
    const replies = comments.slice(0, 3).map((c) => `· @${c.authorName}：${c.content}`)
    return [
      `【论坛摘录 · ${post.topic}】@${post.authorName}`,
      post.content,
      replies.length > 0 ? `大家的回复：\n${replies.join('\n')}` : '',
    ]
      .filter(Boolean)
      .join('\n')
  }, [post, comments])

  const load = useCallback(async () => {
    const [posts, list] = await Promise.all([data.listPosts(), data.listComments(id)])
    setPost(posts.find((p) => p.id === id) ?? null)
    setComments(list)
  }, [id])

  useEffect(() => {
    load()
      .catch(() => undefined)
      .finally(() => setLoaded(true))
  }, [load])

  const toggleLike = async () => {
    if (!post) return
    const next: Post = {
      ...post,
      liked: !post.liked,
      likes: post.likes + (post.liked ? -1 : 1),
    }
    await data.savePost(next)
    setPost(next)
  }

  const remove = async () => {
    if (!post) return
    await data.deletePost(post.id)
    toast('已删除')
    navigate('/forum', { replace: true })
  }

  const send = async () => {
    if (!post || !currentUser) return
    const content = text.trim()
    if (!content) {
      toast('写点什么再发吧')
      return
    }
    setBusy(true)
    try {
      const comment: Comment = {
        id: newId('c'),
        postId: post.id,
        userId: currentUser.id,
        authorName: currentUser.nickname,
        authorAvatar: currentUser.avatar || avatarImage('🐹', '#FFE0B2', '#FF9A62'),
        content,
        productId: refProductId || undefined,
        replyToId: replyTo?.id ?? null,
        replyToName: replyTo?.authorName ?? '',
        createdAt: Date.now(),
      }
      await data.saveComment(comment)
      setText('')
      setReplyTo(null)
      setRefProductId('')
      await load()
      toast('回复成功 💬')
    } finally {
      setBusy(false)
    }
  }

  const removeComment = async (comment: Comment) => {
    await data.deleteComment(comment.id)
    await load()
    toast('已删除')
  }

  if (!loaded) return <div className="loading">加载中…</div>

  if (!post) {
    return (
      <div className="page page--plain">
        <TopBar title="帖子" onBack={() => navigate('/forum')} />
        <Empty icon="💬" text="这条帖子不存在了" />
      </div>
    )
  }

  const isMine = currentUser && post.userId === currentUser.id
  const refProduct = purchased.find((p) => p.id === refProductId) ?? null

  return (
    <div className="page page--plain" style={{ paddingBottom: 116 }}>
      <TopBar
        title="帖子详情"
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
            <img className="avatar" src={post.authorAvatar} alt={post.authorName} />
            <div style={{ flex: 1 }}>
              <div className="post-card__author">{post.authorName}</div>
              <div className="post-card__time">
                {relativeTime(post.createdAt)} · {post.topic}
              </div>
            </div>
          </div>

          <div className="post-card__content" style={{ marginTop: 6 }}>
            {post.content}
          </div>

          {post.images.length > 0 ? (
            <div className="post-card__images" style={{ marginTop: 12 }}>
              {post.images.map((img, i) => (
                <img src={img} alt={`配图 ${i + 1}`} key={i} />
              ))}
            </div>
          ) : null}

          {post.productId ? (
            <div className="mt-12">
              <ProductRef productId={post.productId} />
            </div>
          ) : null}

          <div className="divider" />

          <div className="flex-between">
            <button className={`like${post.liked ? ' like--on' : ''}`} onClick={toggleLike}>
              <span style={{ fontSize: 18 }}>{post.liked ? '❤️' : '🤍'}</span>
              <span>{post.likes} 个赞</span>
            </button>
            <span className="fs-13 text-3">💬 {comments.length} 条回复</span>
          </div>
        </div>

        <button className="btn btn--soft btn--block mt-12" onClick={() => setDiaryOpen(true)}>
          📔 记入饲养日记
        </button>
      </div>

      {/* ---------------- 回复区 ---------------- */}
      <div className="section">
        <div className="section-title" style={{ marginBottom: 10 }}>
          💬 回复（{comments.length}）
        </div>

        {comments.length === 0 ? (
          <Empty icon="💬" text="还没有人回复，来说两句吧" />
        ) : (
          <div className="list">
            {comments.map((c) => (
              <div className="comment" key={c.id}>
                <img className="avatar avatar--sm" src={c.authorAvatar} alt={c.authorName} />
                <div className="comment__body">
                  <div className="comment__head">
                    <span className="comment__name">{c.authorName}</span>
                    <span className="comment__time">{relativeTime(c.createdAt)}</span>
                  </div>
                  <div className="comment__text">
                    {c.replyToName ? (
                      <span className="comment__quote">回复 @{c.replyToName}：</span>
                    ) : null}
                    {c.content}
                  </div>
                  {c.productId ? (
                    <div className="mt-8">
                      <ProductRef productId={c.productId} />
                    </div>
                  ) : null}
                  <div className="comment__actions">
                    <button
                      className="comment__action"
                      onClick={() => {
                        setReplyTo(c)
                        setText('')
                      }}
                    >
                      回复
                    </button>
                    {currentUser && c.userId === currentUser.id ? (
                      <button className="comment__action" onClick={() => removeComment(c)}>
                        删除
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="fs-12 text-3" style={{ textAlign: 'center', marginTop: 22 }}>
        本机示例社区 · 数据只保存在自己电脑上
      </div>

      {/* ---------------- 底部输入条 ---------------- */}
      <div className="comment-bar">
        {replyTo ? (
          <div className="comment-bar__reply">
            正在回复 @{replyTo.authorName}
            <button onClick={() => setReplyTo(null)}>取消</button>
          </div>
        ) : null}
        {refProduct ? (
          <div className="comment-bar__reply">
            🛍️ 引用商品：{refProduct.name}
            <button onClick={() => setRefProductId('')}>取消引用</button>
          </div>
        ) : null}
        <div className="comment-bar__row">
          <button
            className="icon-btn"
            aria-label="引用已购商品"
            onClick={() => setPickerOpen(true)}
            style={{ width: 40, height: 40, flexShrink: 0 }}
          >
            🛍️
          </button>
          <input
            className="input comment-bar__input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') send()
            }}
            placeholder={replyTo ? `回复 @${replyTo.authorName}` : '说点什么…'}
          />
          <button className="btn btn--primary btn--sm" onClick={send} disabled={busy}>
            发送
          </button>
        </div>
      </div>

      <Sheet open={pickerOpen} onClose={() => setPickerOpen(false)}>
        <div className="sheet__title">引用已购商品</div>
        <div className="sheet__sub">只能引用自己在商城买到的商品</div>
        {purchased.length === 0 ? (
          <Empty icon="🛍️" text="还没有购买记录，先去商城逛逛吧" />
        ) : (
          <ProductRefPicker
            items={purchased}
            value={refProductId}
            onChange={(pid) => {
              setRefProductId(pid)
              setPickerOpen(false)
            }}
          />
        )}
      </Sheet>

      <Modal open={confirmDel} onClose={() => setConfirmDel(false)} title="删除这条帖子？">
        <div className="fs-13 text-2" style={{ textAlign: 'center' }}>
          帖子和它的全部回复都会被删除，且无法恢复
        </div>
        <div className="modal__actions">
          <button className="btn btn--ghost" onClick={() => setConfirmDel(false)}>
            取消
          </button>
          <button className="btn btn--primary" onClick={remove}>
            删除
          </button>
        </div>
      </Modal>

      <DiaryQuickAdd
        open={diaryOpen}
        onClose={() => setDiaryOpen(false)}
        defaultContent={diaryDraft}
        source={`论坛摘录 · ${post.topic}`}
      />
    </div>
  )
}
