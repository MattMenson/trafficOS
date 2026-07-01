import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAccountInsights, parseInsightToMetrica, MetaAPIException } from '@/lib/meta-api'

export const dynamic  = 'force-dynamic'
export const maxDuration = 60 // segundos

// ============================================================
// GET /api/cron/sync-meta
// Sincroniza métricas de TODAS as contas de TODOS os gestores,
// sem precisar de clique manual. Disparado automaticamente pelo
// Vercel Cron (ver vercel.json) e protegido por CRON_SECRET.
//
// Busca uma janela curta (últimos 3 dias) porque o cron roda
// várias vezes ao dia e a Meta reprocessa atribuição de conversão
// retroativamente por um tempo.
// ============================================================
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const { data: bms, error: bmError } = await supabase
    .from('meta_business_managers')
    .select(`
      id, gestor_id, access_token, status,
      meta_ad_accounts (id, account_id, status)
    `)
    .eq('status', 'ativo')

  if (bmError) {
    return NextResponse.json({ error: bmError.message }, { status: 500 })
  }

  if (!bms || bms.length === 0) {
    return NextResponse.json({
      ok: true,
      contas: 0,
      dias_totais: 0,
      mensagem: 'Nenhuma conta conectada no sistema.',
      sincronizado_em: new Date().toISOString(),
    })
  }

  const dateEnd   = new Date().toISOString().split('T')[0]
  const dateStart = new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0]

  const resultados: Array<{
    bm_id: string
    account_id: string
    dias: number
    erro?: string
  }> = []

  for (const bm of bms) {
    const contas = (bm.meta_ad_accounts as any[]) || []
    let bmComErroDeToken = false

    for (const conta of contas) {
      if (conta.status !== 'ativo') continue

      try {
        const insights = await getAccountInsights(bm.access_token, conta.account_id, dateStart, dateEnd)
        const metricas = insights.map(i => parseInsightToMetrica(conta.id, i))

        if (metricas.length > 0) {
          const { error } = await supabase
            .from('meta_metricas')
            .upsert(metricas, { onConflict: 'ad_account_id,data_referencia' })
          if (error) throw new Error(error.message)
        }

        resultados.push({ bm_id: bm.id, account_id: conta.account_id, dias: metricas.length })
      } catch (err) {
        const msg = err instanceof MetaAPIException ? err.message : 'Erro desconhecido'
        // Código 190 = token inválido/expirado — sinaliza o BM pra o gestor reconectar
        if (err instanceof MetaAPIException && err.code === 190) bmComErroDeToken = true
        resultados.push({ bm_id: bm.id, account_id: conta.account_id, dias: 0, erro: msg })
      }
    }

    if (bmComErroDeToken) {
      await supabase.from('meta_business_managers').update({ status: 'erro' }).eq('id', bm.id)
    }
  }

  const diasTotais = resultados.reduce((s, r) => s + r.dias, 0)
  const erros      = resultados.filter(r => r.erro)

  return NextResponse.json({
    ok:              erros.length === 0,
    contas:          resultados.length,
    dias_totais:     diasTotais,
    erros:           erros.length,
    detalhes:        resultados,
    sincronizado_em: new Date().toISOString(),
  })
}
