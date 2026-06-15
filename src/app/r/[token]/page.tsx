import { notFound } from 'next/navigation'

// Página pública — o cliente acessa sem login via /r/[token]
export default async function RelatorioPublicoPage({
  params,
}: {
  params: { token: string }
}) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const res = await fetch(`${baseUrl}/api/relatorios/link?token=${params.token}`, {
    cache: 'no-store',
  })

  if (res.status === 404 || res.status === 410) {
    notFound()
  }

  const data = await res.json()

  if (data.error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-5xl mb-4">⛔</div>
          <h1 className="text-lg font-semibold text-gray-900 mb-2">Link inválido ou expirado</h1>
          <p className="text-sm text-gray-500">{data.error}</p>
        </div>
      </div>
    )
  }

  const { link, totais, diario, contas } = data

  function fmt(v: number | undefined | null, prefix = '', suffix = '', dec = 0): string {
    if (v == null || isNaN(v) || !isFinite(v) || v === 0) return '—'
    return `${prefix}${v.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec })}${suffix}`
  }
  function fmtBRL(v: number | null | undefined, dec = 0) { return fmt(v, 'R$ ', '', dec) }

  // Gera sparkline SVG inline para o gráfico de investimento
  function sparklineSVG(dados: Array<{ data: string; investimento: number }>) {
    if (!dados || dados.length < 2) return null
    const values = dados.map(d => d.investimento)
    const min = Math.min(...values, 0)
    const max = Math.max(...values, 1)
    const rng = max - min || 1
    const W = 600, H = 100, pad = 10
    const pts = (valores: number[]) => valores.map((v: number, i: number) => {
      const x = pad + (i / (valores.length - 1)) * (W - pad * 2)
      const y = H - pad - ((v - min) / rng) * (H - pad * 2)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    const ps = pts(values)
    const pathD = `M ${ps.join(' L ')}`
    const areaD = `M ${ps[0]} L ${ps.join(' L ')} L ${(W - pad).toFixed(1)},${H} L ${pad},${H} Z`
    return { pathD, areaD, W, H }
  }

  const spark = sparklineSVG(diario || [])
  const mesParts = link.mes ? link.mes.split('-') : ['', '']
  const mesLabel = mesParts.length === 2
    ? new Date(Number(mesParts[0]), Number(mesParts[1]) - 1, 1)
        .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    : link.mes

  const metricas = [
    { label: 'Investimento',  valor: fmtBRL(totais?.investimento) },
    { label: 'Impressões',    valor: fmt(totais?.impressoes) },
    { label: 'Cliques',       valor: fmt(totais?.cliques) },
    { label: 'CTR',           valor: fmt(totais?.ctr, '', '%', 2) },
    { label: 'Leads',         valor: fmt(totais?.leads) },
    { label: 'CPL',           valor: fmtBRL(totais?.cpl, 2) },
    { label: 'Conversões',    valor: fmt(totais?.conversoes) },
    { label: 'Alcance',       valor: fmt(totais?.alcance) },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-widest mb-0.5">Relatório de Performance</p>
            <h1 className="text-base font-semibold">{link.titulo}</h1>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Enviado por</p>
            <p className="text-sm font-medium">{link.gestor_nome}</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Período e cliente */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg">
            <p className="text-xs text-slate-400">Cliente</p>
            <p className="text-sm font-medium">{link.cliente_nome}</p>
          </div>
          <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg">
            <p className="text-xs text-slate-400">Período</p>
            <p className="text-sm font-medium capitalize">{mesLabel}</p>
          </div>
          {contas && contas.length > 0 && (
            <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg">
              <p className="text-xs text-slate-400">Contas analisadas</p>
              <p className="text-sm font-medium">{contas.length} conta(s) Meta Ads</p>
            </div>
          )}
        </div>

        {/* Cards de métricas */}
        {totais && totais.investimento > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {metricas.map(m => (
                <div key={m.label} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/8 transition-colors">
                  <p className="text-xs text-slate-400 mb-1">{m.label}</p>
                  <p className="text-xl font-semibold text-white">{m.valor}</p>
                </div>
              ))}
            </div>

            {/* Gráfico de investimento diário */}
            {spark && diario.length > 1 && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                <p className="text-sm font-medium mb-1">Investimento diário</p>
                <p className="text-xs text-slate-400 mb-4">Evolução ao longo do mês</p>
                <svg viewBox={`0 0 ${spark.W} ${spark.H}`} className="w-full" style={{ height: 100 }}>
                  <defs>
                    <linearGradient id="area-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#1D9E75" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#1D9E75" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>
                  <path d={spark.areaD} fill="url(#area-fill)" />
                  <path d={spark.pathD} fill="none" stroke="#1D9E75" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="flex justify-between text-xs text-slate-500 mt-2">
                  <span>{diario[0]?.data?.slice(8)}/{diario[0]?.data?.slice(5, 7)}</span>
                  <span>{diario[diario.length - 1]?.data?.slice(8)}/{diario[diario.length - 1]?.data?.slice(5, 7)}</span>
                </div>
              </div>
            )}

            {/* Destaques */}
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5">
              <p className="text-sm font-semibold text-emerald-400 mb-3">📈 Destaques do período</p>
              <div className="space-y-2 text-sm">
                {totais.leads > 0 && (
                  <p className="text-slate-300">
                    ✅ <strong>{totais.leads.toLocaleString('pt-BR')} leads</strong> gerados com custo médio de <strong>{fmtBRL(totais.cpl, 2)}</strong> por lead.
                  </p>
                )}
                {totais.cliques > 0 && totais.impressoes > 0 && (
                  <p className="text-slate-300">
                    ✅ Taxa de cliques (CTR) de <strong>{fmt(totais.ctr, '', '%', 2)}</strong> — acima da média do setor de 0,9%.
                  </p>
                )}
                {totais.alcance > 0 && (
                  <p className="text-slate-300">
                    ✅ Campanha alcançou <strong>{totais.alcance.toLocaleString('pt-BR')} pessoas</strong> únicas com <strong>{totais.impressoes.toLocaleString('pt-BR')}</strong> impressões.
                  </p>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-slate-400 text-sm">Nenhum dado disponível para este período.</p>
          </div>
        )}

        {/* Rodapé */}
        <footer className="border-t border-white/10 pt-6 text-center">
          <p className="text-xs text-slate-500">
            Relatório gerado por <strong className="text-slate-400">{link.gestor_nome}</strong> via TrafficOS
            {link.expira_em && (
              <> · Link válido até {new Date(link.expira_em).toLocaleDateString('pt-BR')}</>
            )}
          </p>
          {link.gestor_email && (
            <p className="text-xs text-slate-600 mt-1">{link.gestor_email}</p>
          )}
        </footer>
      </main>
    </div>
  )
}
