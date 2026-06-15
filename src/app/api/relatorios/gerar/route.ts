import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/relatorios/gerar?cliente_id=...&inicio=YYYY-MM-DD&fim=YYYY-MM-DD
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const clienteId = searchParams.get('cliente_id')
  const inicio    = searchParams.get('inicio')
  const fim       = searchParams.get('fim')

  if (!clienteId || !inicio || !fim) {
    return NextResponse.json({ error: 'cliente_id, inicio e fim são obrigatórios' }, { status: 400 })
  }

  // ── 1. Dados do cliente ──
  const { data: cliente, error: clienteErr } = await supabase
    .from('clientes')
    .select(`
      id, nome, email, telefone, segmento, cnpj_cpf,
      contratos (id, descricao, valor_mensal, status, tipo_contrato)
    `)
    .eq('id', clienteId)
    .eq('gestor_id', user.id)
    .single()

  if (clienteErr || !cliente) {
    return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
  }

  // ── 2. Dados do gestor (perfil) ──
  const { data: gestor } = await supabase
    .from('profiles')
    .select('nome, email')
    .eq('id', user.id)
    .single()

  // ── 3. Pagamentos no período ──
  const { data: pagamentos } = await supabase
    .from('pagamentos')
    .select('*')
    .eq('cliente_id', clienteId)
    .gte('data_vencimento', inicio)
    .lte('data_vencimento', fim)

  const pagsArr        = pagamentos || []
  const totalFaturado  = pagsArr.reduce((s, p) => s + p.valor, 0)
  const totalRecebido  = pagsArr.filter(p => p.status === 'pago').reduce((s, p) => s + p.valor, 0)
  const totalPendente  = pagsArr.filter(p => p.status === 'pendente').reduce((s, p) => s + p.valor, 0)

  // ── 4. Contas Meta vinculadas ao cliente ──
  const { data: adAccounts } = await supabase
    .from('meta_ad_accounts')
    .select(`
      id, account_id, nome, moeda,
      meta_business_managers!inner (gestor_id, nome)
    `)
    .eq('cliente_id', clienteId)
    .eq('meta_business_managers.gestor_id', user.id)

  const accountIds = (adAccounts || []).map(a => a.id)

  // ── 5. Métricas Meta no período ──
  const { data: metricas } = await supabase
    .from('meta_metricas')
    .select('*')
    .in('ad_account_id', accountIds.length > 0 ? accountIds : ['__none__'])
    .gte('data_referencia', inicio)
    .lte('data_referencia', fim)
    .order('data_referencia')

  const metArr = metricas || []

  // Totais Meta
  const metaTotais = metArr.reduce((acc, m) => ({
    investimento: acc.investimento + m.investimento,
    impressoes:   acc.impressoes   + m.impressoes,
    alcance:      acc.alcance      + m.alcance,
    cliques:      acc.cliques      + m.cliques,
    conversoes:   acc.conversoes   + m.conversoes,
    leads:        acc.leads        + m.leads,
  }), { investimento: 0, impressoes: 0, alcance: 0, cliques: 0, conversoes: 0, leads: 0 })

  const ctr  = metaTotais.impressoes > 0 ? (metaTotais.cliques / metaTotais.impressoes) * 100 : 0
  const cpm  = metaTotais.impressoes > 0 ? (metaTotais.investimento / metaTotais.impressoes) * 1000 : 0
  const cpc  = metaTotais.cliques > 0 ? metaTotais.investimento / metaTotais.cliques : 0
  const cpl  = metaTotais.leads > 0 ? metaTotais.investimento / metaTotais.leads : 0
  const cpa  = metaTotais.conversoes > 0 ? metaTotais.investimento / metaTotais.conversoes : 0

  // Evolução diária (para gráfico no PDF)
  const evoluçãoDiaria = metArr.map(m => ({
    data:         m.data_referencia,
    investimento: m.investimento,
    impressoes:   m.impressoes,
    cliques:      m.cliques,
    leads:        m.leads,
    ctr:          m.ctr,
  }))

  // Breakdown por conta
  const breakdownContas = (adAccounts || []).map(acc => {
    const mAcc = metArr.filter(m => m.ad_account_id === acc.id)
    const inv  = mAcc.reduce((s, m) => s + m.investimento, 0)
    const lds  = mAcc.reduce((s, m) => s + m.leads, 0)
    return {
      account_id:   acc.account_id,
      nome:         acc.nome,
      investimento: inv,
      leads:        lds,
      cpl:          lds > 0 ? inv / lds : 0,
    }
  }).filter(a => a.investimento > 0)

  // ── 6. Ideias implementadas no período ──
  const { data: ideiasImpl } = await supabase
    .from('ideias')
    .select('titulo, categoria, status')
    .eq('cliente_id', clienteId)
    .eq('status', 'implementado')
    .gte('updated_at', inicio)
    .lte('updated_at', fim + 'T23:59:59')

  // ── 7. Entregas do período ──
  const { data: entregasPeriodo } = await supabase
    .from('entregas')
    .select('titulo, tipo, status, data_entrega')
    .eq('cliente_id', clienteId)
    .gte('created_at', inicio)
    .lte('created_at', fim + 'T23:59:59')

  // ── MONTA O OBJETO COMPLETO DO RELATÓRIO ──
  const dados = {
    gerado_em:   new Date().toISOString(),
    periodo:     { inicio, fim },
    gestor:      { nome: gestor?.nome || '', email: gestor?.email || '' },
    cliente: {
      id:       cliente.id,
      nome:     cliente.nome,
      email:    cliente.email,
      telefone: cliente.telefone,
      segmento: cliente.segmento,
      cnpj_cpf: cliente.cnpj_cpf,
      contrato: (cliente.contratos as any[])?.find((c: any) => c.status === 'ativo') || null,
    },
    financeiro: {
      total_faturado:  totalFaturado,
      total_recebido:  totalRecebido,
      total_pendente:  totalPendente,
      pagamentos:      pagsArr,
    },
    meta: {
      contas: breakdownContas,
      totais: { ...metaTotais, ctr, cpm, cpc, cpl, cpa },
      evolucao_diaria: evoluçãoDiaria,
    },
    entregas:    entregasPeriodo || [],
    ideias_impl: ideiasImpl     || [],
  }

  return NextResponse.json(dados)
}
