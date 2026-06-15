'use client'

import { useState, useEffect } from 'react'
import { Modal, Button, Select } from '@/components/ui'

interface Props {
  open: boolean
  onClose: () => void
  onGerar: (clienteId: string, inicio: string, fim: string) => Promise<void>
  clienteInicial?: string
}

export default function RelatorioForm({ open, onClose, onGerar, clienteInicial }: Props) {
  const [clientes, setClientes] = useState<Array<{ id: string; nome: string }>>([])
  const [clienteId, setClienteId] = useState(clienteInicial || '')
  const [inicio, setInicio]       = useState('')
  const [fim, setFim]             = useState('')
  const [loading, setLoading]     = useState(false)
  const [erro, setErro]           = useState('')

  // Pré-preenche com o mês atual
  useEffect(() => {
    const hoje  = new Date()
    const ano   = hoje.getFullYear()
    const mes   = String(hoje.getMonth() + 1).padStart(2, '0')
    const ultimo = new Date(ano, hoje.getMonth() + 1, 0).getDate()
    setInicio(`${ano}-${mes}-01`)
    setFim(`${ano}-${mes}-${ultimo}`)
  }, [])

  useEffect(() => {
    window.fetch('/api/clientes?status=ativo')
      .then(r => r.json())
      .then(setClientes)
  }, [])

  // Atalhos de período
  function aplicarPeriodo(tipo: 'mes_atual' | 'mes_anterior' | 'trimestre') {
    const hoje = new Date()
    const ano  = hoje.getFullYear()
    const mes  = hoje.getMonth()

    if (tipo === 'mes_atual') {
      const m = String(mes + 1).padStart(2, '0')
      const ultimo = new Date(ano, mes + 1, 0).getDate()
      setInicio(`${ano}-${m}-01`)
      setFim(`${ano}-${m}-${ultimo}`)
    } else if (tipo === 'mes_anterior') {
      const d  = new Date(ano, mes, 0)
      const ma = String(d.getMonth() + 1).padStart(2, '0')
      const ya = d.getFullYear()
      setInicio(`${ya}-${ma}-01`)
      setFim(`${ya}-${ma}-${d.getDate()}`)
    } else if (tipo === 'trimestre') {
      const tri   = Math.floor(mes / 3)
      const mIni  = tri * 3
      const mFim  = mIni + 2
      const ultd  = new Date(ano, mFim + 1, 0).getDate()
      setInicio(`${ano}-${String(mIni + 1).padStart(2, '0')}-01`)
      setFim(`${ano}-${String(mFim + 1).padStart(2, '0')}-${ultd}`)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clienteId) { setErro('Selecione um cliente'); return }
    if (!inicio || !fim) { setErro('Informe o período'); return }
    if (inicio > fim) { setErro('Data de início deve ser anterior ao fim'); return }

    setErro('')
    setLoading(true)
    try {
      await onGerar(clienteId, inicio, fim)
      onClose()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao gerar relatório')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Gerar relatório" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Cliente *"
          value={clienteId}
          onChange={e => setClienteId(e.target.value)}
        >
          <option value="">Selecionar cliente...</option>
          {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </Select>

        {/* Atalhos de período */}
        <div>
          <p className="text-xs font-medium text-gray-600 mb-2">Período</p>
          <div className="flex gap-2 mb-3">
            {[
              { label: 'Mês atual',      tipo: 'mes_atual' as const },
              { label: 'Mês anterior',   tipo: 'mes_anterior' as const },
              { label: 'Trimestre',      tipo: 'trimestre' as const },
            ].map(a => (
              <button
                key={a.tipo}
                type="button"
                onClick={() => aplicarPeriodo(a.tipo)}
                className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
              >
                {a.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">Início</label>
              <input
                type="date"
                value={inicio}
                onChange={e => setInicio(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">Fim</label>
              <input
                type="date"
                value={fim}
                onChange={e => setFim(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
          </div>
        </div>

        {erro && (
          <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{erro}</p>
        )}

        <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 space-y-1">
          <p className="font-medium text-gray-700">O relatório incluirá:</p>
          <p>• Resumo financeiro (faturado, recebido, pendente)</p>
          <p>• Métricas Meta Ads (investimento, leads, CPL, CTR, CPM)</p>
          <p>• Gráfico de investimento diário</p>
          <p>• Entregas e estratégias implementadas no período</p>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="primary" loading={loading}>
            📄 Gerar PDF
          </Button>
        </div>
      </form>
    </Modal>
  )
}
