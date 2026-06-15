'use client'

import Link from 'next/link'
import { useDashboard } from '@/hooks/useDashboard'
import { Card } from '@/components/ui'
import { MrrChart, RadialGauge } from '@/components/dashboard/MrrChart'
import AlertsPanel from '@/components/dashboard/AlertsPanel'
import ClientePerformanceTable from '@/components/dashboard/ClientePerformanceTable'
import { BarChart } from '@/components/financeiro/Charts'

// -------------------------------------------------------
// Skeleton de loading
// -------------------------------------------------------
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-gray-100 rounded-lg animate-pulse ${className}`} />
}

function DashboardSkeleton() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex justify-between items-center">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-8 w-28" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton className="lg:col-span-2 h-56" />
        <Skeleton className="h-56" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  )
}

// -------------------------------------------------------
// Tipo ícone do anotação
// -------------------------------------------------------
const TIPO_ICON: Record<string, string> = {
  nota: '📝', reuniao: '🤝', ligacao: '📞',
  email: '✉️', insight: '💡', alerta: '⚠️',
}

// -------------------------------------------------------
// PÁGINA PRINCIPAL
// -------------------------------------------------------
export default function DashboardPage() {
  const { data, loading, error, refetch, totalAlertas } = useDashboard()

  const mesLabel = data?.mes
    ? new Date(data.mes + '-15').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    : ''

  if (loading) return <DashboardSkeleton />

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-64 gap-3">
      <p className="text-sm text-red-500">{error}</p>
      <button onClick={refetch} className="text-xs text-gray-500 underline">Tentar novamente</button>
    </div>
  )

  if (!data) return null

  const { clientes, financeiro, meta, alertas, performance_clientes, atividade_recente } = data

  // Formatações
  const fmt  = (v: number) => `R$ ${v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`
  const fmtK = (v: number) => v >= 1000 ? `R$ ${(v / 1000).toFixed(1)}k` : fmt(v)

  const spendBarData = meta.spend_por_conta.map(s => ({
    label: s.cliente_nome,
    value: s.investimento,
    color: '#378ADD',
  }))

  return (
    <div className="p-6 max-w-7xl mx-auto">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-lg font-medium text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5 capitalize">{mesLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          {totalAlertas > 0 && (
            <span className="text-xs bg-red-100 text-red-700 font-medium px-2.5 py-1 rounded-full">
              {totalAlertas} alerta{totalAlertas > 1 ? 's' : ''}
            </span>
          )}
          <button
            onClick={refetch}
            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 px-2 py-1"
          >
            ↻ Atualizar
          </button>
          <span className="text-xs text-gray-300">
            {data.gerado_em ? new Date(data.gerado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
          </span>
        </div>
      </div>

      {/* ── Métricas principais ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          {
            label:  'MRR',
            value:  fmtK(financeiro.mrr),
            delta:  `${clientes.ativos} cliente${clientes.ativos !== 1 ? 's' : ''} ativo${clientes.ativos !== 1 ? 's' : ''}`,
            cor:    '',
          },
          {
            label:  'Recebido no mês',
            value:  fmtK(financeiro.recebido),
            delta:  financeiro.mrr > 0
              ? `${Math.round((financeiro.recebido / financeiro.mrr) * 100)}% do MRR`
              : '—',
            cor:    'text-emerald-600',
          },
          {
            label:  'Lucro líquido',
            value:  fmtK(financeiro.lucro_liquido),
            delta:  `Margem ${financeiro.margem}%`,
            cor:    financeiro.lucro_liquido >= 0 ? 'text-emerald-600' : 'text-red-500',
          },
          {
            label:  'Investido Meta',
            value:  fmtK(meta.investimento),
            delta:  `${meta.contas_conectadas} conta${meta.contas_conectadas !== 1 ? 's' : ''} conectada${meta.contas_conectadas !== 1 ? 's' : ''}`,
            cor:    'text-blue-600',
          },
        ].map(m => (
          <div key={m.label} className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1.5">{m.label}</p>
            <p className={`text-xl font-medium text-gray-900 ${m.cor}`}>{m.value}</p>
            {m.delta && <p className="text-xs text-gray-400 mt-1">{m.delta}</p>}
          </div>
        ))}
      </div>

      {/* ── Linha 2: Gráfico MRR + Gauges + Alertas ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">

        {/* Gráfico MRR */}
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-900">Recebimentos — últimos 6 meses</p>
              <p className="text-xs text-gray-400 mt-0.5">
                vs MRR meta de {fmt(financeiro.mrr)}
              </p>
            </div>
            <Link href="/financeiro">
              <span className="text-xs text-gray-400 hover:text-gray-600">Ver detalhes →</span>
            </Link>
          </div>
          <MrrChart data={financeiro.historico_mrr} height={100} />

          {/* Mini KPIs financeiros */}
          <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-gray-100">
            {[
              { label: 'Pendente',        value: fmtK(financeiro.pendente),   cor: financeiro.pendente > 0 ? '#d97706' : '#6b7280' },
              { label: 'Atrasado',        value: fmtK(financeiro.atrasado),   cor: financeiro.atrasado > 0 ? '#dc2626' : '#6b7280' },
              { label: 'Gastos do mês',   value: fmtK(financeiro.total_gastos), cor: '#6b7280' },
            ].map(k => (
              <div key={k.label}>
                <p className="text-xs text-gray-400">{k.label}</p>
                <p className="text-sm font-medium mt-0.5" style={{ color: k.cor }}>{k.value}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Alertas */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-gray-900">
              Alertas
              {totalAlertas > 0 && (
                <span className="ml-2 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">
                  {totalAlertas}
                </span>
              )}
            </p>
          </div>
          <AlertsPanel
            contratosVencendo={alertas.contratos_vencendo}
            pagamentosAtrasados={alertas.pagamentos_atrasados}
            entregasAtrasadas={alertas.entregas_atrasadas}
            tarefasUrgentes={alertas.tarefas_urgentes}
          />
        </Card>

      </div>

      {/* ── Linha 3: Clientes + Meta + Atividade ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">

        {/* Performance por cliente */}
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-gray-900">Clientes ativos</p>
            <Link href="/clientes">
              <span className="text-xs text-gray-400 hover:text-gray-600">Ver todos →</span>
            </Link>
          </div>
          <ClientePerformanceTable clientes={performance_clientes} />

          {/* Rodapé com totais de clientes */}
          <div className="flex gap-4 pt-3 mt-2 border-t border-gray-100">
            {[
              { label: 'Ativos',     value: clientes.ativos,     cor: 'text-emerald-600' },
              { label: 'Pausados',   value: clientes.pausados,   cor: 'text-amber-600' },
              { label: 'Prospectos', value: clientes.prospectos, cor: 'text-blue-600' },
              { label: 'Novos/mês',  value: clientes.novos_mes,  cor: 'text-gray-600' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className={`text-base font-medium ${s.cor}`}>{s.value}</p>
                <p className="text-xs text-gray-400">{s.label}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Atividade recente */}
        <Card className="p-5">
          <p className="text-sm font-medium text-gray-900 mb-4">Atividade recente</p>
          {atividade_recente.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">Nenhuma atividade registrada</p>
          ) : (
            <div className="space-y-3">
              {atividade_recente.map(a => (
                <div key={a.id} className="flex gap-3">
                  <span className="text-base flex-shrink-0 mt-0.5">
                    {TIPO_ICON[a.tipo] || '📝'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 leading-tight truncate">
                      {a.clientes?.nome || 'Geral'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {a.titulo || a.tipo}
                    </p>
                    <p className="text-xs text-gray-300 mt-0.5">
                      {new Date(a.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit', month: 'short',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Link href="/clientes">
            <span className="text-xs text-gray-400 hover:text-gray-600 mt-4 block text-right">
              Ver histórico →
            </span>
          </Link>
        </Card>

      </div>

      {/* ── Linha 4: Meta Ads + Gauges ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Meta Ads KPIs */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-gray-900">Meta Ads — visão geral</p>
            <Link href="/meta">
              <span className="text-xs text-gray-400 hover:text-gray-600">Gerenciar →</span>
            </Link>
          </div>

          {meta.investimento === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-gray-400">Nenhum dado sincronizado</p>
              <Link href="/meta">
                <span className="text-xs text-blue-500 hover:underline mt-1 block">
                  Sincronizar agora →
                </span>
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: 'Investimento', value: fmtK(meta.investimento) },
                  { label: 'Leads',        value: meta.leads.toLocaleString('pt-BR') },
                  { label: 'CPL médio',    value: meta.cpl > 0 ? `R$ ${meta.cpl.toFixed(2)}` : '—' },
                  { label: 'Impressões',   value: meta.impressoes >= 1000 ? `${(meta.impressoes / 1000).toFixed(0)}k` : meta.impressoes.toString() },
                  { label: 'Cliques',      value: meta.cliques.toLocaleString('pt-BR') },
                  { label: 'CTR médio',    value: `${meta.ctr.toFixed(2)}%` },
                ].map(k => (
                  <div key={k.label} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400">{k.label}</p>
                    <p className="text-sm font-medium text-gray-900 mt-0.5">{k.value}</p>
                  </div>
                ))}
              </div>

              {spendBarData.length > 0 && (
                <>
                  <p className="text-xs text-gray-400 mb-2">Investimento por cliente</p>
                  <BarChart data={spendBarData} formatValue={v => fmtK(v)} />
                </>
              )}
            </>
          )}
        </Card>

        {/* Gauges de saúde do negócio */}
        <Card className="p-5">
          <p className="text-sm font-medium text-gray-900 mb-5">Saúde do negócio</p>
          <div className="grid grid-cols-2 gap-5 mb-5">
            <div className="flex justify-center">
              <RadialGauge
                value={financeiro.margem}
                label="Margem de lucro"
                size={100}
              />
            </div>
            <div className="flex justify-center">
              <RadialGauge
                value={financeiro.mrr > 0 ? Math.round((financeiro.recebido / financeiro.mrr) * 100) : 0}
                label="MRR recebido"
                size={100}
              />
            </div>
            <div className="flex justify-center">
              <RadialGauge
                value={clientes.total > 0 ? Math.round((clientes.ativos / clientes.total) * 100) : 0}
                label="Taxa de retenção"
                size={100}
              />
            </div>
            <div className="flex justify-center">
              <RadialGauge
                value={meta.investimento > 0 && financeiro.recebido > 0
                  ? Math.min(Math.round((meta.investimento / financeiro.recebido) * 100), 100)
                  : 0}
                label="Spend / Receita"
                size={100}
              />
            </div>
          </div>

          {/* Dicas contextuais */}
          <div className="space-y-1.5 pt-3 border-t border-gray-100">
            {financeiro.margem < 50 && (
              <p className="text-xs text-amber-600">
                ⚠️ Margem abaixo de 50% — revise os gastos operacionais
              </p>
            )}
            {financeiro.atrasado > 0 && (
              <p className="text-xs text-red-500">
                🔴 R$ {fmt(financeiro.atrasado)} em pagamentos atrasados — acione os clientes
              </p>
            )}
            {alertas.contratos_vencendo.length > 0 && (
              <p className="text-xs text-amber-600">
                📄 {alertas.contratos_vencendo.length} contrato(s) vencendo nos próximos 15 dias
              </p>
            )}
            {clientes.novos_mes > 0 && (
              <p className="text-xs text-emerald-600">
                🎉 {clientes.novos_mes} novo(s) cliente(s) neste mês
              </p>
            )}
            {financeiro.margem >= 65 && financeiro.atrasado === 0 && (
              <p className="text-xs text-emerald-600">
                ✅ Negócio saudável — margem acima da meta e sem inadimplência
              </p>
            )}
          </div>
        </Card>

      </div>
    </div>
  )
}
