import type { Post } from '../types'
import { ProductRef } from './ProductRef'
import { relativeTime } from './ui'

export function PostCard({
  post,
  commentCount = 0,
  onToggleLike,
  onOpen,
}: {
  post: Post
  commentCount?: number
  onToggleLike?: (post: Post) => void
  onOpen?: (post: Post) => void
}) {
  return (
    <article className="post-card">
      <div
        className="post-card__head"
        onClick={() => onOpen?.(post)}
        style={{ cursor: onOpen ? 'pointer' : 'default' }}
      >
        <img className="avatar" src={post.authorAvatar} alt={post.authorName} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="post-card__author">
            {post.authorName}
            {post.userId === null ? <span className="tag" style={{ marginLeft: 6 }}>官方示例</span> : null}
          </div>
          <div className="post-card__time">
            {relativeTime(post.createdAt)} · {post.topic}
          </div>
        </div>
      </div>

      <div className="post-card__content" onClick={() => onOpen?.(post)}>
        {post.content}
      </div>

      {post.images.length > 0 ? (
        <div className="post-card__images" onClick={() => onOpen?.(post)}>
          {post.images.map((img, i) => (
            <img src={img} alt={`配图 ${i + 1}`} key={i} />
          ))}
        </div>
      ) : null}

      {post.productId ? (
        <div className="mt-8">
          <ProductRef productId={post.productId} />
        </div>
      ) : null}

      <div className="post-card__foot">
        <button
          className={`like${post.liked ? ' like--on' : ''}`}
          onClick={() => onToggleLike?.(post)}
        >
          <span>{post.liked ? '❤️' : '🤍'}</span>
          <span>{post.likes}</span>
        </button>
        <button className="like" onClick={() => onOpen?.(post)}>
          <span>💬</span>
          <span>{commentCount}</span>
        </button>
        <span className="tag">{post.topic}</span>
      </div>
    </article>
  )
}
