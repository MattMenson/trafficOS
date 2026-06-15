'use client'

import { useState } from 'react'
import { useRelatorios } from '@/hooks/useRelatorios'
import { Badge, Button, Card, Avatar } from '@/components/ui'
import RelatorioForm from '@/components/relatorios/RelatorioForm'

function formatPeriodo(inicio: string, fim: string) {
  const i = new Date(inicio + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  const f = new Date(fim    + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
  return `${i} – ${f}`
}

export default function RelatoriosPage() {
  const { relatorios, loading, gerando, gerar, marcarEnviado, baixarNovamente } = useRelatorios()
  const [modalAberto, setModalAberto] = useState(false)
  const [toast, setToast]             = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  async function handleGerar(clienteId: string, inicio: string, fim: string) {
    try {
      await gerar(clienteId, inicio, fim)
      setModalAberto(false)
      showToast('✅ PDF gerado e salvo com sucesso!')
    } catch (e) {
      showToast(`⛔ ${e instanceof Error ? e.message : 'Erro ao gerar relatório'}`)
    }
  }

  async function handleMarcarEnviado(id: string) {
    await marcarEnviado(id)
    showToast('📧 Relatório marcado como enviado')
  }

  async function handleBaixarNovamente(rel: Parameters<typeof baixarNovamente>[0]) {
    try {
      await baixarNovamente(rel)
    } catch (e) {
      showToast(`⛔ ${e instanceof Error ? e.message : 'Erro ao gerar PDF'}`)
    }
  }

  // Agrupa por cliente
  const porCliente: Record<string, typeof relatorios> = {}
  relatorios.forEach(r => {
    const nome = r.clientes?.nome || 'Sem cliente'
    if (!porCliente[nome]) porCliente[nome] = []
    porCliente[nome].push(r)
  })

  return (
    <div className="p-6 max-w-5xl mx-auto">

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-medium text-gray-900">Relatórios</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {relatorios.length > 0
              ? `${relatorios.length} relatório(s) gerado(s)`
              : 'Gere relatórios profissionais em PDF para seus clientes'}
          </p>
        </div>
        <Button variant="primary" onClick={() => setModalAberto(true)} disabled={gerando}>
          {gerando ? '⟳ Gerando PDF...' : '+ Novo relatório'}
        </Button>
      </div>

      {/* Estado de geração */}
      {gerando && (
        <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl mb-5">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-800">Gerando relatório...</p>
            <p className="text-xs text-blue-600 mt-0.5">Buscando dados e montando o PDF. Aguarde um momento.</p>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : relatorios.length === 0 ? (
        /* Empty state */
        <div className="text-center py-20 px-4">
          <div className="text-5xl mb-4">📄</div>
          <h2 className="text-base font-medium text-gray-900 mb-2">Nenhum relatório gerado ainda</h2>
          <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6">
            Gere relatórios profissionais em PDF com métricas do Meta Ads, resumo financeiro e entregas do período.
          </p>
          <Button variant="primary" onClick={() => setModalAberto(true)}>
            Gerar primeiro relatório
          </Button>

          {/* Preview das seções */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-10 max-w-lg mx-auto">
            {[
              { icon: '💰', label: 'Financeiro', desc: 'Faturado e recebido' },
              { icon: '📊', label: 'Meta Ads', desc: 'Investimento e leads' },
              { icon: '📦', label: 'Entregas', desc: 'O que foi entregue' },
              { icon: '💡', label: 'Estratégias', desc: 'O que foi implementado' },
            ].map(item => (
              <div key={item.label} className="bg-gray-50 rounded-xl p-3 text-left">
                <span className="text-xl">{item.icon}</span>
                <p className="text-xs font-medium text-gray-800 mt-1">{item.label}</p>
                <p className="text-xs text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Lista agrupada por cliente */
        <div className="space-y-5">
          {Object.entries(porCliente).map(([clienteNome, rels]) => (
            <div key={clienteNome}>
              {/* Header do cliente */}
              <div className="flex items-center gap-2 mb-2">
                <Avatar nome={clienteNome} size="sm" />
                <p className="text-sm font-medium text-gray-900">{clienteNome}</p>
                <span className="text-xs text-gray-400">{rels.length} relatório(s)</span>
              </div>

              <Card>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-50">
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Período</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide hidden sm:table-cell">Título</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Gerado em</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Status</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {rels.map(r => (
                      <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-xs font-medium text-gray-900">
                            {formatPeriodo(r.periodo_inicio, r.periodo_fim)}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 hidden sm:table-cell">
                          {r.titulo}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {new Date(r.created_at).toLocaleDateString('pt-BR', {
                            day: '2-digit', month: 'short', year: 'numeric'
                          })}
                        </td>
                        <td className="px-4 py-3">
                          {r.enviado_em ? (
                            <Badge variant="green">
                              Enviado {new Date(r.enviado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                            </Badge>
                          ) : (
                            <Badge variant="gray">Não enviado</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleBaixarNovamente(r)}
                              disabled={gerando}
                              title="Baixar PDF"
                            >
                              ↓ PDF
                            </Button>
                            {!r.enviado_em && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleMarcarEnviado(r.id)}
                                className="text-emerald-600 hover:bg-emerald-50"
                                title="Marcar como enviado"
                              >
                                ✓ Enviado
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* Info rodapé */}
      {relatorios.length > 0 && (
        <div className="mt-6 p-4 bg-gray-50 rounded-xl text-xs text-gray-500 space-y-1">
          <p className="font-medium text-gray-700">Sobre os relatórios</p>
          <p>↓ <strong>Baixar PDF</strong> — re-gera o relatório com os dados atuais do período e faz o download.</p>
          <p>✓ <strong>Marcar como enviado</strong> — registra que o relatório foi entregue ao cliente.</p>
          <p>📅 Os dados de Meta Ads dependem de sincronização prévia na página de contas.</p>
        </div>
      )}

      <RelatorioForm
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        onGerar={handleGerar}
      />
    </div>
  )
}
