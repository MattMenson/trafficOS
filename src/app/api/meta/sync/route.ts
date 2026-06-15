import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMonthInsights, parseInsightToMetrica, MetaAPIException } from '@/lib/meta-api'

// POST /api/meta/sync — sincroniza métricas de todas as contas conectadas
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body          = await req.json().catch(() => ({}))
  const accountIdFiltro = body.account_id // opcional: sincroniza só uma conta

  // Busca todos os BMs e contas do gestor
  const { data: bms } = await supabase
    .from('meta_business_managers')
    .select(`
      id, access_token, status,
      meta_ad_accounts (id, account_id, status)
    `)
    .eq('gestor_id', user.id)
    .eq('status', 'ativo')

  if (!bms || bms.length === 0) {
    return NextResponse.json({ error: 'Nenhuma conta conectada' }, { status: 400 })
  }

  const resultados: Array<{
    account_id: string
    dias_sincronizados: number
    erro?: string
  }> = []

  for (const bm of bms) {
    const contas = (bm.meta_ad_accounts as any[]) || []

    for (const conta of contas) {
      if (accountIdFiltro && conta.id !== accountIdFiltro) continue
      if (conta.status !== 'ativo') continue

      try {
        const insights = await getMonthInsights(bm.access_token, conta.account_id)

        if (insights.length === 0) {
          resultados.push({ account_id: conta.account_id, dias_sincronizados: 0 })
          continue
        }

        const metricas = insights.map(insight =>
          parseInsightToMetrica(conta.id, insight)
        )

        // Upsert por conta + data (substitui dados antigos do mesmo dia)
        const { error } = await supabase
          .from('meta_metricas')
          .upsert(metricas, { onConflict: 'ad_account_id,data_referencia' })

        if (error) throw new Error(error.message)

        resultados.push({
          account_id: conta.account_id,
          dias_sincronizados: metricas.length,
        })

      } catch (err) {
        const msg = err instanceof MetaAPIException ? err.message : 'Erro desconhecido'
        resultados.push({
          account_id: conta.account_id,
          dias_sincronizados: 0,
          erro: msg,
        })
      }
    }
  }

  const totalDias = resultados.reduce((s, r) => s + r.dias_sincronizados, 0)
  const erros     = resultados.filter(r => r.erro)

  return NextResponse.json({
    ok:           erros.length === 0,
    contas:       resultados.length,
    dias_totais:  totalDias,
    erros:        erros.length,
    detalhes:     resultados,
    sincronizado_em: new Date().toISOString(),
  })
}

// GET /api/meta/sync — retorna métricas já sincronizadas de uma conta
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const accountId  = searchParams.get('account_id')
  const mes        = searchParams.get('mes') || new Date().toISOString().slice(0, 7)

  if (!accountId) return NextResponse.json({ error: 'account_id obrigatório' }, { status: 400 })

  const { data, error } = await supabase
    .from('meta_metricas')
    .select('*')
    .eq('ad_account_id', accountId)
    .gte('data_referencia', `${mes}-01`)
    .lte('data_referencia', `${mes}-31`)
    .order('data_referencia')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Agrega totais do mês
  const metricas = data || []
  const totais = metricas.reduce((acc, m) => ({
    investimento:    acc.investimento    + m.investimento,
    impressoes:      acc.impressoes      + m.impressoes,
    alcance:         acc.alcance         + m.alcance,
    cliques:         acc.cliques         + m.cliques,
    conversoes:      acc.conversoes      + m.conversoes,
    leads:           acc.leads           + m.leads,
  }), { investimento: 0, impressoes: 0, alcance: 0, cliques: 0, conversoes: 0, leads: 0 })

  const ctr = totais.impressoes > 0 ? (totais.cliques / totais.impressoes) * 100 : 0
  const cpl = totais.leads > 0 ? totais.investimento / totais.leads : 0
  const cpa = totais.conversoes > 0 ? totais.investimento / totais.conversoes : 0

  return NextResponse.json({
    mes,
    account_id: accountId,
    totais: { ...totais, ctr, cpl, cpa },
    diario: metricas,
  })
}
