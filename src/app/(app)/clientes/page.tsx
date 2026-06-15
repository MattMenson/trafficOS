'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useClientes } from '@/hooks/useClientes'
import { Badge, Avatar, Button, Metric, EmptyState } from '@/components/ui'
import ClienteForm from '@/components/clientes/ClienteForm'
import type { Cliente } from '@/types/database'

const STATUS_BADGE: Record<string, 'green' | 'amber' | 'red' | 'gray'> = {
  ativo:     'green',
  pausado:   'amber',
  encerrado: 'red',
  prospecto: 'gray',
}

const STATUS_LABEL: Record<string, string> = {
  ativo: 'Ativo', pausado: 'Pausado', encerrado: 'Encerrado', prospecto: 'Prospecto',
}

function contratoAtivo(cliente: Cliente) {
  return cliente.contratos?.find(c => c.status === 'ativo')
}

function mrr(cliente: Cliente) {
  const c = contratoAtivo(cliente)
  return c ? c.valor_mensal : 0
}

export default function ClientesPage() {
  const [modalAberto, setModalAberto]   = useState(false)
  const [busca, setBusca]               = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')

  const { clientes, loading, error, criar } = useClientes()

  // Métricas do topo
  const metricas = useMemo(() => {
    const ativos    = clientes.filter(c => c.status === 'ativo')
    const pausados  = clientes.filter(c => c.status === 'pausado')
    const prospectos = clientes.filter(c => c.status === 'prospecto')
    const mrrTotal  = ativos.reduce((acc, c) => acc + mrr(c), 0)
    return { ativos: ativos.length, pausados: pausados.length, prospectos: prospectos.length, mrrTotal }
  }, [clientes])

  // Filtro local
  const clientesFiltrados = useMemo(() => {
    return clientes.filter(c => {
      const matchBusca  = !busca || c.nome.toLowerCase().includes(busca.toLowerCase()) || c.email?.toLowerCase().includes(busca.toLowerCase())
      const matchStatus = !filtroStatus || c.status === filtroStatus
      return matchBusca && matchStatus
    })
  }, [clientes, busca, filtroStatus])

  async function handleCriar(dados: Partial<Cliente>) {
    await criar(dados)
    setModalAberto(false)
  }

  // Verifica contratos próximos do vencimento (< 15 dias)
  function diasParaVencer(cliente: Cliente) {
    const c = contratoAtivo(cliente)
    if (!c?.data_fim) return null
    const diff = Math.ceil((new Date(c.data_fim).getTime() - Date.now()) / 86400000)
    return diff <= 15 ? diff : null
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-medium text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500 mt-0.5">{clientes.length} clientes cadastrados</p>
        </div>
        <Button variant="primary" onClick={() => setModalAberto(true)}>
          + Novo cliente
        </Button>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Metric label="MRR ativo" value={`R$ ${metricas.mrrTotal.toLocaleString('pt-BR')}`} />
        <Metric label="Clientes ativos" value={String(metricas.ativos)} deltaType="up" delta="gerando receita" />
        <Metric label="Pausados" value={String(metricas.pausados)} deltaType={metricas.pausados > 0 ? 'down' : 'neutral'} />
        <Metric label="Prospectos" value={String(metricas.prospectos)} deltaType="neutral" delta="pipeline" />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="text"
          placeholder="Buscar por nome ou e-mail..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="flex-1 min-w-48 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
          {['', 'ativo', 'pausado', 'prospecto', 'encerrado'].map(s => (
            <button
              key={s}
              onClick={() => setFiltroStatus(s)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${filtroStatus === s ? 'bg-white text-gray-900 shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {s === '' ? 'Todos' : STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12 text-red-500 text-sm">{error}</div>
      ) : clientesFiltrados.length === 0 ? (
        <EmptyState
          icon={<svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
          title="Nenhum cliente encontrado"
          description={busca || filtroStatus ? 'Tente ajustar os filtros de busca.' : 'Adicione seu primeiro cliente para começar.'}
          action={
            !busca && !filtroStatus
              ? <Button variant="primary" onClick={() => setModalAberto(true)}>Adicionar cliente</Button>
              : undefined
          }
        />
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Cliente</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide hidden sm:table-cell">Segmento</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Mensalidade</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide hidden md:table-cell">Contrato</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {clientesFiltrados.map(cliente => {
                const dias = diasParaVencer(cliente)
                const valorMensal = mrr(cliente)

                return (
                  <tr key={cliente.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar nome={cliente.nome} size="sm" />
                        <div>
                          <p className="font-medium text-gray-900 leading-tight">{cliente.nome}</p>
                          {cliente.email && (
                            <p className="text-xs text-gray-400 mt-0.5">{cliente.email}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                      {cliente.segmento || '—'}
                    </td>
                    <td className="px-4 py-3">
                      {valorMensal > 0
                        ? <span className="font-medium text-gray-900">R$ {valorMensal.toLocaleString('pt-BR')}</span>
                        : <span className="text-gray-400">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {dias !== null ? (
                        <span className="text-amber-600 text-xs font-medium">⚠️ Vence em {dias}d</span>
                      ) : (
                        <span className="text-gray-400 text-xs">
                          {contratoAtivo(cliente) ? 'Ativo' : 'Sem contrato'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_BADGE[cliente.status] || 'gray'}>
                        {STATUS_LABEL[cliente.status] || cliente.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/clientes/${cliente.id}`}>
                        <Button size="sm">Ver →</Button>
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de criação */}
      <ClienteForm
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        onSave={handleCriar}
      />
    </div>
  )
}
