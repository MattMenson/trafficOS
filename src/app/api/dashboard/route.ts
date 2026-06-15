import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/dashboard — agrega todos os dados do sistema em um único call
export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const hoje     = new Date()
  const mesAtual = hoje.toISOString().slice(0, 7)
  const anoAtual = hoje.getFullYear().toString()

  // -------------------------------------------------------
  // 1. CLIENTES
  // -------------------------------------------------------
  const { data: clientes } = await supabase
    .from('clientes')
    .select(`
      id, nome, status, created_at,
      contratos (id, valor_mensal, status, data_fim, renovacao_auto),
      pagamentos (id, valor, status, data_vencimento)
    `)
    .eq('gestor_id', user.id)

  const clientesArr = clientes || []
  const ativos      = clientesArr.filter(c => c.status === 'ativo')
  const pausados    = clientesArr.filter(c => c.status === 'pausado')
  const prospectos  = clientesArr.filter(c => c.status === 'prospecto')

  // MRR — soma dos contratos ativos
  const mrr = ativos.reduce((acc, c) => {
    const ct = (c.contratos as any[])?.find((x: any) => x.status === 'ativo')
    return acc + (ct?.valor_mensal || 0)
  }, 0)

  // Contratos vencendo em até 15 dias
  const contratosVencendo = clientesArr.flatMap(c =>
    ((c.contratos as any[]) || [])
      .filter((ct: any) => {
        if (!ct.data_fim || ct.status !== 'ativo') return false
        const dias = Math.ceil((new Date(ct.data_fim).getTime() - hoje.getTime()) / 86400000)
        return dias >= 0 && dias <= 15
      })
      .map((ct: any) => ({
        cliente_id:   c.id,
        cliente_nome: c.nome,
        data_fim:     ct.data_fim,
        dias_restantes: Math.ceil((new Date(ct.data_fim).getTime() - hoje.getTime()) / 86400000),
        valor_mensal: ct.valor_mensal,
      }))
  )

  // Novos clientes no mês
  const novosClientes = clientesArr.filter(c =>
    c.created_at?.startsWith(mesAtual)
  ).length

  // -------------------------------------------------------
  // 2. FINANCEIRO — mês atual
  // -------------------------------------------------------
  const clienteIds = clientesArr.map(c => c.id)

  const { data: pagamentosMes } = await supabase
    .from('pagamentos')
    .select('*')
    .in('cliente_id', clienteIds.length > 0 ? clienteIds : ['__none__'])
    .gte('data_vencimento', `${mesAtual}-01`)
    .lte('data_vencimento', `${mesAtual}-31`)

  const pagsArr     = pagamentosMes || []
  const recebido    = pagsArr.filter(p => p.status === 'pago').reduce((s, p) => s + p.valor, 0)
  const pendente    = pagsArr.filter(p => p.status === 'pendente').reduce((s, p) => s + p.valor, 0)
  const atrasado    = pagsArr.filter(p => p.status === 'atrasado').reduce((s, p) => s + p.valor, 0)

  // Pagamentos atrasados com nome do cliente
  const pagamentosAtrasados = clientesArr.flatMap(c =>
    ((c.pagamentos as any[]) || [])
      .filter((p: any) => p.status === 'atrasado')
      .map((p: any) => ({
        cliente_nome: c.nome,
        valor:        p.valor,
        data_vencimento: p.data_vencimento,
        dias_atraso: Math.ceil((hoje.getTime() - new Date(p.data_vencimento).getTime()) / 86400000),
      }))
  ).sort((a, b) => b.dias_atraso - a.dias_atraso)

  // Gastos do mês
  const { data: gastosMes } = await supabase
    .from('gastos')
    .select('valor')
    .eq('gestor_id', user.id)
    .gte('data_gasto', `${mesAtual}-01`)
    .lte('data_gasto', `${mesAtual}-31`)

  const totalGastos   = (gastosMes || []).reduce((s, g) => s + g.valor, 0)
  const lucroLiquido  = recebido - totalGastos
  const margem        = recebido > 0 ? Math.round((lucroLiquido / recebido) * 100) : 0

  // Histórico MRR últimos 6 meses (baseado em pagamentos recebidos)
  const historicoMrr: Array<{ mes: string; recebido: number; mrr: number }> = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
    const m = d.toISOString().slice(0, 7)

    const { data: pagsHist } = await supabase
      .from('pagamentos')
      .select('valor, status')
      .in('cliente_id', clienteIds.length > 0 ? clienteIds : ['__none__'])
      .gte('data_vencimento', `${m}-01`)
      .lte('data_vencimento', `${m}-31`)

    const recHist = (pagsHist || []).filter(p => p.status === 'pago').reduce((s, p) => s + p.valor, 0)
    historicoMrr.push({ mes: m, recebido: recHist, mrr })
  }

  // -------------------------------------------------------
  // 3. META ADS — totais do mês
  // -------------------------------------------------------
  const { data: metaAccounts } = await supabase
    .from('meta_ad_accounts')
    .select(`
      id, nome, status, cliente_id,
      meta_business_managers!inner (gestor_id)
    `)
    .eq('meta_business_managers.gestor_id', user.id)

  const accountIds = (metaAccounts || []).map(a => a.id)

  const { data: metaMes } = await supabase
    .from('meta_metricas')
    .select('*')
    .in('ad_account_id', accountIds.length > 0 ? accountIds : ['__none__'])
    .gte('data_referencia', `${mesAtual}-01`)
    .lte('data_referencia', `${mesAtual}-31`)

  const metaArr = metaMes || []
  const metaTotais = metaArr.reduce((acc, m) => ({
    investimento: acc.investimento + m.investimento,
    impressoes:   acc.impressoes   + m.impressoes,
    cliques:      acc.cliques      + m.cliques,
    leads:        acc.leads        + m.leads,
    conversoes:   acc.conversoes   + m.conversoes,
  }), { investimento: 0, impressoes: 0, cliques: 0, leads: 0, conversoes: 0 })

  const ctrGlobal = metaTotais.impressoes > 0
    ? (metaTotais.cliques / metaTotais.impressoes) * 100 : 0
  const cplGlobal = metaTotais.leads > 0
    ? metaTotais.investimento / metaTotais.leads : 0

  // Spend por conta para o gráfico
  const spendPorConta = (metaAccounts || []).map(acc => {
    const spend = metaArr
      .filter(m => m.ad_account_id === acc.id)
      .reduce((s, m) => s + m.investimento, 0)
    const cliente = clientesArr.find(c => c.id === acc.cliente_id)
    return {
      account_id:   acc.id,
      account_nome: acc.nome,
      cliente_nome: cliente?.nome || 'Sem cliente',
      investimento: spend,
    }
  }).filter(a => a.investimento > 0).sort((a, b) => b.investimento - a.investimento)

  // -------------------------------------------------------
  // 4. ATIVIDADE RECENTE
  // -------------------------------------------------------
  const { data: anotacoesRecentes } = await supabase
    .from('anotacoes')
    .select(`id, titulo, tipo, created_at, clientes(nome)`)
    .eq('gestor_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  const { data: entregasRecentes } = await supabase
    .from('entregas')
    .select(`id, titulo, status, updated_at, clientes(nome)`)
    .eq('gestor_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(5)

  const { data: tarefasUrgentes } = await supabase
    .from('tarefas')
    .select('id, titulo, prazo, prioridade, cliente_id, clientes(nome)')
    .eq('gestor_id', user.id)
    .in('status', ['a_fazer', 'em_andamento'])
    .in('prioridade', ['alta', 'urgente'])
    .order('prazo', { ascending: true })
    .limit(5)

  const { data: entregasAtrasadas } = await supabase
    .from('entregas')
    .select('id, titulo, prazo, clientes(nome)')
    .eq('gestor_id', user.id)
    .eq('status', 'atrasado')
    .order('prazo')
    .limit(5)

  // -------------------------------------------------------
  // 5. FATURAMENTO POR CLIENTE (receita + investimento Meta)
  // -------------------------------------------------------
  const clientePerformance = ativos.map(c => {
    const ct    = (c.contratos as any[])?.find((x: any) => x.status === 'ativo')
    const pags  = (c.pagamentos as any[]) || []
    const recMes = pags.filter((p: any) => p.status === 'pago' && p.data_vencimento?.startsWith(mesAtual))
                      .reduce((s: number, p: any) => s + p.valor, 0)

    const accIds = (metaAccounts || []).filter(a => a.cliente_id === c.id).map(a => a.id)
    const spendMes = metaArr.filter(m => accIds.includes(m.ad_account_id))
                            .reduce((s, m) => s + m.investimento, 0)

    return {
      cliente_id:       c.id,
      cliente_nome:     c.nome,
      mensalidade:      ct?.valor_mensal || 0,
      recebido_mes:     recMes,
      investimento_meta: spendMes,
    }
  }).sort((a, b) => b.mensalidade - a.mensalidade)

  // -------------------------------------------------------
  // RESPOSTA FINAL
  // -------------------------------------------------------
  return NextResponse.json({
    gerado_em: new Date().toISOString(),
    mes:       mesAtual,

    clientes: {
      total:      clientesArr.length,
      ativos:     ativos.length,
      pausados:   pausados.length,
      prospectos: prospectos.length,
      novos_mes:  novosClientes,
    },

    financeiro: {
      mrr,
      recebido,
      pendente,
      atrasado,
      total_gastos:  totalGastos,
      lucro_liquido: lucroLiquido,
      margem,
      historico_mrr: historicoMrr,
    },

    meta: {
      contas_conectadas: (metaAccounts || []).length,
      ...metaTotais,
      ctr: ctrGlobal,
      cpl: cplGlobal,
      spend_por_conta: spendPorConta,
    },

    alertas: {
      contratos_vencendo:  contratosVencendo,
      pagamentos_atrasados: pagamentosAtrasados,
      entregas_atrasadas:  (entregasAtrasadas || []),
      tarefas_urgentes:    (tarefasUrgentes || []),
    },

    performance_clientes: clientePerformance,
    atividade_recente:    (anotacoesRecentes || []).slice(0, 4),
  })
}
