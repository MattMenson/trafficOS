'use client'

interface BarChartProps {
  data: Array<{ label: string; value: number; color?: string }>
  max?: number
  formatValue?: (v: number) => string
}

export function BarChart({ data, max, formatValue }: BarChartProps) {
  const maxVal = max || Math.max(...data.map(d => d.value), 1)
  const fmt = formatValue || ((v: number) => `R$ ${v.toLocaleString('pt-BR')}`)

  return (
    <div className="space-y-2.5">
      {data.map((item, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-28 text-right text-xs text-gray-500 truncate flex-shrink-0">
            {item.label}
          </div>
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.max((item.value / maxVal) * 100, 2)}%`,
                background: item.color || '#111',
              }}
            />
          </div>
          <div className="w-24 text-xs text-gray-600 text-right flex-shrink-0 font-medium">
            {fmt(item.value)}
          </div>
        </div>
      ))}
    </div>
  )
}

// -------------------------------------------------------

interface LineSparkProps {
  data: Array<{ label: string; value: number }>
  color?: string
  height?: number
}

export function LineSparkline({ data, color = '#111', height = 56 }: LineSparkProps) {
  if (data.length < 2) return null

  const values = data.map(d => d.value)
  const min    = Math.min(...values)
  const max    = Math.max(...values, 1)
  const range  = max - min || 1
  const W      = 300
  const H      = height
  const pad    = 4

  const points = data.map((d, i) => {
    const x = pad + (i / (data.length - 1)) * (W - pad * 2)
    const y = H - pad - ((d.value - min) / range) * (H - pad * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  const pathD = `M ${points.join(' L ')}`

  // Area fill
  const areaD = `M ${points[0]} L ${points.join(' L ')} L ${(W - pad).toFixed(1)},${H} L ${pad},${H} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.12" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#spark-fill)" />
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// -------------------------------------------------------

interface DonutProps {
  segments: Array<{ label: string; value: number; color: string }>
  size?: number
}

export function DonutChart({ segments, size = 120 }: DonutProps) {
  const total    = segments.reduce((s, seg) => s + seg.value, 0)
  const radius   = 40
  const cx       = 60
  const cy       = 60
  const stroke   = 14

  let cumulativePercent = 0

  function getArcPath(percent: number, startPercent: number) {
    const start = startPercent * 2 * Math.PI - Math.PI / 2
    const end   = (startPercent + percent) * 2 * Math.PI - Math.PI / 2
    const x1    = cx + radius * Math.cos(start)
    const y1    = cy + radius * Math.sin(start)
    const x2    = cx + radius * Math.cos(end)
    const y2    = cy + radius * Math.sin(end)
    const large = percent > 0.5 ? 1 : 0
    return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${radius} ${radius} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`
  }

  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} viewBox="0 0 120 120">
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#f3f4f6" strokeWidth={stroke} />
        {segments.map((seg, i) => {
          if (seg.value === 0) return null
          const percent = seg.value / (total || 1)
          const path    = getArcPath(percent, cumulativePercent)
          cumulativePercent += percent
          return (
            <path
              key={i}
              d={path}
              fill="none"
              stroke={seg.color}
              strokeWidth={stroke}
              strokeLinecap="round"
            />
          )
        })}
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="11" fontWeight="500" fill="#111">
          {total > 0 ? `R$` : '—'}
        </text>
        <text x={cx} y={cx + 10} textAnchor="middle" fontSize="9" fill="#888">
          {total > 0 ? `${(total / 1000).toFixed(0)}k` : ''}
        </text>
      </svg>
      <div className="space-y-1.5">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: seg.color }} />
            <span className="text-xs text-gray-600">{seg.label}</span>
            <span className="text-xs font-medium text-gray-900 ml-auto pl-3">
              {total > 0 ? `${Math.round((seg.value / total) * 100)}%` : '0%'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
