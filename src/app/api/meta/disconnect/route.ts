import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// DELETE /api/meta/disconnect — desconecta um BM e todas suas contas
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { bm_id } = await req.json()

  const { error } = await supabase
    .from('meta_business_managers')
    .delete()
    .eq('id', bm_id)
    .eq('gestor_id', user.id) // garante que é do gestor autenticado

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
