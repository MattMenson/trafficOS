import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/clientes/[id] — detalhe completo do cliente
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data, error } = await supabase
    .from('clientes')
    .select(`
      *,
      contratos (*),
      pagamentos (*),
      ideias (*),
      entregas (*),
      anotacoes (*),
      meta_ad_accounts (*, meta_business_managers(nome))
    `)
    .eq('id', params.id)
    .eq('gestor_id', user.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

// PUT /api/clientes/[id] — atualiza cliente
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await req.json()
  const { id, gestor_id, created_at, ...updates } = body

  const { data, error } = await supabase
    .from('clientes')
    .update(updates)
    .eq('id', params.id)
    .eq('gestor_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/clientes/[id] — remove cliente
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { error } = await supabase
    .from('clientes')
    .delete()
    .eq('id', params.id)
    .eq('gestor_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
