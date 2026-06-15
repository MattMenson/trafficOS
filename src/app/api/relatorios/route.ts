import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/relatorios — lista relatórios do gestor
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const cliente_id = searchParams.get('cliente_id')

  // Busca IDs dos clientes do gestor primeiro
  const { data: clientes } = await supabase
    .from('clientes')
    .select('id')
    .eq('gestor_id', user.id)
  const clienteIds = (clientes || []).map((c: { id: string }) => c.id)

  let query = supabase
    .from('relatorios')
    .select(`
      id, titulo, periodo_inicio, periodo_fim,
      enviado_em, created_at,
      clientes (id, nome)
    `)
    .in('cliente_id', clienteIds)
    .order('created_at', { ascending: false })

  if (cliente_id) query = query.eq('cliente_id', cliente_id)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

// POST /api/relatorios — salva um relatório gerado
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await req.json()

  const { data, error } = await supabase
    .from('relatorios')
    .insert({
      cliente_id:     body.cliente_id,
      ad_account_id:  body.ad_account_id || null,
      titulo:         body.titulo,
      periodo_inicio: body.periodo_inicio,
      periodo_fim:    body.periodo_fim,
      dados_json:     body.dados_json || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

// PATCH /api/relatorios — marca como enviado
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { id } = await req.json()

  const { data, error } = await supabase
    .from('relatorios')
    .update({ enviado_em: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
