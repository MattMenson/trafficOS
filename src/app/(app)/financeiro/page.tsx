'use client'

import { useState, useMemo } from 'react'
import { usePagamentos } from '@/hooks/usePagamentos'
import { useResumoFinanceiro } from '@/hooks/useGastos'
import { Badge, Button, Card, Metric, Avatar } from '@/components/ui'
import PagamentoForm from '@/components/financeiro/PagamentoForm'
import { BarChart, LineSparkline } from '@/components/financeiro/Charts'
import type { Pagamento } from '@/types/database'

const STATUS_BADGE: Record<string, 'green' | 'amber' | 'red' | 'gray'> = {
  pago:      'green',
  pendente:  'amber',
  atrasado:  'red',
  cancelado: 'gray',
}

const STATUS_LABEL: Record<string, string> = {
  pago: 'Pago', pendente: 'Pendente', atrasado: 'Atrasado', cancelado: 'Cancelado',
}

const FORMA_LABEL: Record<string, string> = {
  pix: 'PIX', transferencia: 'Transferência', boleto: 'Boleto', cartao: 'Cartão', dinheiro: 'Dinheiro',
}

function mesAtualFormatado() {
  return new Date().toISOString().slice(0, 7)
}

export default function FinanceiroPage() {
  const [mesSelecionado, setMesSelecionado] = useState(mesAtualFormatado)
  const [modalAberto, setModalAberto]       = useState(false)
  const [pagamentoEdit, setPagamentoEdit]   = useState<Pagamento | null>(null)
  const [filtroStatus, setFiltroStatus]     = useState('')

  const { pagamentos, loading, criar, atualizar, marcarPago, remover } = usePagamentos({ mes: mesSelecionado })
  const { resumo } = useResumoFinanceiro(mesSelecionado)

  // Gera lista dos últimos 6 meses para o seletor
  const meses = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const val   = d.toISOString().slice(0, 7)
      const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
      return { val, label: label.charAt(0).toUpperCase() + label.slice(1) }
    })
  }, [])

  const pagamentosFiltrados = useMemo(() => {
    if (!filtroStatus) return pagamentos
    return pagamentos.filter(p => p.status === filtroStatus)
  }, [pagamentos, filtroStatus])

  async function handleSalvar(dados: Partial<Pagamento>) {
    if (pagamentoEdit) {
      await atualizar(pagamentoEdit.id, dados)
    } else {
      await criar(dados)
    }
    setModalAberto(false)
    setPagamentoEdit(null)
  }

  function abrirEdicao(p: Pagamento) {
    setPagamentoEdit(p)
    setModalAberto(true)
  }

  const sparkData = (resumo?.historico_meses || []).map(m => ({
    label: m.mes,
    value: m.recebido,
  }))

  const barData = (resumo?.faturamento_por_cliente || []).map(c => ({
    label: c.cliente_nome,
    value: c.previsto,
    color: c.recebido >= c.previsto ? '#059669' : c.recebido > 0 ? '#d97706' : '#9ca3af',
  }))

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-lg font-medium text-gray-900">Faturamento</h1>
          <p className="text-sm text-gray-500 mt-0.5">Controle de receitas e pagamentos</p>
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
          <Button variant="primary" onClick={() => { setPagamentoEdit(null); setModalAberto(true) }}>
            + Registrar pagamento
          </Button>
        </div>
      </div>

      {/* Métricas principais */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Metric
          label="MRR (contratos ativos)"
          value={`R$ ${(resumo?.mrr || 0).toLocaleString('pt-BR')}`}
          delta={`${resumo?.clientes_ativos || 0} clientes`}
          deltaType="neutral"
        />
        <Metric
          label="Recebido no mês"
          value={`R$ ${(resumo?.recebido || 0).toLocaleString('pt-BR')}`}
          delta={resumo && resumo.mrr > 0
            ? `${Math.round((resumo.recebido / resumo.mrr) * 100)}% do MRR`
            : undefined}
          deltaType="up"
        />
        <Metric
          label="Pendente"
          value={`R$ ${(resumo?.pendente || 0).toLocaleString('pt-BR')}`}
          deltaType={resumo?.pendente ? 'down' : 'neutral'}
          delta={resumo?.pendente ? 'Aguardando' : 'Em dia'}
        />
        <Metric
          label="Atrasado"
          value={`R$ ${(resumo?.atrasado || 0).toLocaleString('pt-BR')}`}
          deltaType={resumo?.atrasado ? 'down' : 'neutral'}
          delta={resumo?.atrasado ? '⚠️ Atenção' : 'Tudo certo'}
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card className="p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
            Recebimentos — últimos 6 meses
          </p>
          {sparkData.length > 1 ? (
            <>
              <LineSparkline data={sparkData} color="#059669" height={64} />
              <div className="flex justify-between mt-2">
                {sparkData.map(d => (
                  <span key={d.label} className="text-xs text-gray-400">
                    {new Date(d.label + '-15').toLocaleDateString('pt-BR', { month: 'short' })}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-400 text-center py-6">Dados insuficientes</p>
          )}
        </Card>

        <Card className="p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
            Previsão por cliente
          </p>
          {barData.length > 0 ? (
            <BarChart
              data={barData}
              formatValue={v => `R$ ${v.toLocaleString('pt-BR')}`}
            />
          ) : (
            <p className="text-sm text-gray-400 text-center py-6">Sem dados no período</p>
          )}
        </Card>
      </div>

      {/* Tabela de pagamentos */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2 p-4 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-700">Pagamentos do período</p>
          <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
            {['', 'pendente', 'pago', 'atrasado', 'cancelado'].map(s => (
              <button
                key={s}
                onClick={() => setFiltroStatus(s)}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors ${filtroStatus === s ? 'bg-white text-gray-900 shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {s === '' ? 'Todos' : STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-3 p-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />)}
          </div>
        ) : pagamentosFiltrados.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">
            Nenhum pagamento encontrado no período
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Cliente</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide hidden sm:table-cell">Descrição</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Valor</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide hidden md:table-cell">Vencimento</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide hidden md:table-cell">Pagamento</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide hidden lg:table-cell">Forma</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pagamentosFiltrados.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar nome={(p as any).clientes?.nome || '?'} size="sm" />
                      <span className="font-medium text-gray-900 text-xs">
                        {(p as any).clientes?.nome || '—'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell text-xs">{p.descricao}</td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900">
                      R$ {p.valor.toLocaleString('pt-BR')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell">
                    {new Date(p.data_vencimento + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell">
                    {p.data_pagamento
                      ? new Date(p.data_pagamento + 'T12:00:00').toLocaleDateString('pt-BR')
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 hidden lg:table-cell">
                    {p.forma_pagamento ? FORMA_LABEL[p.forma_pagamento] || p.forma_pagamento : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_BADGE[p.status] || 'gray'}>
                      {STATUS_LABEL[p.status] || p.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      {p.status === 'pendente' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => marcarPago(p.id)}
                          className="text-emerald-700 hover:bg-emerald-50 text-xs"
                        >
                          ✓ Pago
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => abrirEdicao(p)}>
                        ✎
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { if (confirm('Remover este pagamento?')) remover(p.id) }}
                        className="text-red-500 hover:bg-red-50"
                      >
                        ✕
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Totais */}
            <tfoot>
              <tr className="border-t border-gray-200 bg-gray-50">
                <td colSpan={2} className="px-4 py-3 text-xs font-medium text-gray-500">
                  {pagamentosFiltrados.length} pagamento(s)
                </td>
                <td className="px-4 py-3">
                  <span className="font-medium text-gray-900 text-sm">
                    R$ {pagamentosFiltrados.reduce((s, p) => s + p.valor, 0).toLocaleString('pt-BR')}
                  </span>
                </td>
                <td colSpan={5} />
              </tr>
            </tfoot>
          </table>
        )}
      </Card>

      <PagamentoForm
        open={modalAberto}
        onClose={() => { setModalAberto(false); setPagamentoEdit(null) }}
        onSave={handleSalvar}
        inicial={pagamentoEdit || undefined}
      />
    </div>
  )
}
