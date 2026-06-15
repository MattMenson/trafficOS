'use client'

import { useState, useEffect, useCallback } from 'react'

interface Relatorio {
  id: string
  titulo: string
  periodo_inicio: string
  periodo_fim: string
  enviado_em: string | null
  created_at: string
  clientes: { id: string; nome: string } | null
}

export function useRelatorios(clienteId?: string) {
  const [relatorios, setRelatorios] = useState<Relatorio[]>([])
  const [loading, setLoading]       = useState(true)
  const [gerando, setGerando]       = useState(false)
  const [error, setError]           = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = clienteId ? `?cliente_id=${clienteId}` : ''
      const res    = await window.fetch(`/api/relatorios${params}`)
      if (!res.ok) throw new Error('Erro ao buscar relatórios')
      setRelatorios(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro')
    } finally {
      setLoading(false)
    }
  }, [clienteId])

  useEffect(() => { fetch() }, [fetch])

  const gerar = async (cId: string, inicio: string, fim: string) => {
    setGerando(true)
    try {
      // 1. Busca os dados do relatório
      const res = await window.fetch(
        `/api/relatorios/gerar?cliente_id=${cId}&inicio=${inicio}&fim=${fim}`
      )
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao buscar dados')
      }
      const dados = await res.json()

      // 2. Gera o PDF no browser
      const { gerarPDF } = await import('@/components/relatorios/PdfGenerator')
      await gerarPDF(dados)

      // 3. Salva o registro no banco
      const titulo = `Relatório ${dados.cliente.nome} — ${inicio.slice(0, 7)}`
      await window.fetch('/api/relatorios', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          cliente_id:     cId,
          titulo,
          periodo_inicio: inicio,
          periodo_fim:    fim,
          dados_json:     {
            totais_meta:       dados.meta.totais,
            totais_financeiro: dados.financeiro,
          },
        }),
      })

      await fetch()
      return dados
    } finally {
      setGerando(false)
    }
  }

  const marcarEnviado = async (id: string) => {
    await window.fetch('/api/relatorios', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id }),
    })
    setRelatorios(prev =>
      prev.map(r => r.id === id ? { ...r, enviado_em: new Date().toISOString() } : r)
    )
  }

  const baixarNovamente = async (rel: Relatorio) => {
    setGerando(true)
    try {
      if (!rel.clientes?.id) throw new Error('Cliente não encontrado')
      const res = await window.fetch(
        `/api/relatorios/gerar?cliente_id=${rel.clientes.id}&inicio=${rel.periodo_inicio}&fim=${rel.periodo_fim}`
      )
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao buscar dados')
      }
      const dados = await res.json()
      const { gerarPDF } = await import('@/components/relatorios/PdfGenerator')
      await gerarPDF(dados)
    } finally {
      setGerando(false)
    }
  }

  return { relatorios, loading, gerando, error, refetch: fetch, gerar, marcarEnviado, baixarNovamente }
}
