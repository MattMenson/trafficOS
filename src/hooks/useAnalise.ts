'use client'

import { useState, useEffect, useCallback } from 'react'

interface ContaAnalise {
  id: string
  account_id: string
  nome: string
  moeda: string
  status: string
  cliente_id: string | null
  cliente_nome: string | null
  totais: {
    investimento: number
    impressoes: number
    alcance: number
    cliques: number
    conversoes: number
    leads: number
    ctr: number
    cpl: number
    cpa: number
    roas: number
  }
  dias: number
}

interface DadosDiarios {
  data: string
  investimento: number
  leads: number
  cliques: number
  impressoes: number
  conversoes: number
}

interface DeltaInfo {
  pct: number
  up: boolean
}

interface AnaliseData {
  mes: string
  mes_anterior: string | null
  contas: ContaAnalise[]
  totais: ContaAnalise['totais'] | null
  totais_anterior: ContaAnalise['totais'] | null
  comparativo: {
    investimento_delta: DeltaInfo | null
    leads_delta: DeltaInfo | null
    cliques_delta: DeltaInfo | null
    cpl_delta: DeltaInfo | null
    ctr_delta: DeltaInfo | null
  } | null
  diario: DadosDiarios[]
  total_contas: number
}

export function useAnalise(mes: string, clienteId?: string | null, mesAnterior?: string | null) {
  const [data, setData]     = useState<AnaliseData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ mes })
      if (clienteId)   params.set('cliente_id', clienteId)
      if (mesAnterior) params.set('mes_anterior', mesAnterior)

      const res = await window.fetch(`/api/analise?${params}`)
      if (!res.ok) throw new Error('Erro ao buscar dados de análise')
      setData(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [mes, clienteId, mesAnterior])

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, error, refetch: fetch }
}

export function useClientes() {
  const [clientes, setClientes] = useState<Array<{ id: string; nome: string }>>([])

  useEffect(() => {
    window.fetch('/api/clientes')
      .then(r => r.json())
      .then(setClientes)
      .catch(() => {})
  }, [])

  return clientes
}
