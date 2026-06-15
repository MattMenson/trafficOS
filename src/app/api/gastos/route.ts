import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/gastos
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const categoria  = searchParams.get('categoria')
  const cliente_id = searchParams.get('cliente_id')
  const mes        = searchParams.get('mes')
  const ano        = searchParams.get('ano')

  let query = supabase
    .from('gastos')
    .select(`*, clientes(id, nome)`)
    .eq('gestor_id', user.id)
    .order('data_gasto', { ascending: false })

  if (categoria)  query = query.eq('categoria', categoria)
  if (cliente_id) query = query.eq('cliente_id', cliente_id)
  if (mes)        query = query.gte('data_gasto', `${mes}-01`).lte('data_gasto', `${mes}-31`)
  if (ano)        query = query.gte('data_gasto', `${ano}-01-01`).lte('data_gasto', `${ano}-12-31`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/gastos
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await req.json()

  const { data, error } = await supabase
    .from('gastos')
    .insert({ ...body, gestor_id: user.id })
    .select(`*, clientes(id, nome)`)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
