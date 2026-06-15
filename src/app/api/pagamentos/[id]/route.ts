import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PUT /api/pagamentos/[id]
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await req.json()
  const { id, created_at, clientes, ...updates } = body

  // Verifica que o pagamento pertence a um cliente do gestor autenticado
  const { data: pagamentoAtual } = await supabase
    .from('pagamentos')
    .select('cliente_id')
    .eq('id', params.id)
    .single()

  if (!pagamentoAtual) return NextResponse.json({ error: 'Pagamento não encontrado' }, { status: 404 })

  const { data: clienteAtual } = await supabase
    .from('clientes')
    .select('id')
    .eq('id', pagamentoAtual.cliente_id)
    .eq('gestor_id', user.id)
    .single()

  if (!clienteAtual) return NextResponse.json({ error: 'Pagamento não encontrado' }, { status: 404 })

  // Se o cliente_id está sendo alterado, valida que o novo cliente também pertence ao gestor
  if (updates.cliente_id && updates.cliente_id !== pagamentoAtual.cliente_id) {
    const { data: novoCliente } = await supabase
      .from('clientes')
      .select('id')
      .eq('id', updates.cliente_id)
      .eq('gestor_id', user.id)
      .single()

    if (!novoCliente) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('pagamentos')
    .update(updates)
    .eq('id', params.id)
    .select(`*, clientes(id, nome)`)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/pagamentos/[id]
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  // Verifica que o pagamento pertence a um cliente do gestor autenticado
  const { data: pagamentoAtual } = await supabase
    .from('pagamentos')
    .select('cliente_id')
    .eq('id', params.id)
    .single()

  if (!pagamentoAtual) return NextResponse.json({ error: 'Pagamento não encontrado' }, { status: 404 })

  const { data: clienteAtual } = await supabase
    .from('clientes')
    .select('id')
    .eq('id', pagamentoAtual.cliente_id)
    .eq('gestor_id', user.id)
    .single()

  if (!clienteAtual) return NextResponse.json({ error: 'Pagamento não encontrado' }, { status: 404 })

  const { error } = await supabase.from('pagamentos').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
