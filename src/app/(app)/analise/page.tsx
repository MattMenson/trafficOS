'use client'

import { useState, useMemo } from 'react'
import { useAnalise, useClientes } from '@/hooks/useAnalise'
import { Badge, Button, Card } from '@/components/ui'
import { MultiLineChart } from '@/components/analise/MultiLineChart'

// Paleta de cores para múltiplas contas
const CORES = ['#1D9E75', '#3B82F6', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4', '#EC4899', '#10B981']

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(v: number | undefined | null, prefix = '', suffix = '', decimais = 0): string {
  if (v == null || isNaN(v) || !isFinite(v)) return '—'
  return `${prefix}${v.toLocaleString('pt-BR', { minimumFractionDigits: decimais, maximumFractionDigits: decimais })}${suffix}`
}
function fmtBRL(v: number | undefined | null, decimais = 0): string { return fmt(v, 'R$ ', '', decimais) }

function DeltaBadge({ delta }: { delta: { pct: number; up: boolean } | null | undefined }) {
  if (!delta) return null
  const cor = delta.up ? 'text-emerald-600' : 'text-red-500'
  const seta = delta.up ? '↑' : '↓'
  return (
    <span className={`text-xs font-medium ${cor}`}>
      {seta} {Math.abs(delta.pct)}%
    </span>
  )
}

function mesesDisponiveis() {
  return Array.from({ length: 13 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    return {
      val:   d.toISOString().slice(0, 7),
      label: d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
    }
  })
}

function mesAnteriorDe(mes: string): string {
  const [ano, m] = mes.split('-').map(Number)
  const d = new Date(ano, m - 2)
  return d.toISOString().slice(0, 7)
}

// ─── Card de métrica principal ─────────────────────────────────────────────────
function MetricaCard({
  label, valor, delta, sub,
}: {
  label: string
  valor: string
  delta?: { pct: number; up: boolean } | null
  sub?: string
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-xl font-semibold text-gray-900 mb-1">{valor}</p>
      <div className="flex items-center gap-2">
        {delta && <DeltaBadge delta={delta} />}
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Tabela de contas ─────────────────────────────────────────────────────────
function TabelaContas({ contas }: { contas: any[] }) {
  const [ordenar, setOrdenar] = useState<keyof any>('investimento')
  const [desc,    setDesc]    = useState(true)

  const sorted = [...contas].sort((a, b) => {
    const va = a.totais[ordenar as string] ?? 0
    const vb = b.totais[ordenar as string] ?? 0
    return desc ? vb - va : va - vb
  })

  function toggleSort(col: string) {
    if (ordenar === col) setDesc(!desc)
    else { setOrdenar(col); setDesc(true) }
  }

  const cols = [
    { key: 'nome',        label: 'Conta',          isText: true },
    { key: 'investimento', label: 'Investimento',  fmt: fmtBRL },
    { key: 'impressoes',   label: 'Impressões',    fmt: (v: number) => fmt(v) },
    { key: 'cliques',      label: 'Cliques',       fmt: (v: number) => fmt(v) },
    { key: 'ctr',          label: 'CTR',           fmt: (v: number) => fmt(v, '', '%', 2) },
    { key: 'leads',        label: 'Leads',         fmt: (v: number) => fmt(v) },
    { key: 'cpl',          label: 'CPL',           fmt: fmtBRL },
    { key: 'conversoes',   label: 'Conversões',    fmt: (v: number) => fmt(v) },
    { key: 'cpa',          label: 'CPA',           fmt: fmtBRL },
  ]

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            {cols.map(col => (
              <th
                key={col.key}
                onClick={() => !col.isText && toggleSort(col.key)}
                className={`px-3 py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide whitespace-nowrap
                  ${!col.isText ? 'cursor-pointer hover:text-gray-700 select-none' : ''}`}
              >
                {col.label}
                {ordenar === col.key && !col.isText && (
                  <span className="ml-0.5">{desc ? ' ↓' : ' ↑'}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {sorted.map((conta, i) => (
            <tr key={conta.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-3 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: CORES[i % CORES.length] }} />
                  <div>
                    <p className="text-xs font-medium text-gray-900 truncate max-w-32">{conta.nome}</p>
                    {conta.cliente_nome && (
                      <p className="text-xs text-gray-400 truncate">{conta.cliente_nome}</p>
                    )}
                  </div>
                </div>
              </td>
              {cols.slice(1).map(col => (
                <td key={col.key} className="px-3 py-3 text-xs text-gray-700 whitespace-nowrap">
                  {col.fmt ? col.fmt(conta.totais[col.key]) : conta.totais[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Modal de Link Público ─────────────────────────────────────────────────────
function ModalLink({
  open, onClose, clientes, mes
}: {
  open: boolean
  onClose: () => void
  clientes: Array<{ id: string; nome: string }>
  mes: string
}) {
  const [clienteId, setClienteId] = useState('')
  const [titulo,    setTitulo]    = useState('')
  const [expira,    setExpira]    = useState('30')
  const [gerando,   setGerando]   = useState(false)
  const [linkGerado, setLinkGerado] = useState<string | null>(null)
  const [copiado,   setCopiado]   = useState(false)

  async function gerarLink() {
    if (!clienteId) return
    setGerando(true)
    try {
      const res = await fetch('/api/relatorios/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_id: clienteId,
          mes,
          titulo: titulo || undefined,
          expira_dias: Number(expira),
        }),
      })
      const data = await res.json()
      if (res.ok) setLinkGerado(data.url)
    } finally {
      setGerando(false)
    }
  }

  function copiar() {
    if (!linkGerado) return
    navigator.clipboard.writeText(linkGerado)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  function fechar() {
    setLinkGerado(null)
    setClienteId('')
    setTitulo('')
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={e => e.target === e.currentTarget && fechar()}>
      <div className="w-full max-w-md bg-white rounded-xl shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-medium text-gray-900">🔗 Gerar link para o cliente</h2>
          <button onClick={fechar} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {!linkGerado ? (
            <>
              <p className="text-xs text-gray-500">
                Gera um link público onde seu cliente pode visualizar os resultados do mês <strong>{mes}</strong> sem precisar fazer login.
              </p>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Cliente *</label>
                <select
                  value={clienteId}
                  onChange={e => setClienteId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="">Selecionar cliente</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Título do relatório (opcional)</label>
                <input
                  value={titulo}
                  onChange={e => setTitulo(e.target.value)}
                  placeholder={`Relatório ${mes} — ${clientes.find(c => c.id === clienteId)?.nome || 'Cliente'}`}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Link expira em</label>
                <select
                  value={expira}
                  onChange={e => setExpira(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="7">7 dias</option>
                  <option value="15">15 dias</option>
                  <option value="30">30 dias</option>
                  <option value="60">60 dias</option>
                  <option value="90">90 dias</option>
                </select>
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="ghost" className="flex-1" onClick={fechar}>Cancelar</Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  disabled={!clienteId || gerando}
                  loading={gerando}
                  onClick={gerarLink}
                >
                  Gerar link
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-50 mx-auto mb-2">
                <span className="text-2xl">✅</span>
              </div>
              <p className="text-center text-sm font-medium text-gray-900">Link gerado com sucesso!</p>
              <p className="text-center text-xs text-gray-400">Compartilhe com seu cliente. Ele não precisará fazer login.</p>
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-3 mt-2">
                <p className="text-xs text-gray-600 flex-1 truncate font-mono">{linkGerado}</p>
                <button
                  onClick={copiar}
                  className="text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-100 whitespace-nowrap transition-colors font-medium"
                >
                  {copiado ? '✓ Copiado!' : 'Copiar'}
                </button>
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="ghost" className="flex-1" onClick={fechar}>Fechar</Button>
                <a href={linkGerado} target="_blank" rel="noopener noreferrer" className="flex-1">
                  <Button variant="default" className="w-full">Visualizar →</Button>
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── PÁGINA PRINCIPAL ──────────────────────────────────────────────────────────
export default function AnalisePage() {
  const meses      = useMemo(() => mesesDisponiveis(), [])
  const [mes, setMes]               = useState(meses[0].val)
  const [clienteId, setClienteId]   = useState<string | null>(null)
  const [comparar,  setComparar]    = useState(false)
  const [metricaGrafico, setMetricaGrafico] = useState<'investimento' | 'leads' | 'cliques'>('investimento')
  const [modalLink, setModalLink]   = useState(false)
  const [toast, setToast]           = useState<string | null>(null)

  const mesAnt = comparar ? mesAnteriorDe(mes) : null
  const { data, loading, error } = useAnalise(mes, clienteId, mesAnt)
  const clientes = useClientes()

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  function exportarCSV(tipo: 'metricas' | 'financeiro' | 'completo') {
    const params = new URLSearchParams({ mes, tipo })
    if (clienteId) params.set('cliente_id', clienteId)
    window.open(`/api/exportar?${params}`, '_blank')
    showToast(`📥 Download iniciado — ${tipo}.csv`)
  }

  // Séries do gráfico multi-linha
  const series = useMemo(() => {
    if (!data?.contas || data.contas.length === 0) return []
    return data.contas
      .filter(c => c.dias > 0) // só contas com dados
      .slice(0, 8) // máximo 8 séries no gráfico
      .map((conta, i) => ({
        label: conta.nome,
        color: CORES[i % CORES.length],
        data:  data.diario.map(d => ({ data: d.data, valor: (d as any)[metricaGrafico] || 0 })),
      }))
  }, [data, metricaGrafico])

  // Série consolidada (soma de todas as contas)
  const serieConsolidada = useMemo(() => {
    if (!data?.diario) return []
    return [{
      label: 'Total consolidado',
      color: '#1D9E75',
      data:  data.diario.map(d => ({ data: d.data, valor: (d as any)[metricaGrafico] || 0 })),
    }]
  }, [data, metricaGrafico])

  const { totais, comparativo } = data || {}
  const temDados = (data?.total_contas || 0) > 0

  const labelMetrica: Record<string, string> = {
    investimento: 'Investimento (R$)',
    leads: 'Leads',
    cliques: 'Cliques',
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 bg-gray-900 text-white text-sm font-medium rounded-xl shadow-lg animate-fade-in">
          {toast}
        </div>
      )}

      {/* Modal de link */}
      <ModalLink
        open={modalLink}
        onClose={() => setModalLink(false)}
        clientes={clientes}
        mes={mes}
      />

      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-lg font-medium text-gray-900">Análise Meta Ads</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {data?.total_contas
              ? `${data.total_contas} conta(s) conectada(s) · dados consolidados`
              : 'Análise consolidada de todas as contas de anúncio'}
          </p>
        </div>

        {/* Ações */}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="ghost" onClick={() => exportarCSV('metricas')}>
            ↓ CSV Meta Ads
          </Button>
          <Button size="sm" variant="ghost" onClick={() => exportarCSV('financeiro')}>
            ↓ CSV Financeiro
          </Button>
          <Button size="sm" variant="ghost" onClick={() => exportarCSV('completo')}>
            ↓ CSV Completo
          </Button>
          <Button size="sm" variant="default" onClick={() => setModalLink(true)}>
            🔗 Link para cliente
          </Button>
        </div>
      </div>

      {/* ─── Filtros ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 mb-6 p-4 bg-white border border-gray-100 rounded-xl">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500 whitespace-nowrap">Período</label>
          <select
            value={mes}
            onChange={e => setMes(e.target.value)}
            className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-gray-400"
          >
            {meses.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500 whitespace-nowrap">Cliente</label>
          <select
            value={clienteId || ''}
            onChange={e => setClienteId(e.target.value || null)}
            className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-gray-400"
          >
            <option value="">Todos os clientes</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>

        <label className="flex items-center gap-2 cursor-pointer ml-auto">
          <div
            onClick={() => setComparar(!comparar)}
            className={`w-8 h-4 rounded-full transition-colors cursor-pointer relative ${comparar ? 'bg-gray-900' : 'bg-gray-200'}`}
          >
            <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${comparar ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </div>
          <span className="text-xs text-gray-600">Comparar com mês anterior</span>
        </label>
      </div>

      {/* ─── Erro ──────────────────────────────────────────────────────────── */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 mb-5">
          {error}
        </div>
      )}

      {/* ─── Loading ───────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
          <div className="h-48 bg-gray-100 rounded-xl animate-pulse" />
          <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
        </div>
      ) : !temDados ? (
        /* ─── Estado Vazio ────────────────────────────────────────────────── */
        <div className="text-center py-20 px-4">
          <div className="text-5xl mb-4">📊</div>
          <h2 className="text-base font-medium text-gray-900 mb-2">Nenhuma conta conectada</h2>
          <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6">
            Conecte sua conta do Facebook e vincule as contas de anúncio na página Meta Ads para ver a análise aqui.
          </p>
          <a href="/meta">
            <Button variant="primary">Ir para Meta Ads →</Button>
          </a>
        </div>
      ) : (
        <>
          {/* ─── Cards de métricas ─────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <MetricaCard
              label="Investimento Total"
              valor={fmtBRL(totais?.investimento)}
              delta={comparativo?.investimento_delta}
              sub={comparar && data?.totais_anterior ? `vs ${fmtBRL(data.totais_anterior.investimento)}` : undefined}
            />
            <MetricaCard
              label="Leads Gerados"
              valor={fmt(totais?.leads)}
              delta={comparativo?.leads_delta}
              sub={comparar && data?.totais_anterior ? `vs ${fmt(data.totais_anterior.leads)}` : undefined}
            />
            <MetricaCard
              label="CPL Médio"
              valor={fmtBRL(totais?.cpl, 2)}
              delta={comparativo?.cpl_delta}
              sub="custo por lead"
            />
            <MetricaCard
              label="CTR Médio"
              valor={fmt(totais?.ctr, '', '%', 2)}
              delta={comparativo?.ctr_delta}
              sub="cliques / impressões"
            />
            <MetricaCard
              label="Impressões"
              valor={fmt(totais?.impressoes)}
              sub="total de exibições"
            />
            <MetricaCard
              label="Cliques"
              valor={fmt(totais?.cliques)}
              delta={comparativo?.cliques_delta}
            />
            <MetricaCard
              label="Alcance"
              valor={fmt(totais?.alcance)}
              sub="pessoas únicas"
            />
            <MetricaCard
              label="Conversões"
              valor={fmt(totais?.conversoes)}
              sub={totais?.cpa ? `CPA: ${fmtBRL(totais.cpa, 2)}` : undefined}
            />
          </div>

          {/* ─── Gráfico consolidado ──────────────────────────────────────── */}
          <Card className="p-5 mb-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-gray-900">Evolução diária consolidada</p>
                <p className="text-xs text-gray-400 mt-0.5">Soma de todas as contas por dia</p>
              </div>
              <div className="flex gap-1">
                {(['investimento', 'leads', 'cliques'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setMetricaGrafico(m)}
                    className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors capitalize ${
                      metricaGrafico === m
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {labelMetrica[m]}
                  </button>
                ))}
              </div>
            </div>

            {data?.diario && data.diario.length > 1 ? (
              <MultiLineChart
                series={serieConsolidada}
                height={180}
                showLegend={false}
                formatValue={metricaGrafico === 'investimento'
                  ? v => `R$ ${v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`
                  : v => v.toLocaleString('pt-BR')}
              />
            ) : (
              <div className="flex items-center justify-center h-32 text-xs text-gray-400">
                Sem dados suficientes para o gráfico. Sincronize as contas primeiro.
              </div>
            )}
          </Card>

          {/* ─── Gráfico por conta (se houver mais de 1) ──────────────────── */}
          {data && data.contas.filter(c => c.dias > 0).length > 1 && (
            <Card className="p-5 mb-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">Comparativo entre contas</p>
                  <p className="text-xs text-gray-400 mt-0.5">{labelMetrica[metricaGrafico]} — cada linha é uma conta</p>
                </div>
              </div>
              <MultiLineChart
                series={series}
                height={180}
                showLegend={true}
                formatValue={metricaGrafico === 'investimento'
                  ? v => `R$ ${v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`
                  : v => v.toLocaleString('pt-BR')}
              />
            </Card>
          )}

          {/* ─── Tabela por conta ─────────────────────────────────────────── */}
          <Card className="mb-5">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Performance por conta</p>
                <p className="text-xs text-gray-400 mt-0.5">Clique nas colunas para ordenar</p>
              </div>
              <Badge variant="gray">{data?.contas.length} conta(s)</Badge>
            </div>
            {data?.contas && data.contas.length > 0 ? (
              <TabelaContas contas={data.contas} />
            ) : (
              <div className="py-10 text-center text-xs text-gray-400">
                Nenhuma conta com dados no período. Sincronize na página Meta Ads.
              </div>
            )}
          </Card>

          {/* ─── Rodapé informativo ───────────────────────────────────────── */}
          <div className="p-4 bg-gray-50 rounded-xl text-xs text-gray-500 space-y-1">
            <p className="font-medium text-gray-700">Sobre os dados</p>
            <p>↓ <strong>CSV Meta Ads</strong> — exporta métricas diárias de todas as contas no período.</p>
            <p>↓ <strong>CSV Financeiro</strong> — exporta pagamentos dos clientes no período.</p>
            <p>🔗 <strong>Link para cliente</strong> — gera um link público com validade configurável para o cliente ver os resultados sem login.</p>
            <p>📅 Os dados dependem de sincronização prévia na página <a href="/meta" className="underline">Meta Ads</a>.</p>
          </div>
        </>
      )}
    </div>
  )
}
