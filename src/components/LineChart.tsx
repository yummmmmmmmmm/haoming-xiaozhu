/** 轻量 SVG 折线图：用于体重趋势 */
export function LineChart({
  data,
  unit = '',
}: {
  data: { label: string; value: number }[]
  unit?: string
}) {
  const W = 320
  const H = 180
  const padL = 38
  const padR = 12
  const padT = 18
  const padB = 28

  if (data.length === 0) {
    return (
      <div className="empty" style={{ padding: '30px 0' }}>
        <div className="empty__icon">📈</div>
        <div>还没有数据，先记一次吧</div>
      </div>
    )
  }

  const values = data.map((d) => d.value)
  let min = Math.min(...values)
  let max = Math.max(...values)
  if (min === max) {
    min -= 20
    max += 20
  }
  const span = max - min
  const innerW = W - padL - padR
  const innerH = H - padT - padB

  const x = (i: number) =>
    data.length === 1 ? padL + innerW / 2 : padL + (innerW * i) / (data.length - 1)
  const y = (v: number) => padT + innerH - ((v - min) / span) * innerH

  const line = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(d.value)}`).join(' ')
  const area = `${line} L${x(data.length - 1)},${padT + innerH} L${x(0)},${padT + innerH} Z`

  const gridCount = 4
  const gridLines = Array.from({ length: gridCount + 1 }, (_, i) => {
    const v = min + (span * i) / gridCount
    return { v, yy: y(v) }
  })

  // x 轴最多显示 5 个标签
  const step = Math.ceil(data.length / 5)
  const labelIndexes = data.map((_, i) => i).filter((i) => i % step === 0)

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F5B71E" stopOpacity="0.34" />
          <stop offset="100%" stopColor="#F5B71E" stopOpacity="0" />
        </linearGradient>
      </defs>
      {gridLines.map((g, i) => (
        <g key={i}>
          <line x1={padL} y1={g.yy} x2={W - padR} y2={g.yy} stroke="#F4E9D2" strokeWidth="1.4" />
          <text x={padL - 6} y={g.yy + 3} fontSize="9" fill="#B9A794" textAnchor="end">
            {Math.round(g.v)}
          </text>
        </g>
      ))}
      <path d={area} fill="url(#area)" />
      <path d={line} fill="none" stroke="#E8A22B" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => (
        <circle key={i} cx={x(i)} cy={y(d.value)} r="3.8" fill="#fff" stroke="#E8A22B" strokeWidth="2.4" />
      ))}
      {labelIndexes.map((i) => (
        <text key={i} x={x(i)} y={H - 8} fontSize="9" fill="#B9A794" textAnchor="middle">
          {data[i].label}
        </text>
      ))}
      <text x={padL - 6} y={padT - 6} fontSize="9" fill="#B9A794" textAnchor="end">
        {unit}
      </text>
    </svg>
  )
}
