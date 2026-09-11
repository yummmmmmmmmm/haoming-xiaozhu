import { useEffect, useRef, useState } from 'react'
import type { Slide } from '../types'

/** 首页轮播图：3:4 竖版、自动播放、支持左右滑动、点击跳转 */
export function Carousel({
  slides,
  onSelect,
}: {
  slides: Slide[]
  onSelect: (slide: Slide) => void
}) {
  const [index, setIndex] = useState(0)
  const startX = useRef<number | null>(null)
  const count = slides.length

  useEffect(() => {
    if (count <= 1) return
    const timer = window.setInterval(() => {
      setIndex((i) => (i + 1) % count)
    }, 4200)
    return () => window.clearInterval(timer)
  }, [count])

  if (count === 0) return null

  const go = (i: number) => setIndex(((i % count) + count) % count)

  return (
    <div
      className="carousel"
      onTouchStart={(e) => {
        startX.current = e.touches[0].clientX
      }}
      onTouchEnd={(e) => {
        if (startX.current == null) return
        const dx = e.changedTouches[0].clientX - startX.current
        if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1))
        startX.current = null
      }}
    >
      <div className="carousel__track" style={{ transform: `translateX(-${index * 100}%)` }}>
        {slides.map((s) => (
          <div className="carousel__slide" key={s.id} onClick={() => onSelect(s)}>
            <img src={s.image} alt={s.title} />
            <div className="carousel__caption">
              <h3>{s.title}</h3>
              <p>{s.subtitle}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="carousel__dots">
        {slides.map((s, i) => (
          <span
            key={s.id}
            className={`carousel__dot${i === index ? ' carousel__dot--on' : ''}`}
          />
        ))}
      </div>
    </div>
  )
}
