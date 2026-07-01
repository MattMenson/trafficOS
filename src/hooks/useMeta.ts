'use client'

import { useState, useEffect, useCallback } from 'react'

interface AdAccount {
  id: string
  account_id: string
  nome: string
  moeda: string
  timezone: string
  status: string
  cliente_id: string | null
  clientes: { id: string; nome: string } | null
}

interface BusinessManager {
  id: string
  bm_id: string
  nome: string
  status: string
  token_expira_em: string | null
  created_at: string
  meta_ad_accounts: AdAccount[]
}

interface SyncResult {
  ok: boolean
  contas: number
  dias_totais: number
  erros: number
  sincronizado_em: string
  error?: string
}

export function useMetaAccounts() {
  const [bms, setBms]         = useState<BusinessManager[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [lastSync, setLastSync] = useState<SyncResult | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await window.fetch('/api/meta/accounts')
      if (!res.ok) throw new Error('Erro ao buscar contas')
      setBms(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const sincronizar = async (accountId?: string): Promise<SyncResult> => {
    setSyncing(true)
    try {
      const res = await window.fetch('/api/meta/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accountId ? { account_id: accountId } : {}),
      })
      const result = await res.json()
      if (!res.ok) {
        const failed: SyncResult = {
          ok: false, contas: 0, dias_totais: 0, erros: 1,
          sincronizado_em: new Date().toISOString(),
          error: result?.error || 'Erro ao sincronizar',
        }
        setLastSync(failed)
        return failed
      }
      setLastSync(result)
      return result
    } catch (e) {
      const failed: SyncResult = {
        ok: false, contas: 0, dias_totais: 0, erros: 1,
        sincronizado_em: new Date().toISOString(),
        error: e instanceof Error ? e.message : 'Erro de conexão ao sincronizar',
      }
      setLastSync(failed)
      return failed
    } finally {
      setSyncing(false)
    }
  }

  const vincularCliente = async (adAccountId: string, clienteId: string | null) => {
    const res = await window.fetch('/api/meta/accounts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account_id: adAccountId, cliente_id: clienteId }),
    })
    if (!res.ok) throw new Error('Erro ao vincular cliente')
    await fetch()
  }

  const desconectar = async (bmId: string) => {
    const res = await window.fetch('/api/meta/disconnect', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bm_id: bmId }),
    })
    if (!res.ok) throw new Error('Erro ao desconectar')
    setBms(prev => prev.filter(b => b.id !== bmId))
  }

  const conectarManual = async (bmIdMeta: string, accessToken: string): Promise<{ ok: boolean; error?: string; contas?: number }> => {
    const res = await window.fetch('/api/meta/connect-manual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bm_id: bmIdMeta, access_token: accessToken }),
    })
    const result = await res.json()
    if (!res.ok) return { ok: false, error: result?.error || 'Erro ao conectar' }
    await fetch()
    return { ok: true, contas: result.contas }
  }

  const totalContas = bms.reduce((s, bm) => s + bm.meta_ad_accounts.length, 0)
  const contasVinculadas = bms.reduce(
    (s, bm) => s + bm.meta_ad_accounts.filter(a => a.cliente_id).length, 0
  )

  return {
    bms,
    loading,
    syncing,
    error,
    lastSync,
    totalContas,
    contasVinculadas,
    refetch: fetch,
    sincronizar,
    vincularCliente,
    desconectar,
    conectarManual,
  }
}

// -------------------------------------------------------

interface MetricasDiarias {
  mes: string
  account_id: string
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
  }
  diario: Array<{
    data_referencia: string
    investimento: number
    impressoes: number
    cliques: number
    leads: number
    ctr: number
  }>
}

export function useMetaMetricas(accountId: string | null, mes?: string) {
  const [metricas, setMetricas] = useState<MetricasDiarias | null>(null)
  const [loading, setLoading]   = useState(false)

  const mesAtual = mes || new Date().toISOString().slice(0, 7)

  const fetch = useCallback(async () => {
    if (!accountId) return
    setLoading(true)
    try {
      const res = await window.fetch(`/api/meta/sync?account_id=${accountId}&mes=${mesAtual}`)
      if (!res.ok) return
      setMetricas(await res.json())
    } finally {
      setLoading(false)
    }
  }, [accountId, mesAtual])

  useEffect(() => { fetch() }, [fetch])

  return { metricas, loading, refetch: fetch }
}
