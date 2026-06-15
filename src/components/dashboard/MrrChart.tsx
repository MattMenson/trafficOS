'use client'

interface MrrChartProps {
  data: Array<{ mes: string; recebido: number; mrr: number }>
  height?: number
}

function mesAbrev(mesStr: string) {
  const d = new Date(mesStr + '-15')
  return d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
}

export function MrrChart({ data, height = 96 }: MrrChartProps) {
  if (!data || data.length < 2) return (
    <div className="flex items-center justify-center h-24 text-xs text-gray-400">
      Dados insuficientes
    </div>
  )

  const W       = 560
  const H       = height
  const padX    = 40
  const padY    = 12
  const innerW  = W - padX * 2
  const innerH  = H - padY * 2

  const maxVal  = Math.max(...data.map(d => Math.max(d.recebido, d.mrr)), 1)

  function pointsFor(key: 'recebido' | 'mrr') {
    return data.map((d, i) => {
      const x = padX + (i / (data.length - 1)) * innerW
      const y = padY + innerH - (d[key] / maxVal) * innerH
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
  }

  const ptRecebido = pointsFor('recebido')
  const ptMrr      = pointsFor('mrr')

  const pathRecebido = `M ${ptRecebido.join(' L ')}`
  const pathMrr      = `M ${ptMrr.join(' L ')}`

  const areaRecebido = `M ${ptRecebido[0]} L ${ptRecebido.join(' L ')} L ${(padX + innerW).toFixed(1)},${padY + innerH} L ${padX},${padY + innerH} Z`

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
        <defs>
          <linearGradient id="mrr-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#059669" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#059669" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Linhas de grade horizontais */}
        {[0.25, 0.5, 0.75, 1].map(f => {
          const y = padY + innerH - f * innerH
          return (
            <line key={f} x1={padX} y1={y} x2={padX + innerW} y2={y}
              stroke="#f3f4f6" strokeWidth="1" />
          )
        })}

        {/* Área recebido */}
        <path d={areaRecebido} fill="url(#mrr-fill)" />

        {/* Linha MRR (pontilhada, meta) */}
        <path d={pathMrr} fill="none" stroke="#d1d5db" strokeWidth="1.5"
          strokeDasharray="5,3" strokeLinecap="round" />

        {/* Linha recebido */}
        <path d={pathRecebido} fill="none" stroke="#059669" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" />

        {/* Pontos */}
        {data.map((d, i) => {
          const x = padX + (i / (data.length - 1)) * innerW
          const y = padY + innerH - (d.recebido / maxVal) * innerH
          return <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r="3"
            fill="#059669" stroke="white" strokeWidth="1.5" />
        })}

        {/* Labels dos meses */}
        {data.map((d, i) => {
          const x = padX + (i / (data.length - 1)) * innerW
          return (
            <text key={i} x={x.toFixed(1)} y={H - 1} textAnchor="middle"
              fontSize="10" fill="#9ca3af">
              {mesAbrev(d.mes)}
            </text>
          )
        })}
      </svg>

      {/* Legenda */}
      <div className="flex gap-4 mt-2 justify-end">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 bg-emerald-500 rounded" />
          <span className="text-xs text-gray-500">Recebido</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 border-t border-dashed border-gray-300" />
          <span className="text-xs text-gray-500">MRR meta</span>
        </div>
      </div>
    </div>
  )
}

// -------------------------------------------------------

interface RadialGaugeProps {
  value: number  // 0-100
  label: string
  size?: number
}

export function RadialGauge({ value, label, size = 80 }: RadialGaugeProps) {
  const r      = 28
  const cx     = size / 2
  const cy     = size / 2
  const circum = 2 * Math.PI * r
  const arc    = (Math.min(value, 100) / 100) * circum * 0.75
  const offset = circum * 0.125

  const color = value >= 65 ? '#059669' : value >= 35 ? '#d97706' : '#dc2626'

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none"
          stroke="#f3f4f6" strokeWidth="6"
          strokeDasharray={`${circum * 0.75} ${circum * 0.25}`}
          strokeDashoffset={-offset}
          strokeLinecap="round"
          transform={`rotate(135 ${cx} ${cy})`} />
        <circle cx={cx} cy={cy} r={r} fill="none"
          stroke={color} strokeWidth="6"
          strokeDasharray={`${arc} ${circum}`}
          strokeDashoffset={-offset}
          strokeLinecap="round"
          transform={`rotate(135 ${cx} ${cy})`} />
        <text x={cx} y={cy + 4} textAnchor="middle"
          fontSize="13" fontWeight="500" fill="#111">
          {Math.round(value)}%
        </text>
      </svg>
      <span className="text-xs text-gray-500 text-center leading-tight">{label}</span>
    </div>
  )
}
