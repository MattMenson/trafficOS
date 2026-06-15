'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Pagamento } from '@/types/database'

interface UsePagamentosOptions {
  status?: string
  cliente_id?: string
  mes?: string
  ano?: string
}

export function usePagamentos(opts: UsePagamentosOptions = {}) {
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (opts.status)     params.set('status', opts.status)
      if (opts.cliente_id) params.set('cliente_id', opts.cliente_id)
      if (opts.mes)        params.set('mes', opts.mes)
      if (opts.ano)        params.set('ano', opts.ano)

      const res = await window.fetch(`/api/pagamentos?${params}`)
      if (!res.ok) throw new Error('Erro ao buscar pagamentos')
      setPagamentos(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro')
    } finally {
      setLoading(false)
    }
  }, [opts.status, opts.cliente_id, opts.mes, opts.ano])

  useEffect(() => { fetch() }, [fetch])

  const criar = async (dados: Partial<Pagamento>) => {
    const res = await window.fetch('/api/pagamentos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    })
    if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
    const novo = await res.json()
    setPagamentos(prev => [novo, ...prev])
    return novo
  }

  const atualizar = async (id: string, dados: Partial<Pagamento>) => {
    const res = await window.fetch(`/api/pagamentos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    })
    if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
    const updated = await res.json()
    setPagamentos(prev => prev.map(p => p.id === id ? updated : p))
    return updated
  }

  const marcarPago = async (id: string) => {
    return atualizar(id, {
      status: 'pago',
      data_pagamento: new Date().toISOString().split('T')[0],
    })
  }

  const remover = async (id: string) => {
    const res = await window.fetch(`/api/pagamentos/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Erro ao remover')
    setPagamentos(prev => prev.filter(p => p.id !== id))
  }

  return { pagamentos, loading, error, refetch: fetch, criar, atualizar, marcarPago, remover }
}
