import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/exportar?mes=2024-01&cliente_id=xxx&tipo=metricas|financeiro|completo
// Gera e retorna um CSV com os dados solicitados
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const mes        = searchParams.get('mes') || new Date().toISOString().slice(0, 7)
  const cliente_id = searchParams.get('cliente_id')
  const tipo       = searchParams.get('tipo') || 'metricas' // metricas | financeiro | completo

  let csvContent = ''
  const filename = `trafficOS_${tipo}_${mes}.csv`

  // ─── MÉTRICAS META ADS ────────────────────────────────────────────────────
  if (tipo === 'metricas' || tipo === 'completo') {
    // Busca contas do gestor
    let accountQuery = supabase
      .from('meta_ad_accounts')
      .select(`
        id, account_id, nome, moeda, cliente_id,
        clientes (nome),
        meta_business_managers!inner (gestor_id)
      `)
      .eq('meta_business_managers.gestor_id', user.id)

    if (cliente_id) accountQuery = accountQuery.eq('cliente_id', cliente_id)

    const { data: accounts } = await accountQuery
    const accountIds = (accounts || []).map((a: any) => a.id)
    const accountMap: Record<string, any> = {}
    ;(accounts || []).forEach((a: any) => { accountMap[a.id] = a })

    if (accountIds.length > 0) {
      const { data: metricas } = await supabase
        .from('meta_metricas')
        .select('*')
        .in('ad_account_id', accountIds)
        .gte('data_referencia', `${mes}-01`)
        .lte('data_referencia', `${mes}-31`)
        .order('data_referencia')

      const rows = metricas || []

      const header = [
        'Data', 'Conta', 'Account ID', 'Cliente', 'Moeda',
        'Investimento (R$)', 'Impressões', 'Alcance', 'Cliques',
        'CTR (%)', 'CPM (R$)', 'CPC (R$)', 'Leads', 'CPL (R$)',
        'Conversões', 'CPA (R$)', 'ROAS', 'Frequência',
      ].join(';')

      const dataRows = rows.map((m: any) => {
        const acc = accountMap[m.ad_account_id] || {}
        return [
          m.data_referencia,
          acc.nome || '',
          acc.account_id || '',
          acc.clientes?.nome || '',
          acc.moeda || 'BRL',
          num(m.investimento),
          m.impressoes || 0,
          m.alcance    || 0,
          m.cliques    || 0,
          num(m.ctr),
          num(m.cpm),
          num(m.cpc),
          m.leads      || 0,
          num(m.cpl),
          m.conversoes || 0,
          num(m.custo_conversao),
          num(m.roas),
          num(m.frequencia),
        ].join(';')
      })

      if (tipo === 'metricas') {
        csvContent = [header, ...dataRows].join('\n')
      } else {
        csvContent += '=== MÉTRICAS META ADS ===\n' + [header, ...dataRows].join('\n') + '\n\n'
      }
    }
  }

  // ─── DADOS FINANCEIROS ────────────────────────────────────────────────────
  if (tipo === 'financeiro' || tipo === 'completo') {
    const { data: clientes } = await supabase
      .from('clientes')
      .select('id')
      .eq('gestor_id', user.id)

    const clienteIds = (clientes || []).map((c: any) => c.id)

    if (clienteIds.length > 0) {
      let pagQuery = supabase
        .from('pagamentos')
        .select('*, clientes(nome)')
        .in('cliente_id', cliente_id ? [cliente_id] : clienteIds)
        .gte('data_vencimento', `${mes}-01`)
        .lte('data_vencimento', `${mes}-31`)
        .order('data_vencimento')

      const { data: pagamentos } = await pagQuery
      const rows = pagamentos || []

      const header = [
        'Vencimento', 'Cliente', 'Descrição', 'Valor (R$)',
        'Status', 'Data Pagamento', 'Forma Pagamento',
      ].join(';')

      const dataRows = rows.map((p: any) => [
        p.data_vencimento,
        p.clientes?.nome || '',
        p.descricao || '',
        num(p.valor),
        p.status,
        p.data_pagamento || '',
        p.forma_pagamento || '',
      ].join(';'))

      if (tipo === 'financeiro') {
        csvContent = [header, ...dataRows].join('\n')
      } else {
        csvContent += '=== FINANCEIRO ===\n' + [header, ...dataRows].join('\n') + '\n\n'
      }
    }
  }

  // BOM UTF-8 para abrir corretamente no Excel
  const bom = '\uFEFF'

  return new NextResponse(bom + csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

function num(v: any): string {
  if (v == null || v === '') return '0'
  return String(Number(v).toFixed(2)).replace('.', ',')
}
