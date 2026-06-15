import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/pagamentos
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status     = searchParams.get('status')
  const cliente_id = searchParams.get('cliente_id')
  const mes        = searchParams.get('mes')   // YYYY-MM
  const ano        = searchParams.get('ano')   // YYYY

  // Busca IDs dos clientes do gestor primeiro
  const { data: clientes } = await supabase
    .from('clientes')
    .select('id')
    .eq('gestor_id', user.id)
  const clienteIds = (clientes || []).map((c: { id: string }) => c.id)

  let query = supabase
    .from('pagamentos')
    .select(`*, clientes(id, nome, segmento)`)
    .in('cliente_id', clienteIds)
    .order('data_vencimento', { ascending: false })

  if (status)     query = query.eq('status', status)
  if (cliente_id) query = query.eq('cliente_id', cliente_id)
  if (mes)        query = query.gte('data_vencimento', `${mes}-01`).lte('data_vencimento', `${mes}-31`)
  if (ano)        query = query.gte('data_vencimento', `${ano}-01-01`).lte('data_vencimento', `${ano}-12-31`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/pagamentos
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await req.json()

  // Verifica que o cliente pertence ao gestor
  const { data: cliente } = await supabase
    .from('clientes')
    .select('id')
    .eq('id', body.cliente_id)
    .eq('gestor_id', user.id)
    .single()

  if (!cliente) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })

  const { data, error } = await supabase
    .from('pagamentos')
    .insert(body)
    .select(`*, clientes(id, nome)`)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
