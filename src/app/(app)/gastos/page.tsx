'use client'

import { useState, useMemo } from 'react'
import { useGastos, useResumoFinanceiro } from '@/hooks/useGastos'
import { Badge, Button, Card, Metric } from '@/components/ui'
import GastoForm from '@/components/financeiro/GastoForm'
import { BarChart, DonutChart } from '@/components/financeiro/Charts'
import type { Gasto } from '@/types/database'

const CAT_LABEL: Record<string, string> = {
  ferramentas:    'Ferramentas SaaS',
  freelancer:     'Freelancer / Equipe',
  imposto:        'Impostos e taxas',
  infraestrutura: 'Infraestrutura',
  marketing:      'Marketing próprio',
  outros:         'Outros',
}

const CAT_COLORS: Record<string, string> = {
  ferramentas:    '#378ADD',
  freelancer:     '#1D9E75',
  imposto:        '#D85A30',
  infraestrutura: '#7F77DD',
  marketing:      '#BA7517',
  outros:         '#888780',
}

function mesAtualFormatado() {
  return new Date().toISOString().slice(0, 7)
}

export default function GastosPage() {
  const [mesSelecionado, setMesSelecionado] = useState(mesAtualFormatado)
  const [modalAberto, setModalAberto]       = useState(false)
  const [gastoEdit, setGastoEdit]           = useState<Gasto | null>(null)
  const [filtroCategoria, setFiltroCategoria] = useState('')

  const { gastos, loading, criar, atualizar, remover } = useGastos({ mes: mesSelecionado })
  const { resumo } = useResumoFinanceiro(mesSelecionado)

  const meses = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const val   = d.toISOString().slice(0, 7)
      const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
      return { val, label: label.charAt(0).toUpperCase() + label.slice(1) }
    })
  }, [])

  const gastosFiltrados = useMemo(() => {
    if (!filtroCategoria) return gastos
    return gastos.filter(g => g.categoria === filtroCategoria)
  }, [gastos, filtroCategoria])

  const totalGastos = gastosFiltrados.reduce((s, g) => s + g.valor, 0)

  // Dados para o donut de categorias
  const donutData = useMemo(() => {
    const totais: Record<string, number> = {}
    gastos.forEach(g => {
      totais[g.categoria] = (totais[g.categoria] || 0) + g.valor
    })
    return Object.entries(totais)
      .map(([cat, valor]) => ({
        label: CAT_LABEL[cat] || cat,
        value: valor,
        color: CAT_COLORS[cat] || '#888',
      }))
      .sort((a, b) => b.value - a.value)
  }, [gastos])

  // Margem por cliente
  const margemPorCliente = useMemo(() => {
    if (!resumo) return []
    return resumo.faturamento_por_cliente
      .filter(c => c.previsto > 0)
      .map(c => {
        const margem = c.previsto > 0 ? Math.round((c.recebido / c.previsto) * 100) : 0
        return {
          label: c.cliente_nome,
          value: c.recebido,
          color: margem >= 70 ? '#059669' : margem >= 40 ? '#d97706' : '#dc2626',
        }
      })
  }, [resumo])

  async function handleSalvar(dados: Partial<Gasto>) {
    if (gastoEdit) {
      await atualizar(gastoEdit.id, dados)
    } else {
      await criar(dados)
    }
    setModalAberto(false)
    setGastoEdit(null)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-lg font-medium text-gray-900">Gastos & Margens</h1>
          <p className="text-sm text-gray-500 mt-0.5">Custos operacionais e rentabilidade</p>
        </div>
        <div className="flex gap-2">
          <select
            value={mesSelecionado}
            onChange={e => setMesSelecionado(e.target.value)}
            className="text-sm px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none"
          >
            {meses.map(m => (
              <option key={m.val} value={m.val}>{m.label}</option>
            ))}
          </select>
          <Button variant="primary" onClick={() => { setGastoEdit(null); setModalAberto(true) }}>
            + Registrar gasto
          </Button>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Metric
          label="Receita bruta"
          value={`R$ ${(resumo?.recebido || 0).toLocaleString('pt-BR')}`}
          deltaType="up"
        />
        <Metric
          label="Total de gastos"
          value={`R$ ${(resumo?.total_gastos || 0).toLocaleString('pt-BR')}`}
          delta={resumo?.recebido ? `${Math.round(((resumo.total_gastos || 0) / resumo.recebido) * 100)}% da receita` : undefined}
          deltaType="down"
        />
        <Metric
          label="Lucro líquido"
          value={`R$ ${(resumo?.lucro_liquido || 0).toLocaleString('pt-BR')}`}
          deltaType={(resumo?.lucro_liquido || 0) >= 0 ? 'up' : 'down'}
        />
        <Metric
          label="Margem"
          value={`${resumo?.margem || 0}%`}
          delta={(resumo?.margem || 0) >= 60 ? 'Meta atingida ✓' : 'Abaixo da meta'}
          deltaType={(resumo?.margem || 0) >= 60 ? 'up' : 'down'}
        />
      </div>

      {/* Gráficos de análise */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card className="p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">
            Distribuição de gastos
          </p>
          {donutData.length > 0 ? (
            <DonutChart segments={donutData} size={110} />
          ) : (
            <p className="text-sm text-gray-400 text-center py-6">Nenhum gasto no período</p>
          )}
        </Card>

        <Card className="p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">
            Faturamento por cliente
          </p>
          {margemPorCliente.length > 0 ? (
            <BarChart
              data={margemPorCliente}
              formatValue={v => `R$ ${v.toLocaleString('pt-BR')}`}
            />
          ) : (
            <p className="text-sm text-gray-400 text-center py-6">Sem dados no período</p>
          )}
        </Card>
      </div>

      {/* DRE simplificado */}
      {resumo && (
        <Card className="p-4 mb-6">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">
            Resultado do mês
          </p>
          <div className="space-y-2 max-w-md">
            {[
              { label: 'Receita bruta',       valor: resumo.recebido,      color: 'text-emerald-600', sign: '+' },
              { label: 'Gastos operacionais', valor: resumo.total_gastos,  color: 'text-red-500',     sign: '−' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-100">
                <span className="text-gray-600">{item.label}</span>
                <span className={`font-medium ${item.color}`}>
                  {item.sign} R$ {item.valor.toLocaleString('pt-BR')}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between text-sm py-2 pt-3">
              <span className="font-medium text-gray-900">Lucro líquido</span>
              <span className={`text-lg font-medium ${resumo.lucro_liquido >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                R$ {resumo.lucro_liquido.toLocaleString('pt-BR')}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm pt-1">
              <span className="text-gray-500">Margem de lucro</span>
              <div className="flex items-center gap-3">
                <div className="w-32 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(resumo.margem, 100)}%`,
                      background: resumo.margem >= 60 ? '#059669' : resumo.margem >= 30 ? '#d97706' : '#dc2626',
                    }}
                  />
                </div>
                <span className={`font-medium text-sm ${resumo.margem >= 60 ? 'text-emerald-600' : resumo.margem >= 30 ? 'text-amber-600' : 'text-red-600'}`}>
                  {resumo.margem}%
                </span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Tabela de gastos */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2 p-4 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-700">Lançamentos</p>
          <div className="flex gap-1 p-1 bg-gray-100 rounded-lg flex-wrap">
            {['', ...Object.keys(CAT_LABEL)].map(cat => (
              <button
                key={cat}
                onClick={() => setFiltroCategoria(cat)}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors whitespace-nowrap ${filtroCategoria === cat ? 'bg-white text-gray-900 shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {cat === '' ? 'Todos' : CAT_LABEL[cat]}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-3 p-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />)}
          </div>
        ) : gastosFiltrados.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">
            Nenhum gasto registrado no período
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Descrição</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide hidden sm:table-cell">Categoria</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide hidden md:table-cell">Cliente</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Data</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Valor</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide hidden lg:table-cell">Recorrente</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {gastosFiltrados.map(g => (
                <tr key={g.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: CAT_COLORS[g.categoria] || '#888' }}
                      />
                      <span className="font-medium text-gray-900 text-xs">{g.descricao}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <Badge variant="gray">{CAT_LABEL[g.categoria] || g.categoria}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell">
                    {(g as any).clientes?.nome || '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(g.data_gasto + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-red-600">
                      R$ {g.valor.toLocaleString('pt-BR')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs hidden lg:table-cell">
                    {g.recorrente ? <Badge variant="blue">Recorrente</Badge> : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => { setGastoEdit(g); setModalAberto(true) }}>
                        ✎
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { if (confirm('Remover este gasto?')) remover(g.id) }}
                        className="text-red-500 hover:bg-red-50"
                      >
                        ✕
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200 bg-gray-50">
                <td colSpan={3} className="px-4 py-3 text-xs font-medium text-gray-500">
                  {gastosFiltrados.length} lançamento(s)
                </td>
                <td className="px-4 py-3" />
                <td className="px-4 py-3">
                  <span className="font-medium text-red-600 text-sm">
                    R$ {totalGastos.toLocaleString('pt-BR')}
                  </span>
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        )}
      </Card>

      <GastoForm
        open={modalAberto}
        onClose={() => { setModalAberto(false); setGastoEdit(null) }}
        onSave={handleSalvar}
        inicial={gastoEdit || undefined}
      />
    </div>
  )
}
