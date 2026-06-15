'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Gasto } from '@/types/database'

interface UseGastosOptions {
  categoria?: string
  cliente_id?: string
  mes?: string
  ano?: string
}

export function useGastos(opts: UseGastosOptions = {}) {
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (opts.categoria)  params.set('categoria', opts.categoria)
      if (opts.cliente_id) params.set('cliente_id', opts.cliente_id)
      if (opts.mes)        params.set('mes', opts.mes)
      if (opts.ano)        params.set('ano', opts.ano)

      const res = await window.fetch(`/api/gastos?${params}`)
      if (!res.ok) throw new Error('Erro ao buscar gastos')
      setGastos(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro')
    } finally {
      setLoading(false)
    }
  }, [opts.categoria, opts.cliente_id, opts.mes, opts.ano])

  useEffect(() => { fetch() }, [fetch])

  const criar = async (dados: Partial<Gasto>) => {
    const res = await window.fetch('/api/gastos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    })
    if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
    const novo = await res.json()
    setGastos(prev => [novo, ...prev])
    return novo
  }

  const atualizar = async (id: string, dados: Partial<Gasto>) => {
    const res = await window.fetch(`/api/gastos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    })
    if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
    const updated = await res.json()
    setGastos(prev => prev.map(g => g.id === id ? updated : g))
    return updated
  }

  const remover = async (id: string) => {
    const res = await window.fetch(`/api/gastos/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Erro ao remover')
    setGastos(prev => prev.filter(g => g.id !== id))
  }

  return { gastos, loading, error, refetch: fetch, criar, atualizar, remover }
}

// -------------------------------------------------------

interface ResumoFinanceiro {
  mes: string
  mrr: number
  recebido: number
  pendente: number
  atrasado: number
  total_gastos: number
  lucro_liquido: number
  margem: number
  clientes_ativos: number
  historico_meses: Array<{ mes: string; recebido: number; previsto: number }>
  gastos_por_categoria: Record<string, number>
  faturamento_por_cliente: Array<{
    cliente_id: string
    cliente_nome: string
    previsto: number
    recebido: number
    status: string
  }>
}

export function useResumoFinanceiro(mes?: string) {
  const [resumo, setResumo]   = useState<ResumoFinanceiro | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const mesAtual = mes || new Date().toISOString().slice(0, 7)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await window.fetch(`/api/financeiro/resumo?mes=${mesAtual}`)
      if (!res.ok) throw new Error('Erro ao buscar resumo')
      setResumo(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro')
    } finally {
      setLoading(false)
    }
  }, [mesAtual])

  useEffect(() => { fetch() }, [fetch])

  return { resumo, loading, error, refetch: fetch }
}
