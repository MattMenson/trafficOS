'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Cliente } from '@/types/database'

interface UseClientesOptions {
  status?: string
  busca?: string
  segmento?: string
}

export function useClientes(opts: UseClientesOptions = {}) {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (opts.status)   params.set('status', opts.status)
      if (opts.busca)    params.set('busca', opts.busca)
      if (opts.segmento) params.set('segmento', opts.segmento)

      const res = await window.fetch(`/api/clientes?${params}`)
      if (!res.ok) throw new Error('Erro ao buscar clientes')
      const data = await res.json()
      setClientes(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [opts.status, opts.busca, opts.segmento])

  useEffect(() => { fetch() }, [fetch])

  const criar = async (dados: Partial<Cliente>) => {
    const res = await window.fetch('/api/clientes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Erro ao criar cliente')
    }
    const novo = await res.json()
    setClientes(prev => [novo, ...prev])
    return novo
  }

  const atualizar = async (id: string, dados: Partial<Cliente>) => {
    const res = await window.fetch(`/api/clientes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Erro ao atualizar cliente')
    }
    const atualizado = await res.json()
    setClientes(prev => prev.map(c => c.id === id ? atualizado : c))
    return atualizado
  }

  const remover = async (id: string) => {
    const res = await window.fetch(`/api/clientes/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Erro ao remover cliente')
    setClientes(prev => prev.filter(c => c.id !== id))
  }

  return { clientes, loading, error, refetch: fetch, criar, atualizar, remover }
}

// -------------------------------------------------------

export function useCliente(id: string) {
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [loading, setLoading]  = useState(true)
  const [error, setError]      = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await window.fetch(`/api/clientes/${id}`)
      if (!res.ok) throw new Error('Cliente não encontrado')
      const data = await res.json()
      setCliente(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetch() }, [fetch])

  const adicionarAnotacao = async (dados: { titulo?: string; conteudo: string; tipo: string }) => {
    const res = await window.fetch(`/api/clientes/${id}/anotacoes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    })
    if (!res.ok) throw new Error('Erro ao salvar anotação')
    const nova = await res.json()
    setCliente(prev => prev ? {
      ...prev,
      anotacoes: [nova, ...(prev.anotacoes || [])]
    } : prev)
    return nova
  }

  const adicionarContrato = async (dados: object) => {
    const res = await window.fetch(`/api/clientes/${id}/contratos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    })
    if (!res.ok) throw new Error('Erro ao salvar contrato')
    const novo = await res.json()
    setCliente(prev => prev ? {
      ...prev,
      contratos: [novo, ...(prev.contratos || [])]
    } : prev)
    return novo
  }

  return { cliente, loading, error, refetch: fetch, adicionarAnotacao, adicionarContrato }
}
