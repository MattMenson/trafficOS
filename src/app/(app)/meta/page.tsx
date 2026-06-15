'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { useMetaAccounts, useMetaMetricas } from '@/hooks/useMeta'
import { Badge, Button, Card, Avatar } from '@/components/ui'
import { BarChart } from '@/components/financeiro/Charts'

// -------------------------------------------------------
// Ícone do Facebook / Meta
// -------------------------------------------------------
function MetaIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z"/>
    </svg>
  )
}

// -------------------------------------------------------
// Painel de métricas de uma conta selecionada
// -------------------------------------------------------
function PainelMetricas({ accountId, accountNome }: { accountId: string; accountNome: string }) {
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7))
  const { metricas, loading } = useMetaMetricas(accountId, mes)

  const meses = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - i)
    return { val: d.toISOString().slice(0, 7), label: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }) }
  }), [])

  const barDiario = (metricas?.diario || []).map(d => ({
    label: new Date(d.data_referencia + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    value: d.investimento,
    color: '#1D9E75',
  })).slice(-14) // últimos 14 dias

  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-gray-500">{accountNome}</p>
        <select
          value={mes}
          onChange={e => setMes(e.target.value)}
          className="text-xs px-2 py-1 border border-gray-200 rounded-md bg-white"
        >
          {meses.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-4 gap-2">
          {[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />)}
        </div>
      ) : !metricas || metricas.totais.investimento === 0 ? (
        <div className="text-center py-4 text-xs text-gray-400">
          Nenhum dado sincronizado para este período.
          <br />Clique em "Sincronizar" para buscar os dados.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            {[
              { label: 'Investimento',  value: `R$ ${metricas.totais.investimento.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` },
              { label: 'Alcance',       value: metricas.totais.alcance.toLocaleString('pt-BR') },
              { label: 'Leads',         value: metricas.totais.leads.toLocaleString('pt-BR') },
              { label: 'CPL',           value: metricas.totais.cpl > 0 ? `R$ ${metricas.totais.cpl.toFixed(2)}` : '—' },
              { label: 'Cliques',       value: metricas.totais.cliques.toLocaleString('pt-BR') },
              { label: 'CTR',           value: `${metricas.totais.ctr.toFixed(2)}%` },
              { label: 'Conversões',    value: metricas.totais.conversoes.toLocaleString('pt-BR') },
              { label: 'CPA',           value: metricas.totais.cpa > 0 ? `R$ ${metricas.totais.cpa.toFixed(2)}` : '—' },
            ].map(m => (
              <div key={m.label} className="bg-gray-50 rounded-lg p-2.5">
                <p className="text-xs text-gray-400">{m.label}</p>
                <p className="text-sm font-medium text-gray-900 mt-0.5">{m.value}</p>
              </div>
            ))}
          </div>
          {barDiario.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-2">Investimento diário</p>
              <BarChart data={barDiario} formatValue={v => `R$ ${v.toFixed(0)}`} />
            </div>
          )}
        </>
      )}
    </div>
  )
}

// -------------------------------------------------------
// Card de uma conta de anúncio
// -------------------------------------------------------
function AdAccountCard({
  account,
  clientes,
  onVincular,
  onSincronizar,
  expandido,
  onToggle,
}: {
  account: any
  clientes: Array<{ id: string; nome: string }>
  onVincular: (id: string, clienteId: string | null) => Promise<void>
  onSincronizar: (id: string) => Promise<void>
  expandido: boolean
  onToggle: () => void
}) {
  const [vinculando, setVinculando] = useState(false)
  const [sincronizando, setSincronizando] = useState(false)

  async function handleVincular(e: React.ChangeEvent<HTMLSelectElement>) {
    setVinculando(true)
    try {
      await onVincular(account.id, e.target.value || null)
    } finally {
      setVinculando(false)
    }
  }

  async function handleSincronizar() {
    setSincronizando(true)
    try { await onSincronizar(account.id) } finally { setSincronizando(false) }
  }

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 bg-white">
        {/* Status dot */}
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${account.status === 'ativo' ? 'bg-emerald-400' : 'bg-gray-300'}`} />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{account.nome}</p>
          <p className="text-xs text-gray-400">
            {account.account_id} · {account.moeda}
          </p>
        </div>

        {/* Vincular ao cliente */}
        <select
          value={account.cliente_id || ''}
          onChange={handleVincular}
          disabled={vinculando}
          className="text-xs px-2 py-1.5 border border-gray-200 rounded-lg bg-white min-w-32 max-w-40 focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:opacity-50"
        >
          <option value="">Sem cliente</option>
          {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>

        {account.cliente_id && (
          <button
            onClick={onToggle}
            className="text-xs px-2 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
          >
            {expandido ? '▲ Fechar' : '▼ Métricas'}
          </button>
        )}

        <button
          onClick={handleSincronizar}
          disabled={sincronizando}
          className="text-xs px-2 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 disabled:opacity-40 transition-colors"
          title="Sincronizar dados desta conta"
        >
          {sincronizando ? '⟳' : '↻'}
        </button>
      </div>

      {expandido && account.cliente_id && (
        <div className="px-4 pb-4 bg-gray-50">
          <PainelMetricas accountId={account.id} accountNome={account.nome} />
        </div>
      )}
    </div>
  )
}

// -------------------------------------------------------
// PÁGINA PRINCIPAL
// -------------------------------------------------------
export default function MetaPage() {
  const searchParams = useSearchParams()
  const { bms, loading, syncing, lastSync, totalContas, contasVinculadas, sincronizar, vincularCliente, desconectar } = useMetaAccounts()

  const [clientes, setClientes]         = useState<Array<{ id: string; nome: string }>>([])
  const [contaExpandida, setContaExpandida] = useState<string | null>(null)
  const [toast, setToast]               = useState<{ msg: string; tipo: 'ok' | 'erro' } | null>(null)

  // Feedback dos parâmetros de retorno do OAuth
  useEffect(() => {
    const success = searchParams.get('success')
    const error   = searchParams.get('error')

    if (success === 'connected') showToast('Conta Meta conectada com sucesso! 🎉', 'ok')
    if (error === 'permission_denied') showToast('Você recusou as permissões necessárias.', 'erro')
    if (error === 'token_exchange_failed') showToast('Erro ao obter token. Tente novamente.', 'erro')
    if (error) showToast('Erro ao conectar. Tente novamente.', 'erro')
  }, [searchParams])

  useEffect(() => {
    window.fetch('/api/clientes').then(r => r.json()).then(setClientes)
  }, [])

  function showToast(msg: string, tipo: 'ok' | 'erro') {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 5000)
  }

  async function handleSincronizarTudo() {
    const result = await sincronizar()
    if (result.ok) {
      showToast(`Sincronizado! ${result.dias_totais} dias de dados atualizados.`, 'ok')
    } else {
      showToast(`${result.erros} conta(s) com erro ao sincronizar.`, 'erro')
    }
  }

  async function handleDesconectar(bmId: string, bmNome: string) {
    if (!confirm(`Desconectar "${bmNome}"? As métricas salvas serão mantidas.`)) return
    await desconectar(bmId)
    showToast('Business Manager desconectado.', 'ok')
  }

  const tokenExpirando = bms.some(bm => {
    if (!bm.token_expira_em) return false
    const diasRestantes = Math.ceil((new Date(bm.token_expira_em).getTime() - Date.now()) / 86400000)
    return diasRestantes <= 14
  })

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${toast.tipo === 'ok' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {toast.tipo === 'ok' ? '✓' : '✕'} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-lg font-medium text-gray-900">Contas Meta Ads</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {totalContas > 0
              ? `${totalContas} conta(s) conectada(s) · ${contasVinculadas} vinculada(s) a clientes`
              : 'Conecte seu Facebook para importar contas de anúncio'}
          </p>
        </div>
        <div className="flex gap-2">
          {totalContas > 0 && (
            <Button onClick={handleSincronizarTudo} disabled={syncing}>
              {syncing ? '⟳ Sincronizando...' : '↻ Sincronizar tudo'}
            </Button>
          )}
          {/* Botão de conectar — redireciona para OAuth */}
          <a href="/api/meta/oauth">
            <Button variant="primary" className="flex items-center gap-2">
              <MetaIcon size={16} />
              {totalContas > 0 ? 'Adicionar conta' : 'Conectar com Facebook'}
            </Button>
          </a>
        </div>
      </div>

      {/* Alerta de token expirando */}
      {tokenExpirando && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl mb-5 text-sm text-amber-800">
          <span className="text-lg">⚠️</span>
          <div>
            <p className="font-medium">Token expirando em breve</p>
            <p className="text-xs mt-0.5">
              Clique em "Adicionar conta" e logue novamente para renovar automaticamente.
            </p>
          </div>
          <a href="/api/meta/oauth" className="ml-auto">
            <Button size="sm" variant="default">Renovar</Button>
          </a>
        </div>
      )}

      {/* Última sincronização */}
      {lastSync && (
        <div className={`flex items-center gap-2 p-3 rounded-lg mb-4 text-xs ${lastSync.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
          {lastSync.ok ? '✓' : '⚠'} Última sincronização: {lastSync.contas} conta(s), {lastSync.dias_totais} dias de dados
          · {new Date(lastSync.sincronizado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}

      {/* Estado de carregamento */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : bms.length === 0 ? (
        /* Estado vazio — CTA de conexão */
        <div className="text-center py-20 px-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-5 text-white">
            <MetaIcon size={32} />
          </div>
          <h2 className="text-base font-medium text-gray-900 mb-2">
            Conecte sua conta do Facebook
          </h2>
          <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6">
            Ao conectar, suas Business Managers e contas de anúncio são importadas automaticamente. Você escolhe quais vincular a cada cliente.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center text-xs text-gray-400 mb-8">
            {['Dados criptografados', 'Token de 60 dias', 'Sem acesso a dados pessoais', 'Apenas leitura de anúncios'].map(item => (
              <span key={item} className="flex items-center gap-1 justify-center">
                <span className="text-emerald-500">✓</span> {item}
              </span>
            ))}
          </div>
          <a href="/api/meta/oauth">
            <Button variant="primary" className="text-sm px-6 py-2.5 gap-2">
              <MetaIcon size={18} />
              Entrar com Facebook
            </Button>
          </a>
        </div>
      ) : (
        /* Lista de BMs conectados */
        <div className="space-y-5">
          {bms.map(bm => {
            const diasRestantes = bm.token_expira_em
              ? Math.ceil((new Date(bm.token_expira_em).getTime() - Date.now()) / 86400000)
              : null

            return (
              <Card key={bm.id} className="overflow-hidden">
                {/* Header do BM */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white flex-shrink-0">
                    <MetaIcon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">{bm.nome}</p>
                      <Badge variant={bm.status === 'ativo' ? 'green' : 'amber'}>
                        {bm.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      BM ID: {bm.bm_id}
                      {diasRestantes !== null && (
                        <span className={diasRestantes <= 14 ? 'text-amber-600 font-medium ml-2' : 'ml-2'}>
                          · Token expira em {diasRestantes}d
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">
                      {bm.meta_ad_accounts.length} conta(s)
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDesconectar(bm.id, bm.nome)}
                      className="text-red-500 hover:bg-red-50 text-xs"
                    >
                      Desconectar
                    </Button>
                  </div>
                </div>

                {/* Contas de anúncio */}
                <div className="p-4 space-y-2">
                  {bm.meta_ad_accounts.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">
                      Nenhuma conta de anúncio encontrada neste BM
                    </p>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Contas de anúncio
                        </p>
                        <p className="text-xs text-gray-400">
                          Selecione o cliente para vincular cada conta
                        </p>
                      </div>
                      {bm.meta_ad_accounts.map(account => (
                        <AdAccountCard
                          key={account.id}
                          account={account}
                          clientes={clientes}
                          onVincular={vincularCliente}
                          onSincronizar={async () => { await sincronizar(account.id) }}
                          expandido={contaExpandida === account.id}
                          onToggle={() => setContaExpandida(
                            contaExpandida === account.id ? null : account.id
                          )}
                        />
                      ))}
                    </>
                  )}
                </div>
              </Card>
            )
          })}

          {/* Como funciona */}
          <div className="bg-gray-50 rounded-xl p-5 text-xs text-gray-500 space-y-1.5">
            <p className="font-medium text-gray-700 mb-2">Como funciona a sincronização</p>
            <p>↻ <strong>Sincronizar tudo</strong> — busca os dados do mês atual de todas as contas ativas.</p>
            <p>↻ <strong>Botão por conta</strong> — sincroniza só aquela conta, mais rápido.</p>
            <p>📊 <strong>Métricas</strong> — clique em "▼ Métricas" em contas vinculadas a um cliente para ver o painel.</p>
            <p>🔑 <strong>Token</strong> — o acesso dura 60 dias. Reconecte antes do vencimento para renovar automaticamente.</p>
          </div>
        </div>
      )}
    </div>
  )
}
