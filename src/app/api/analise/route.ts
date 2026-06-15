import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/analise?mes=2024-01&cliente_id=xxx
// Retorna dados agregados de todas as contas do gestor (ou filtradas por cliente)
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const mes        = searchParams.get('mes') || new Date().toISOString().slice(0, 7)
  const cliente_id = searchParams.get('cliente_id') // opcional
  const mes_ant    = searchParams.get('mes_anterior') // para comparação

  // Busca todas as contas de anúncio do gestor (opcionalmente filtradas por cliente)
  let accountQuery = supabase
    .from('meta_ad_accounts')
    .select(`
      id, account_id, nome, moeda, status, cliente_id,
      clientes (id, nome),
      meta_business_managers!inner (id, gestor_id, status)
    `)
    .eq('meta_business_managers.gestor_id', user.id)
    .eq('meta_business_managers.status', 'ativo')

  if (cliente_id) {
    accountQuery = accountQuery.eq('cliente_id', cliente_id)
  }

  const { data: accounts, error: accErr } = await accountQuery
  if (accErr) return NextResponse.json({ error: accErr.message }, { status: 500 })
  if (!accounts || accounts.length === 0) {
    return NextResponse.json({ contas: [], totais: null, diario: [] })
  }

  const accountIds = accounts.map((a: any) => a.id)

  // Busca métricas do mês atual
  const { data: metricas, error: metErr } = await supabase
    .from('meta_metricas')
    .select('*')
    .in('ad_account_id', accountIds)
    .gte('data_referencia', `${mes}-01`)
    .lte('data_referencia', `${mes}-31`)
    .order('data_referencia')

  if (metErr) return NextResponse.json({ error: metErr.message }, { status: 500 })

  // Busca métricas do mês anterior (se solicitado)
  let metricasAnt: any[] = []
  if (mes_ant) {
    const { data: ant } = await supabase
      .from('meta_metricas')
      .select('*')
      .in('ad_account_id', accountIds)
      .gte('data_referencia', `${mes_ant}-01`)
      .lte('data_referencia', `${mes_ant}-31`)

    metricasAnt = ant || []
  }

  const rows = metricas || []
  const rowsAnt = metricasAnt

  // ─── Agregar por conta ──────────────────────────────────────────────────────
  const porConta = accounts.map((acc: any) => {
    const dados = rows.filter((m: any) => m.ad_account_id === acc.id)
    const totais = somarMetricas(dados)
    return {
      id:           acc.id,
      account_id:   acc.account_id,
      nome:         acc.nome,
      moeda:        acc.moeda,
      status:       acc.status,
      cliente_id:   acc.cliente_id,
      cliente_nome: acc.clientes?.nome || null,
      totais,
      dias: dados.length,
    }
  })

  // ─── Totais gerais ────────────────────────────────────────────────────────
  const totaisGerais = somarMetricas(rows)
  const totaisAnt    = somarMetricas(rowsAnt)

  // ─── Consolidado diário (soma de todas as contas por dia) ─────────────────
  const diasMap: Record<string, any> = {}
  rows.forEach((m: any) => {
    if (!diasMap[m.data_referencia]) {
      diasMap[m.data_referencia] = { data: m.data_referencia, investimento: 0, leads: 0, cliques: 0, impressoes: 0, conversoes: 0 }
    }
    diasMap[m.data_referencia].investimento  += m.investimento  || 0
    diasMap[m.data_referencia].leads         += m.leads         || 0
    diasMap[m.data_referencia].cliques       += m.cliques       || 0
    diasMap[m.data_referencia].impressoes    += m.impressoes    || 0
    diasMap[m.data_referencia].conversoes    += m.conversoes    || 0
  })
  const diario = Object.values(diasMap).sort((a: any, b: any) => a.data.localeCompare(b.data))

  // ─── Comparação mês anterior ─────────────────────────────────────────────
  const comparativo = mes_ant ? {
    investimento_delta: calcDelta(totaisGerais.investimento, totaisAnt.investimento),
    leads_delta:        calcDelta(totaisGerais.leads, totaisAnt.leads),
    cliques_delta:      calcDelta(totaisGerais.cliques, totaisAnt.cliques),
    cpl_delta:          calcDelta(totaisGerais.cpl, totaisAnt.cpl, true), // invertido — menor é melhor
    ctr_delta:          calcDelta(totaisGerais.ctr, totaisAnt.ctr),
  } : null

  return NextResponse.json({
    mes,
    mes_anterior: mes_ant || null,
    contas:      porConta,
    totais:      totaisGerais,
    totais_anterior: mes_ant ? totaisAnt : null,
    comparativo,
    diario,
    total_contas: accounts.length,
    ultima_atualizacao: rows.length > 0 ? rows[rows.length - 1]?.sincronizado_em : null,
  })
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function somarMetricas(rows: any[]) {
  if (rows.length === 0) {
    return { investimento: 0, impressoes: 0, alcance: 0, cliques: 0, conversoes: 0, leads: 0, ctr: 0, cpl: 0, cpa: 0, roas: 0 }
  }
  const t = rows.reduce((acc, m) => ({
    investimento: acc.investimento + (m.investimento || 0),
    impressoes:   acc.impressoes   + (m.impressoes   || 0),
    alcance:      acc.alcance      + (m.alcance      || 0),
    cliques:      acc.cliques      + (m.cliques      || 0),
    conversoes:   acc.conversoes   + (m.conversoes   || 0),
    leads:        acc.leads        + (m.leads        || 0),
  }), { investimento: 0, impressoes: 0, alcance: 0, cliques: 0, conversoes: 0, leads: 0 })

  const ctr  = t.impressoes > 0 ? (t.cliques     / t.impressoes) * 100 : 0
  const cpl  = t.leads      > 0 ? t.investimento / t.leads             : 0
  const cpa  = t.conversoes > 0 ? t.investimento / t.conversoes        : 0
  const roas = t.investimento > 0 ? 0 : 0 // ROAS precisa do valor de conversão — deixamos 0 por enquanto

  return { ...t, ctr, cpl, cpa, roas }
}

function calcDelta(atual: number, anterior: number, menor_melhor = false) {
  if (anterior === 0) return null
  const pct   = ((atual - anterior) / anterior) * 100
  const up    = menor_melhor ? pct < 0 : pct > 0
  return { pct: parseFloat(pct.toFixed(1)), up }
}
