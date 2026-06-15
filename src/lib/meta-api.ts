// ============================================================
// TrafficOS — Integração com Meta Marketing API
// Documentação: https://developers.facebook.com/docs/marketing-api
// ============================================================

const META_API_BASE = 'https://graph.facebook.com/v20.0'

// ============================================================
// TIPOS DA META API
// ============================================================

export interface MetaAPIError {
  message: string
  type: string
  code: number
  fbtrace_id: string
}

export interface MetaInsight {
  date_start: string
  date_stop: string
  spend: string
  impressions: string
  reach: string
  clicks: string
  ctr: string
  cpc: string
  cpm: string
  actions?: Array<{ action_type: string; value: string }>
  cost_per_action_type?: Array<{ action_type: string; value: string }>
  frequency: string
  roas?: Array<{ action_type: string; value: string }>
}

export interface MetaAdAccount {
  id: string
  name: string
  currency: string
  timezone_name: string
  account_status: number
  amount_spent: string
  balance: string
}

export interface MetaCampaign {
  id: string
  name: string
  objective: string
  status: string
  daily_budget?: string
  lifetime_budget?: string
  start_time?: string
  stop_time?: string
}

// ============================================================
// FUNÇÕES PRINCIPAIS
// ============================================================

/**
 * Valida e retorna informações do Business Manager
 */
export async function getBMInfo(accessToken: string, bmId: string) {
  const url = new URL(`${META_API_BASE}/${bmId}`)
  url.searchParams.set('access_token', accessToken)
  url.searchParams.set('fields', 'id,name,timezone_id,created_time')

  const res = await fetch(url.toString())
  const data = await res.json()

  if (data.error) throw new MetaAPIException(data.error)
  return data
}

/**
 * Lista todas as contas de anúncio de um Business Manager
 */
export async function getAdAccountsFromBM(
  accessToken: string,
  bmId: string
): Promise<MetaAdAccount[]> {
  const url = new URL(`${META_API_BASE}/${bmId}/owned_ad_accounts`)
  url.searchParams.set('access_token', accessToken)
  url.searchParams.set('fields', 'id,name,currency,timezone_name,account_status,amount_spent,balance')
  url.searchParams.set('limit', '50')

  const res = await fetch(url.toString())
  const data = await res.json()

  if (data.error) throw new MetaAPIException(data.error)
  return data.data || []
}

/**
 * Busca campanhas de uma conta de anúncio
 */
export async function getCampaigns(
  accessToken: string,
  adAccountId: string
): Promise<MetaCampaign[]> {
  const accountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`
  const url = new URL(`${META_API_BASE}/${accountId}/campaigns`)
  url.searchParams.set('access_token', accessToken)
  url.searchParams.set('fields', 'id,name,objective,status,daily_budget,lifetime_budget,start_time,stop_time')
  url.searchParams.set('limit', '100')

  const res = await fetch(url.toString())
  const data = await res.json()

  if (data.error) throw new MetaAPIException(data.error)
  return data.data || []
}

/**
 * Busca insights de uma conta de anúncio por período
 */
export async function getAccountInsights(
  accessToken: string,
  adAccountId: string,
  dateStart: string,  // YYYY-MM-DD
  dateEnd: string     // YYYY-MM-DD
): Promise<MetaInsight[]> {
  const accountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`
  const url = new URL(`${META_API_BASE}/${accountId}/insights`)

  url.searchParams.set('access_token', accessToken)
  url.searchParams.set('level', 'account')
  url.searchParams.set('time_increment', '1') // breakdown por dia
  url.searchParams.set('time_range', JSON.stringify({ since: dateStart, until: dateEnd }))
  url.searchParams.set('fields', [
    'date_start',
    'date_stop',
    'spend',
    'impressions',
    'reach',
    'clicks',
    'ctr',
    'cpc',
    'cpm',
    'frequency',
    'actions',
    'cost_per_action_type',
  ].join(','))
  url.searchParams.set('limit', '90')

  const res = await fetch(url.toString())
  const data = await res.json()

  if (data.error) throw new MetaAPIException(data.error)
  return data.data || []
}

/**
 * Busca insights do mês atual de uma conta
 */
export async function getMonthInsights(
  accessToken: string,
  adAccountId: string
): Promise<MetaInsight[]> {
  const now = new Date()
  const dateStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString().split('T')[0]
  const dateEnd = now.toISOString().split('T')[0]

  return getAccountInsights(accessToken, adAccountId, dateStart, dateEnd)
}

// ============================================================
// HELPERS DE PARSING
// ============================================================

/**
 * Extrai valor de uma action específica dos insights
 */
export function getActionValue(
  insight: MetaInsight,
  actionType: string
): number {
  const action = insight.actions?.find(a => a.action_type === actionType)
  return action ? parseFloat(action.value) : 0
}

/**
 * Converte insights da API para o formato do banco
 */
export function parseInsightToMetrica(
  adAccountId: string,
  insight: MetaInsight
) {
  const leads = getActionValue(insight, 'lead') || getActionValue(insight, 'onsite_conversion.lead_grouped')
  const conversoes = getActionValue(insight, 'purchase') || getActionValue(insight, 'complete_registration') || leads
  const investimento = parseFloat(insight.spend || '0')

  return {
    ad_account_id: adAccountId,
    data_referencia: insight.date_start,
    investimento,
    impressoes: parseInt(insight.impressions || '0'),
    alcance: parseInt(insight.reach || '0'),
    cliques: parseInt(insight.clicks || '0'),
    ctr: parseFloat(insight.ctr || '0'),
    cpc: parseFloat(insight.cpc || '0'),
    cpm: parseFloat(insight.cpm || '0'),
    frequencia: parseFloat(insight.frequency || '0'),
    leads,
    cpl: leads > 0 ? investimento / leads : 0,
    conversoes,
    custo_conversao: conversoes > 0 ? investimento / conversoes : 0,
    roas: 0, // ROAS requer pixel configurado — calcular separadamente
    sincronizado_em: new Date().toISOString(),
  }
}

// ============================================================
// ERRO CUSTOMIZADO
// ============================================================

export class MetaAPIException extends Error {
  code: number
  type: string
  fbtrace_id: string

  constructor(error: MetaAPIError) {
    super(error.message)
    this.name = 'MetaAPIException'
    this.code = error.code
    this.type = error.type
    this.fbtrace_id = error.fbtrace_id
  }
}
