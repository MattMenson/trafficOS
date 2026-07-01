import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getBMInfo, getAdAccountsFromBM, MetaAPIException } from '@/lib/meta-api'

// ============================================================
// POST /api/meta/connect-manual
// Conecta um Business Manager colando o BM ID + um Access Token
// gerado manualmente (Business Settings → System Users → Generate Token).
// Alternativa ao fluxo OAuth (/api/meta/oauth) — não precisa de
// App ID, App Secret nem URI de redirect cadastrados no Meta for
// Developers. O único pré-requisito do lado da Meta é ter um app
// mínimo (sem App Review) vinculado ao Business Manager pra gerar
// o token do system user.
// ============================================================
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { bm_id, access_token } = await req.json().catch(() => ({}))

  if (!bm_id || !access_token) {
    return NextResponse.json(
      { error: 'Informe o ID do Business Manager e o Access Token' },
      { status: 400 }
    )
  }

  try {
    // Valida o token e o BM antes de salvar qualquer coisa
    const bmInfo = await getBMInfo(access_token, bm_id)

    const { data: bmRecord, error: bmError } = await supabase
      .from('meta_business_managers')
      .upsert(
        {
          gestor_id:       user.id,
          bm_id:           bm_id,
          nome:            bmInfo.name || `BM ${bm_id}`,
          access_token:    access_token,
          // Token manual (idealmente de system user) — sem data de
          // expiração conhecida. Se for um token de usuário comum
          // (60 dias), o cron vai sinalizar status "erro" quando expirar.
          token_expira_em: null,
          status:          'ativo',
        },
        { onConflict: 'gestor_id,bm_id' }
      )
      .select()
      .single()

    if (bmError || !bmRecord) {
      return NextResponse.json(
        { error: bmError?.message || 'Erro ao salvar Business Manager' },
        { status: 500 }
      )
    }

    // Busca e salva as contas de anúncio deste BM
    const adAccounts = await getAdAccountsFromBM(access_token, bm_id)

    for (const account of adAccounts) {
      await supabase
        .from('meta_ad_accounts')
        .upsert(
          {
            bm_id:      bmRecord.id,
            account_id: account.id,
            nome:       account.name,
            moeda:      account.currency || 'BRL',
            timezone:   account.timezone_name || 'America/Sao_Paulo',
            status:     account.account_status === 1 ? 'ativo' : 'inativo',
          },
          { onConflict: 'bm_id,account_id' }
        )
    }

    return NextResponse.json({
      ok:     true,
      bm:     bmRecord,
      contas: adAccounts.length,
    })
  } catch (err) {
    const msg = err instanceof MetaAPIException ? err.message : 'Erro ao validar token com a Meta'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
