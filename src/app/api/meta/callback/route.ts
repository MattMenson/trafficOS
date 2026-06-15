import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getBMInfo, getAdAccountsFromBM } from '@/lib/meta-api'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// GET /api/meta/callback — Facebook redireciona aqui após autorização
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code  = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // Usuário recusou as permissões
  if (error) {
    return NextResponse.redirect(`${APP_URL}/meta?error=permission_denied`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${APP_URL}/meta?error=invalid_callback`)
  }

  // Valida o state e extrai o userId
  let userId: string
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString())
    userId = decoded.userId
    // Rejeita states com mais de 10 minutos
    if (Date.now() - decoded.ts > 10 * 60 * 1000) throw new Error('State expirado')
  } catch {
    return NextResponse.redirect(`${APP_URL}/meta?error=invalid_state`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.id !== userId) {
    return NextResponse.redirect(`${APP_URL}/meta?error=unauthorized`)
  }

  try {
    // 1. Troca o code por um short-lived token
    const tokenRes = await fetch('https://graph.facebook.com/v20.0/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id:     process.env.NEXT_PUBLIC_META_APP_ID,
        client_secret: process.env.META_APP_SECRET,
        redirect_uri:  process.env.NEXT_PUBLIC_META_REDIRECT_URI,
        code,
      }),
    })
    const tokenData = await tokenRes.json()

    if (tokenData.error) {
      console.error('Meta token error:', tokenData.error)
      return NextResponse.redirect(`${APP_URL}/meta?error=token_exchange_failed`)
    }

    const shortToken: string = tokenData.access_token

    // 2. Troca pelo long-lived token (válido por 60 dias)
    const longTokenUrl = new URL('https://graph.facebook.com/v20.0/oauth/access_token')
    longTokenUrl.searchParams.set('grant_type',        'fb_exchange_token')
    longTokenUrl.searchParams.set('client_id',         process.env.NEXT_PUBLIC_META_APP_ID!)
    longTokenUrl.searchParams.set('client_secret',     process.env.META_APP_SECRET!)
    longTokenUrl.searchParams.set('fb_exchange_token', shortToken)

    const longTokenRes  = await fetch(longTokenUrl.toString())
    const longTokenData = await longTokenRes.json()

    const accessToken: string  = longTokenData.access_token || shortToken
    const expiresIn: number    = longTokenData.expires_in || 5183944 // ~60 dias default
    const tokenExpiraEm        = new Date(Date.now() + expiresIn * 1000).toISOString()

    // 3. Busca os Business Managers do usuário
    const bmListUrl = new URL('https://graph.facebook.com/v20.0/me/businesses')
    bmListUrl.searchParams.set('access_token', accessToken)
    bmListUrl.searchParams.set('fields', 'id,name,created_time,timezone_id')
    bmListUrl.searchParams.set('limit', '10')

    const bmListRes  = await fetch(bmListUrl.toString())
    const bmListData = await bmListRes.json()
    const businesses: Array<{ id: string; name: string }> = bmListData.data || []

    // 4. Salva cada BM e descobre as contas de anúncio automaticamente
    for (const bm of businesses) {
      // Upsert do Business Manager
      const { data: bmRecord } = await supabase
        .from('meta_business_managers')
        .upsert(
          {
            gestor_id:       user.id,
            bm_id:           bm.id,
            nome:            bm.name,
            access_token:    accessToken,
            token_expira_em: tokenExpiraEm,
            status:          'ativo',
          },
          { onConflict: 'gestor_id,bm_id' }
        )
        .select()
        .single()

      if (!bmRecord) continue

      // Busca contas de anúncio deste BM
      try {
        const adAccounts = await getAdAccountsFromBM(accessToken, bm.id)

        for (const account of adAccounts) {
          const accountId = account.id.replace('act_', '')
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
      } catch (e) {
        console.warn(`Erro ao buscar contas do BM ${bm.id}:`, e)
      }
    }

    // 5. Se não tem BM mas tem contas diretas (ad accounts pessoais)
    if (businesses.length === 0) {
      const personalAccountsUrl = new URL('https://graph.facebook.com/v20.0/me/adaccounts')
      personalAccountsUrl.searchParams.set('access_token', accessToken)
      personalAccountsUrl.searchParams.set('fields', 'id,name,currency,timezone_name,account_status')

      const personalRes  = await fetch(personalAccountsUrl.toString())
      const personalData = await personalRes.json()

      if (personalData.data?.length > 0) {
        // Cria um BM "pessoal" como placeholder
        const { data: personalBM } = await supabase
          .from('meta_business_managers')
          .upsert(
            {
              gestor_id:       user.id,
              bm_id:           `personal_${user.id}`,
              nome:            'Conta pessoal (sem BM)',
              access_token:    accessToken,
              token_expira_em: tokenExpiraEm,
              status:          'ativo',
            },
            { onConflict: 'gestor_id,bm_id' }
          )
          .select()
          .single()

        if (personalBM) {
          for (const acc of personalData.data) {
            await supabase
              .from('meta_ad_accounts')
              .upsert(
                {
                  bm_id:      personalBM.id,
                  account_id: acc.id,
                  nome:       acc.name,
                  moeda:      acc.currency || 'BRL',
                  timezone:   acc.timezone_name || 'America/Sao_Paulo',
                  status:     acc.account_status === 1 ? 'ativo' : 'inativo',
                },
                { onConflict: 'bm_id,account_id' }
              )
          }
        }
      }
    }

    // Redireciona para a página de contas com sucesso
    return NextResponse.redirect(`${APP_URL}/meta?success=connected`)

  } catch (err) {
    console.error('Erro no callback Meta:', err)
    return NextResponse.redirect(`${APP_URL}/meta?error=unexpected`)
  }
}
