'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useCliente } from '@/hooks/useClientes'
import { Badge, Avatar, Button, Card } from '@/components/ui'
import ClienteForm from '@/components/clientes/ClienteForm'
import ContratoForm from '@/components/clientes/ContratoForm'
import AnotacaoForm from '@/components/clientes/AnotacaoForm'
import type { Contrato, Anotacao, Entrega } from '@/types/database'

const STATUS_BADGE: Record<string, 'green' | 'amber' | 'red' | 'gray'> = {
  ativo: 'green', pausado: 'amber', encerrado: 'red', prospecto: 'gray',
}

const TIPO_ANOTACAO_ICON: Record<string, string> = {
  nota: '📝', reuniao: '🤝', ligacao: '📞', email: '✉️', insight: '💡', alerta: '⚠️',
}

type Tab = 'visao_geral' | 'contratos' | 'entregas' | 'historico'

export default function ClienteDetalhe({ params }: { params: { id: string } }) {
  const { cliente, loading, error, adicionarAnotacao, adicionarContrato } = useCliente(params.id)
  const [tab, setTab]           = useState<Tab>('visao_geral')
  const [editando, setEditando] = useState(false)
  const [modalContrato, setModalContrato]   = useState(false)
  const [modalAnotacao, setModalAnotacao]   = useState(false)

  if (loading) return (
    <div className="p-6 space-y-4">
      <div className="h-20 bg-gray-100 rounded-xl animate-pulse" />
      <div className="h-48 bg-gray-100 rounded-xl animate-pulse" />
    </div>
  )

  if (error || !cliente) return (
    <div className="p-6 text-center">
      <p className="text-red-500 text-sm">{error || 'Cliente não encontrado'}</p>
      <Link href="/clientes"><Button className="mt-4">← Voltar</Button></Link>
    </div>
  )

  const contratoAtivo = cliente.contratos?.find(c => c.status === 'ativo')
  const totalPago = cliente.pagamentos?.filter(p => p.status === 'pago').reduce((s, p) => s + p.valor, 0) || 0

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
        <Link href="/clientes" className="hover:text-gray-600">Clientes</Link>
        <span>/</span>
        <span className="text-gray-700">{cliente.nome}</span>
      </div>

      {/* Header do cliente */}
      <Card className="p-5 mb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar nome={cliente.nome} size="lg" />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-lg font-medium text-gray-900">{cliente.nome}</h1>
                <Badge variant={STATUS_BADGE[cliente.status] || 'gray'}>
                  {cliente.status}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                {cliente.segmento && <span>🏷️ {cliente.segmento}</span>}
                {cliente.email    && <span>✉️ {cliente.email}</span>}
                {cliente.telefone && <span>📞 {cliente.telefone}</span>}
                {cliente.cnpj_cpf && <span>📄 {cliente.cnpj_cpf}</span>}
              </div>
              {cliente.observacoes && (
                <p className="text-xs text-gray-400 mt-2 max-w-lg">{cliente.observacoes}</p>
              )}
            </div>
          </div>
          <Button size="sm" onClick={() => setEditando(true)}>Editar</Button>
        </div>

        {/* KPIs rápidos */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-gray-100">
          <div className="text-center">
            <p className="text-lg font-medium text-gray-900">
              R$ {contratoAtivo ? contratoAtivo.valor_mensal.toLocaleString('pt-BR') : '—'}
            </p>
            <p className="text-xs text-gray-400">Mensalidade</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-medium text-gray-900">
              R$ {totalPago.toLocaleString('pt-BR')}
            </p>
            <p className="text-xs text-gray-400">Total recebido</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-medium text-gray-900">
              {cliente.meta_ad_accounts?.length || 0}
            </p>
            <p className="text-xs text-gray-400">Contas Meta</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-medium text-gray-900">
              {cliente.anotacoes?.length || 0}
            </p>
            <p className="text-xs text-gray-400">Anotações</p>
          </div>
        </div>
      </Card>

      {/* Abas */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit mb-4">
        {([
          ['visao_geral', 'Visão geral'],
          ['contratos',   'Contratos'],
          ['entregas',    'Entregas'],
          ['historico',   'Histórico'],
        ] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-1.5 text-xs rounded-md transition-colors ${tab === key ? 'bg-white text-gray-900 shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ABA: Visão geral */}
      {tab === 'visao_geral' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Contrato ativo */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Contrato ativo</p>
              <Button size="sm" onClick={() => setModalContrato(true)}>+ Contrato</Button>
            </div>
            {contratoAtivo ? (
              <div className="space-y-2 text-sm">
                <p className="font-medium text-gray-900">{contratoAtivo.descricao}</p>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Valor</span>
                  <span className="font-medium text-gray-900">R$ {contratoAtivo.valor_mensal.toLocaleString('pt-BR')}/mês</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Início</span>
                  <span>{new Date(contratoAtivo.data_inicio).toLocaleDateString('pt-BR')}</span>
                </div>
                {contratoAtivo.data_fim && (
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Vencimento</span>
                    <span>{new Date(contratoAtivo.data_fim).toLocaleDateString('pt-BR')}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Tipo</span>
                  <span className="capitalize">{contratoAtivo.tipo_contrato}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">Nenhum contrato ativo</p>
            )}
          </Card>

          {/* Última anotação */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Última anotação</p>
              <Button size="sm" onClick={() => setModalAnotacao(true)}>+ Anotação</Button>
            </div>
            {cliente.anotacoes && cliente.anotacoes.length > 0 ? (
              <div className="space-y-3">
                {cliente.anotacoes.slice(0, 3).map((a: Anotacao) => (
                  <div key={a.id} className="flex gap-3 text-sm">
                    <span className="text-base flex-shrink-0 mt-0.5">
                      {TIPO_ANOTACAO_ICON[a.tipo] || '📝'}
                    </span>
                    <div>
                      {a.titulo && <p className="font-medium text-gray-900 text-xs">{a.titulo}</p>}
                      <p className="text-gray-600 text-xs leading-relaxed line-clamp-2">{a.conteudo}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(a.created_at).toLocaleDateString('pt-BR', { day:'2-digit', month:'short', year:'numeric' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">Nenhuma anotação ainda</p>
            )}
          </Card>

          {/* Contas Meta vinculadas */}
          <Card className="p-4 md:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Contas Meta Ads vinculadas</p>
              <Link href="/meta">
                <Button size="sm">Gerenciar contas</Button>
              </Link>
            </div>
            {cliente.meta_ad_accounts && cliente.meta_ad_accounts.length > 0 ? (
              <div className="divide-y divide-gray-50">
                {cliente.meta_ad_accounts.map((acc: any) => (
                  <div key={acc.id} className="flex items-center justify-between py-2.5 text-sm">
                    <div>
                      <p className="font-medium text-gray-900">{acc.nome}</p>
                      <p className="text-xs text-gray-400">ID: {acc.account_id} · {acc.moeda}</p>
                    </div>
                    <Badge variant={acc.status === 'ativo' ? 'green' : 'amber'}>{acc.status}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">Nenhuma conta vinculada</p>
            )}
          </Card>
        </div>
      )}

      {/* ABA: Contratos */}
      {tab === 'contratos' && (
        <Card>
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-700">Histórico de contratos</p>
            <Button size="sm" onClick={() => setModalContrato(true)}>+ Novo contrato</Button>
          </div>
          {cliente.contratos && cliente.contratos.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Descrição</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Valor</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Período</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {cliente.contratos.map((c: Contrato) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{c.descricao}</p>
                      <p className="text-xs text-gray-400 capitalize">{c.tipo_contrato}</p>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      R$ {c.valor_mensal.toLocaleString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(c.data_inicio).toLocaleDateString('pt-BR')}
                      {c.data_fim && ` → ${new Date(c.data_fim).toLocaleDateString('pt-BR')}`}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={c.status === 'ativo' ? 'green' : c.status === 'renovando' ? 'amber' : 'gray'}>
                        {c.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">Nenhum contrato cadastrado</p>
          )}
        </Card>
      )}

      {/* ABA: Entregas */}
      {tab === 'entregas' && (
        <Card>
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-700">Entregas</p>
            <Link href="/ideias">
              <Button size="sm">Gerenciar entregas</Button>
            </Link>
          </div>
          {cliente.entregas && cliente.entregas.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Entrega</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Tipo</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Prazo</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {cliente.entregas.map((e: Entrega) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{e.titulo}</p>
                      {e.descricao && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{e.descricao}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 capitalize">{e.tipo || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {e.prazo ? new Date(e.prazo).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={
                        e.status === 'entregue'     ? 'green'  :
                        e.status === 'em_andamento' ? 'blue'   :
                        e.status === 'atrasado'     ? 'red'    : 'gray'
                      }>
                        {e.status.replace('_', ' ')}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">Nenhuma entrega cadastrada</p>
          )}
        </Card>
      )}

      {/* ABA: Histórico de anotações */}
      {tab === 'historico' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" variant="primary" onClick={() => setModalAnotacao(true)}>
              + Nova anotação
            </Button>
          </div>
          {cliente.anotacoes && cliente.anotacoes.length > 0 ? (
            cliente.anotacoes.map((a: Anotacao) => (
              <Card key={a.id} className="p-4">
                <div className="flex gap-3">
                  <span className="text-xl flex-shrink-0">{TIPO_ANOTACAO_ICON[a.tipo] || '📝'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        {a.titulo && <p className="font-medium text-gray-900 text-sm">{a.titulo}</p>}
                        <span className="text-xs text-gray-400 capitalize">{a.tipo}</span>
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {new Date(a.created_at).toLocaleDateString('pt-BR', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mt-2 leading-relaxed whitespace-pre-wrap">{a.conteudo}</p>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <div className="text-center py-12">
              <p className="text-sm text-gray-400">Nenhuma anotação ainda.</p>
              <p className="text-xs text-gray-400 mt-1">Registre reuniões, ligações, insights e decisões aqui.</p>
            </div>
          )}
        </div>
      )}

      {/* Modais */}
      <ClienteForm
        open={editando}
        onClose={() => setEditando(false)}
        onSave={async (dados) => {
          // atualizar via API
          await fetch(`/api/clientes/${params.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados),
          })
          setEditando(false)
          window.location.reload()
        }}
        inicial={cliente}
      />

      <ContratoForm
        open={modalContrato}
        onClose={() => setModalContrato(false)}
        onSave={adicionarContrato}
      />

      <AnotacaoForm
        open={modalAnotacao}
        onClose={() => setModalAnotacao(false)}
        onSave={adicionarAnotacao}
      />
    </div>
  )
}
