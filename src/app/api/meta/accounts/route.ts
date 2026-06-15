import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/meta/accounts — lista BMs e contas de anúncio do gestor
export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: bms, error } = await supabase
    .from('meta_business_managers')
    .select(`
      id, bm_id, nome, status, token_expira_em, created_at,
      meta_ad_accounts (
        id, account_id, nome, moeda, timezone, status, cliente_id,
        clientes (id, nome)
      )
    `)
    .eq('gestor_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(bms || [])
}

// PATCH /api/meta/accounts — vincula uma conta de anúncio a um cliente
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { account_id, cliente_id } = await req.json()

  const { data, error } = await supabase
    .from('meta_ad_accounts')
    .update({ cliente_id: cliente_id || null })
    .eq('id', account_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
