import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/financeiro/resumo?mes=YYYY-MM
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const mes = searchParams.get('mes') || new Date().toISOString().slice(0, 7)

  // Clientes ativos do gestor
  const { data: clientes } = await supabase
    .from('clientes')
    .select('id, nome, status, contratos(valor_mensal, status)')
    .eq('gestor_id', user.id)

  // Pagamentos do mês
  const { data: pagamentos } = await supabase
    .from('pagamentos')
    .select('*')
    .in('cliente_id', (clientes || []).map(c => c.id))
    .gte('data_vencimento', `${mes}-01`)
    .lte('data_vencimento', `${mes}-31`)

  // Gastos do mês
  const { data: gastos } = await supabase
    .from('gastos')
    .select('*')
    .eq('gestor_id', user.id)
    .gte('data_gasto', `${mes}-01`)
    .lte('data_gasto', `${mes}-31`)

  // Pagamentos últimos 6 meses (para gráfico)
  const seisMesesAtras = new Date()
  seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 5)
  const dataInicio = seisMesesAtras.toISOString().slice(0, 7) + '-01'

  const { data: historicoPagamentos } = await supabase
    .from('pagamentos')
    .select('valor, status, data_vencimento, data_pagamento')
    .in('cliente_id', (clientes || []).map(c => c.id))
    .gte('data_vencimento', dataInicio)
    .order('data_vencimento')

  // Calcula MRR (soma de contratos ativos)
  const mrr = (clientes || [])
    .filter(c => c.status === 'ativo')
    .reduce((acc, c) => {
      const contratoAtivo = (c.contratos as any[])?.find((ct: any) => ct.status === 'ativo')
      return acc + (contratoAtivo?.valor_mensal || 0)
    }, 0)

  const pagamentosArr  = pagamentos  || []
  const gastosArr      = gastos      || []
  const clientesArr    = clientes    || []

  const recebido       = pagamentosArr.filter(p => p.status === 'pago').reduce((s, p) => s + p.valor, 0)
  const pendente       = pagamentosArr.filter(p => p.status === 'pendente').reduce((s, p) => s + p.valor, 0)
  const atrasado       = pagamentosArr.filter(p => p.status === 'atrasado').reduce((s, p) => s + p.valor, 0)
  const totalGastos    = gastosArr.reduce((s, g) => s + g.valor, 0)
  const lucroLiquido   = recebido - totalGastos
  const margem         = recebido > 0 ? Math.round((lucroLiquido / recebido) * 100) : 0

  // Agrupar histórico por mês
  const historicoMeses: Record<string, { recebido: number; previsto: number }> = {}
  ;(historicoPagamentos || []).forEach(p => {
    const m = p.data_vencimento.slice(0, 7)
    if (!historicoMeses[m]) historicoMeses[m] = { recebido: 0, previsto: 0 }
    historicoMeses[m].previsto += p.valor
    if (p.status === 'pago') historicoMeses[m].recebido += p.valor
  })

  // Gastos por categoria
  const gastosPorCategoria: Record<string, number> = {}
  gastosArr.forEach(g => {
    gastosPorCategoria[g.categoria] = (gastosPorCategoria[g.categoria] || 0) + g.valor
  })

  // Faturamento por cliente no mês
  const faturamentoPorCliente = clientesArr
    .map(c => {
      const pags = pagamentosArr.filter(p => p.cliente_id === c.id)
      return {
        cliente_id:   c.id,
        cliente_nome: c.nome,
        previsto:     pags.reduce((s, p) => s + p.valor, 0),
        recebido:     pags.filter(p => p.status === 'pago').reduce((s, p) => s + p.valor, 0),
        status:       c.status,
      }
    })
    .filter(c => c.previsto > 0)
    .sort((a, b) => b.previsto - a.previsto)

  return NextResponse.json({
    mes,
    mrr,
    recebido,
    pendente,
    atrasado,
    total_gastos:   totalGastos,
    lucro_liquido:  lucroLiquido,
    margem,
    clientes_ativos: clientesArr.filter(c => c.status === 'ativo').length,
    historico_meses:    Object.entries(historicoMeses).map(([mes, v]) => ({ mes, ...v })),
    gastos_por_categoria: gastosPorCategoria,
    faturamento_por_cliente: faturamentoPorCliente,
  })
}
