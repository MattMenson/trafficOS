'use client'

import { useState, useEffect, useCallback } from 'react'

interface AlertaContrato {
  cliente_id: string
  cliente_nome: string
  data_fim: string
  dias_restantes: number
  valor_mensal: number
}

interface AlertaPagamento {
  cliente_nome: string
  valor: number
  data_vencimento: string
  dias_atraso: number
}

interface DashboardData {
  gerado_em: string
  mes: string

  clientes: {
    total: number
    ativos: number
    pausados: number
    prospectos: number
    novos_mes: number
  }

  financeiro: {
    mrr: number
    recebido: number
    pendente: number
    atrasado: number
    total_gastos: number
    lucro_liquido: number
    margem: number
    historico_mrr: Array<{ mes: string; recebido: number; mrr: number }>
  }

  meta: {
    contas_conectadas: number
    investimento: number
    impressoes: number
    cliques: number
    leads: number
    conversoes: number
    ctr: number
    cpl: number
    spend_por_conta: Array<{
      account_id: string
      account_nome: string
      cliente_nome: string
      investimento: number
    }>
  }

  alertas: {
    contratos_vencendo: AlertaContrato[]
    pagamentos_atrasados: AlertaPagamento[]
    entregas_atrasadas: Array<{ id: string; titulo: string; prazo: string; clientes: { nome: string } }>
    tarefas_urgentes: Array<{ id: string; titulo: string; prazo: string | null; prioridade: string; clientes?: { nome: string } }>
  }

  performance_clientes: Array<{
    cliente_id: string
    cliente_nome: string
    mensalidade: number
    recebido_mes: number
    investimento_meta: number
  }>

  atividade_recente: Array<{
    id: string
    titulo: string | null
    tipo: string
    created_at: string
    clientes: { nome: string } | null
  }>
}

export function useDashboard() {
  const [data, setData]       = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await window.fetch('/api/dashboard')
      if (!res.ok) throw new Error('Erro ao carregar dashboard')
      setData(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch()
    // Atualiza automaticamente a cada 5 minutos
    const interval = setInterval(fetch, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetch])

  const totalAlertas =
    (data?.alertas.contratos_vencendo.length || 0) +
    (data?.alertas.pagamentos_atrasados.length || 0) +
    (data?.alertas.entregas_atrasadas.length || 0) +
    (data?.alertas.tarefas_urgentes.length || 0)

  return { data, loading, error, refetch: fetch, totalAlertas }
}
