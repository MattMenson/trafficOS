import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/clientes — lista clientes do gestor autenticado
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status   = searchParams.get('status')
  const busca    = searchParams.get('busca')
  const segmento = searchParams.get('segmento')

  let query = supabase
    .from('clientes')
    .select(`
      *,
      contratos (id, valor_mensal, status, data_fim),
      pagamentos (id, valor, status, data_vencimento)
    `)
    .eq('gestor_id', user.id)
    .order('created_at', { ascending: false })

  if (status)   query = query.eq('status', status)
  if (segmento) query = query.eq('segmento', segmento)
  if (busca)    query = query.ilike('nome', `%${busca}%`)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/clientes — cria novo cliente
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await req.json()

  const { data, error } = await supabase
    .from('clientes')
    .insert({ ...body, gestor_id: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
