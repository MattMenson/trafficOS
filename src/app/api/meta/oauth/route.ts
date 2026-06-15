import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/meta/oauth — gera a URL de autenticação do Facebook e redireciona
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const appId      = process.env.NEXT_PUBLIC_META_APP_ID!
  const redirectUri = process.env.NEXT_PUBLIC_META_REDIRECT_URI!

  // Permissões necessárias para gestão de tráfego
  const scopes = [
    'ads_read',
    'ads_management',
    'business_management',
    'read_insights',
    'pages_read_engagement',
    'pages_show_list',
  ].join(',')

  // State com user ID para validar no callback (evita CSRF)
  const state = Buffer.from(JSON.stringify({
    userId: user.id,
    ts:     Date.now(),
  })).toString('base64url')

  const authUrl = new URL('https://www.facebook.com/v20.0/dialog/oauth')
  authUrl.searchParams.set('client_id',     appId)
  authUrl.searchParams.set('redirect_uri',  redirectUri)
  authUrl.searchParams.set('scope',         scopes)
  authUrl.searchParams.set('state',         state)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('auth_type',     'rerequest') // força re-aprovação se já conectado

  return NextResponse.redirect(authUrl.toString())
}
