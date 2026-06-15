'use client'

interface Serie {
  label: string
  color: string
  data: Array<{ data: string; valor: number }>
}

interface MultiLineChartProps {
  series: Serie[]
  height?: number
  formatValue?: (v: number) => string
  showLegend?: boolean
}

// Gráfico SVG de linhas múltiplas — sem dependências externas
export function MultiLineChart({
  series,
  height = 160,
  formatValue,
  showLegend = true,
}: MultiLineChartProps) {
  const fmt = formatValue || ((v: number) => `R$ ${v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`)

  if (!series.length || series.every(s => s.data.length < 2)) {
    return (
      <div className="flex items-center justify-center h-32 text-xs text-gray-400">
        Dados insuficientes para exibir o gráfico
      </div>
    )
  }

  // Unifica todos os labels (datas) em ordem
  const allLabels = Array.from(
    new Set(series.flatMap(s => s.data.map(d => d.data)))
  ).sort()

  const W   = 600
  const H   = height
  const pad = { top: 12, right: 12, bottom: 28, left: 8 }
  const chartW = W - pad.left - pad.right
  const chartH = H - pad.top - pad.bottom

  const allValues = series.flatMap(s => s.data.map(d => d.valor))
  const minVal    = Math.min(...allValues, 0)
  const maxVal    = Math.max(...allValues, 1)
  const range     = maxVal - minVal || 1

  function xPos(label: string): number {
    const idx = allLabels.indexOf(label)
    return pad.left + (idx / Math.max(allLabels.length - 1, 1)) * chartW
  }

  function yPos(val: number): number {
    return pad.top + chartH - ((val - minVal) / range) * chartH
  }

  // Marcadores do eixo Y
  const yTicks = [minVal, minVal + range * 0.25, minVal + range * 0.5, minVal + range * 0.75, maxVal]

  // Marcadores do eixo X (a cada ~7 pontos)
  const step   = Math.max(1, Math.floor(allLabels.length / 7))
  const xTicks = allLabels.filter((_, i) => i % step === 0 || i === allLabels.length - 1)

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height }}
      >
        {/* Grid horizontal */}
        {yTicks.map((v, i) => (
          <line
            key={i}
            x1={pad.left}
            x2={W - pad.right}
            y1={yPos(v)}
            y2={yPos(v)}
            stroke="#f3f4f6"
            strokeWidth="1"
          />
        ))}

        {/* Linhas de cada série */}
        {series.map((serie) => {
          if (serie.data.length < 2) return null

          const sorted = [...serie.data].sort((a, b) => a.data.localeCompare(b.data))
          const pts    = sorted.map(d => `${xPos(d.data).toFixed(1)},${yPos(d.valor).toFixed(1)}`)
          const pathD  = `M ${pts.join(' L ')}`

          // Area
          const areaD = `M ${pts[0]} L ${pts.join(' L ')} L ${xPos(sorted[sorted.length - 1].data).toFixed(1)},${(pad.top + chartH).toFixed(1)} L ${xPos(sorted[0].data).toFixed(1)},${(pad.top + chartH).toFixed(1)} Z`

          const gradId = `grad-${serie.label.replace(/\s/g, '-')}`

          return (
            <g key={serie.label}>
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={serie.color} stopOpacity="0.15" />
                  <stop offset="100%" stopColor={serie.color} stopOpacity="0.01" />
                </linearGradient>
              </defs>
              <path d={areaD} fill={`url(#${gradId})`} />
              <path
                d={pathD}
                fill="none"
                stroke={serie.color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Último ponto destacado */}
              {sorted.length > 0 && (
                <circle
                  cx={xPos(sorted[sorted.length - 1].data)}
                  cy={yPos(sorted[sorted.length - 1].valor)}
                  r="3"
                  fill={serie.color}
                />
              )}
            </g>
          )
        })}

        {/* Labels eixo X */}
        {xTicks.map((label) => (
          <text
            key={label}
            x={xPos(label)}
            y={H - 4}
            textAnchor="middle"
            fontSize="8"
            fill="#9ca3af"
          >
            {label.slice(5)} {/* MM-DD */}
          </text>
        ))}
      </svg>

      {/* Legenda */}
      {showLegend && series.length > 1 && (
        <div className="flex flex-wrap gap-4 mt-2 justify-center">
          {series.map(s => (
            <div key={s.label} className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 rounded-full" style={{ background: s.color }} />
              <span className="text-xs text-gray-500 truncate max-w-24">{s.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Sparkline simples ────────────────────────────────────────────────────────
export function Sparkline({
  data,
  color = '#1D9E75',
  height = 40,
}: {
  data: number[]
  color?: string
  height?: number
}) {
  if (data.length < 2) return null

  const W   = 120
  const H   = height
  const pad = 3
  const min = Math.min(...data, 0)
  const max = Math.max(...data, 1)
  const rng = max - min || 1

  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (W - pad * 2)
    const y = H - pad - ((v - min) / rng) * (H - pad * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const pathD = `M ${pts.join(' L ')}`
  const areaD = `M ${pts[0]} L ${pts.join(' L ')} L ${(W - pad).toFixed(1)},${H} L ${pad},${H} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#spark)" />
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
