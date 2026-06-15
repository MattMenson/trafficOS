import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

// POST /api/relatorios/link — gera um link público para um relatório
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await req.json()
  const { cliente_id, mes, titulo, expira_dias = 30 } = body

  if (!cliente_id || !mes) {
    return NextResponse.json({ error: 'cliente_id e mes são obrigatórios' }, { status: 400 })
  }

  // Verifica que o cliente pertence ao gestor
  const { data: cliente } = await supabase
    .from('clientes')
    .select('id, nome')
    .eq('id', cliente_id)
    .eq('gestor_id', user.id)
    .single()

  if (!cliente) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })

  // Busca dados do perfil do gestor
  const { data: profile } = await supabase
    .from('profiles')
    .select('nome, email')
    .eq('id', user.id)
    .single()

  const token    = randomUUID()
  const expira_em = new Date()
  expira_em.setDate(expira_em.getDate() + expira_dias)

  // Usa service role para inserir na tabela relatorio_links (sem RLS em tokens públicos)
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: link, error } = await serviceClient
    .from('relatorio_links')
    .insert({
      gestor_id:    user.id,
      gestor_nome:  profile?.nome  || user.email,
      gestor_email: profile?.email || user.email,
      cliente_id,
      cliente_nome: cliente.nome,
      mes,
      titulo:       titulo || `Relatório ${mes} — ${cliente.nome}`,
      token,
      expira_em:    expira_em.toISOString(),
      acessos:      0,
    })
    .select()
    .single()

  if (error) {
    // Se a tabela não existir, retorna instrução
    if (error.code === '42P01') {
      return NextResponse.json({
        error: 'Tabela relatorio_links não encontrada. Execute a migration SQL.',
        sql: MIGRATION_SQL,
      }, { status: 500 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return NextResponse.json({
    token,
    url: `${baseUrl}/r/${token}`,
    expira_em: expira_em.toISOString(),
  }, { status: 201 })
}

// GET /api/relatorios/link?token=xxx — valida e retorna dados do link
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')

  if (!token) return NextResponse.json({ error: 'token obrigatório' }, { status: 400 })

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: link, error } = await serviceClient
    .from('relatorio_links')
    .select('*')
    .eq('token', token)
    .single()

  if (error || !link) return NextResponse.json({ error: 'Link não encontrado' }, { status: 404 })
  if (new Date(link.expira_em) < new Date()) {
    return NextResponse.json({ error: 'Link expirado' }, { status: 410 })
  }

  // Incrementa acessos
  await serviceClient
    .from('relatorio_links')
    .update({ acessos: (link.acessos || 0) + 1 })
    .eq('token', token)

  // Busca métricas do período
  const { data: accounts } = await serviceClient
    .from('meta_ad_accounts')
    .select('id, nome, account_id')
    .eq('cliente_id', link.cliente_id)

  const accountIds = (accounts || []).map((a: any) => a.id)
  let metricas: any[] = []
  let diario: any[] = []

  if (accountIds.length > 0) {
    const mes = link.mes
    const { data: rows } = await serviceClient
      .from('meta_metricas')
      .select('*')
      .in('ad_account_id', accountIds)
      .gte('data_referencia', `${mes}-01`)
      .lte('data_referencia', `${mes}-31`)
      .order('data_referencia')

    metricas = rows || []

    const diasMap: Record<string, any> = {}
    metricas.forEach(m => {
      if (!diasMap[m.data_referencia]) {
        diasMap[m.data_referencia] = { data: m.data_referencia, investimento: 0, leads: 0, cliques: 0, impressoes: 0 }
      }
      diasMap[m.data_referencia].investimento += m.investimento || 0
      diasMap[m.data_referencia].leads        += m.leads        || 0
      diasMap[m.data_referencia].cliques      += m.cliques      || 0
      diasMap[m.data_referencia].impressoes   += m.impressoes   || 0
    })
    diario = Object.values(diasMap).sort((a: any, b: any) => a.data.localeCompare(b.data))
  }

  // Agrega totais
  const totais = metricas.reduce((acc, m) => ({
    investimento: acc.investimento + (m.investimento || 0),
    impressoes:   acc.impressoes   + (m.impressoes   || 0),
    alcance:      acc.alcance      + (m.alcance      || 0),
    cliques:      acc.cliques      + (m.cliques      || 0),
    leads:        acc.leads        + (m.leads        || 0),
    conversoes:   acc.conversoes   + (m.conversoes   || 0),
  }), { investimento: 0, impressoes: 0, alcance: 0, cliques: 0, leads: 0, conversoes: 0 })

  const ctr = totais.impressoes > 0 ? (totais.cliques / totais.impressoes) * 100 : 0
  const cpl = totais.leads > 0 ? totais.investimento / totais.leads : 0
  const cpa = totais.conversoes > 0 ? totais.investimento / totais.conversoes : 0

  return NextResponse.json({
    link: {
      titulo:       link.titulo,
      mes:          link.mes,
      cliente_nome: link.cliente_nome,
      gestor_nome:  link.gestor_nome,
      gestor_email: link.gestor_email,
      expira_em:    link.expira_em,
      acessos:      (link.acessos || 0) + 1,
    },
    totais: { ...totais, ctr, cpl, cpa },
    diario,
    contas: accounts || [],
  })
}

const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS relatorio_links (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  gestor_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  gestor_nome  text,
  gestor_email text,
  cliente_id   uuid REFERENCES clientes(id) ON DELETE CASCADE,
  cliente_nome text NOT NULL,
  mes          text NOT NULL,
  titulo       text NOT NULL,
  token        text UNIQUE NOT NULL,
  expira_em    timestamptz NOT NULL,
  acessos      integer DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);
`
