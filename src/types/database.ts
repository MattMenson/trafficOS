// ============================================================
// TrafficOS — Types do banco de dados (Supabase)
// ============================================================

export type StatusCliente = 'ativo' | 'pausado' | 'encerrado' | 'prospecto'
export type StatusContrato = 'ativo' | 'encerrado' | 'renovando'
export type TipoContrato = 'mensal' | 'trimestral' | 'anual' | 'avulso'
export type StatusPagamento = 'pendente' | 'pago' | 'atrasado' | 'cancelado'
export type CategoriaGasto = 'ferramentas' | 'freelancer' | 'imposto' | 'infraestrutura' | 'marketing' | 'outros'
export type StatusMeta = 'ativo' | 'inativo' | 'erro'
export type CategoriaIdeia = 'criativo' | 'audiencia' | 'estrategia' | 'orcamento' | 'produto' | 'outros'
export type StatusIdeia = 'rascunho' | 'em_avaliacao' | 'aprovado' | 'implementado' | 'descartado'
export type Prioridade = 'baixa' | 'media' | 'alta' | 'urgente'
export type TipoEntrega = 'relatorio' | 'criativo' | 'configuracao' | 'reuniao' | 'analise' | 'outros'
export type StatusEntrega = 'pendente' | 'em_andamento' | 'entregue' | 'atrasado' | 'cancelado'
export type StatusTarefa = 'a_fazer' | 'em_andamento' | 'concluido'
export type TipoAnotacao = 'nota' | 'reuniao' | 'ligacao' | 'email' | 'insight' | 'alerta'

// ============================================================
// ENTIDADES PRINCIPAIS
// ============================================================

export interface Profile {
  id: string
  nome: string
  email: string
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Cliente {
  id: string
  gestor_id: string
  nome: string
  email: string | null
  telefone: string | null
  segmento: string | null
  cnpj_cpf: string | null
  status: StatusCliente
  observacoes: string | null
  created_at: string
  updated_at: string
  // Relations (opcionais, carregados com joins)
  contratos?: Contrato[]
  pagamentos?: Pagamento[]
  meta_ad_accounts?: MetaAdAccount[]
  anotacoes?: Anotacao[]
  entregas?: Entrega[]
}

export interface Contrato {
  id: string
  cliente_id: string
  descricao: string
  valor_mensal: number
  data_inicio: string
  data_fim: string | null
  renovacao_auto: boolean
  tipo_contrato: TipoContrato
  status: StatusContrato
  arquivo_url: string | null
  created_at: string
  updated_at: string
  cliente?: Cliente
}

export interface Pagamento {
  id: string
  cliente_id: string
  contrato_id: string | null
  descricao: string
  valor: number
  data_vencimento: string
  data_pagamento: string | null
  status: StatusPagamento
  forma_pagamento: string | null
  comprovante_url: string | null
  created_at: string
  updated_at: string
  cliente?: Cliente
}

export interface Gasto {
  id: string
  gestor_id: string
  cliente_id: string | null
  descricao: string
  categoria: CategoriaGasto
  valor: number
  data_gasto: string
  recorrente: boolean
  comprovante_url: string | null
  created_at: string
  cliente?: Cliente
}

// ============================================================
// META / FACEBOOK
// ============================================================

export interface MetaBusinessManager {
  id: string
  gestor_id: string
  bm_id: string
  nome: string
  access_token: string
  token_expira_em: string | null
  status: StatusMeta
  created_at: string
  updated_at: string
  ad_accounts?: MetaAdAccount[]
}

export interface MetaAdAccount {
  id: string
  bm_id: string
  cliente_id: string | null
  account_id: string
  nome: string
  moeda: string
  timezone: string
  status: string
  created_at: string
  updated_at: string
  cliente?: Cliente
  bm?: MetaBusinessManager
}

export interface MetaMetrica {
  id: string
  ad_account_id: string
  data_referencia: string
  investimento: number
  impressoes: number
  alcance: number
  cliques: number
  ctr: number
  cpc: number
  cpm: number
  conversoes: number
  custo_conversao: number
  roas: number
  frequencia: number
  leads: number
  cpl: number
  sincronizado_em: string
}

export interface MetaCampanha {
  id: string
  ad_account_id: string
  campaign_id: string
  nome: string
  objetivo: string | null
  status: string | null
  budget_diario: number | null
  budget_total: number | null
  data_inicio: string | null
  data_fim: string | null
  sincronizado_em: string
}

// ============================================================
// OPERAÇÃO
// ============================================================

export interface Ideia {
  id: string
  cliente_id: string
  gestor_id: string
  titulo: string
  descricao: string | null
  categoria: CategoriaIdeia | null
  status: StatusIdeia
  prioridade: Prioridade
  created_at: string
  updated_at: string
  cliente?: Cliente
}

export interface Entrega {
  id: string
  cliente_id: string
  gestor_id: string
  titulo: string
  descricao: string | null
  tipo: TipoEntrega | null
  prazo: string | null
  data_entrega: string | null
  status: StatusEntrega
  arquivo_url: string | null
  created_at: string
  updated_at: string
  cliente?: Cliente
}

export interface Tarefa {
  id: string
  gestor_id: string
  cliente_id: string | null
  entrega_id: string | null
  titulo: string
  descricao: string | null
  status: StatusTarefa
  prioridade: Prioridade
  prazo: string | null
  created_at: string
  updated_at: string
  cliente?: Cliente
}

export interface Anotacao {
  id: string
  cliente_id: string
  gestor_id: string
  titulo: string | null
  conteudo: string
  tipo: TipoAnotacao
  created_at: string
  cliente?: Cliente
}

export interface Relatorio {
  id: string
  cliente_id: string
  ad_account_id: string | null
  titulo: string
  periodo_inicio: string
  periodo_fim: string
  dados_json: Record<string, unknown> | null
  pdf_url: string | null
  enviado_em: string | null
  created_at: string
  cliente?: Cliente
}

// ============================================================
// TYPES PARA DASHBOARD
// ============================================================

export interface DashboardMetrics {
  faturamento_mrr: number
  faturamento_recebido: number
  faturamento_pendente: number
  clientes_ativos: number
  clientes_total: number
  investimento_gerenciado: number
  margem_media: number
  tarefas_urgentes: number
  entregas_atrasadas: number
  contratos_vencendo: number
}

export interface FaturamentoPorCliente {
  cliente_id: string
  cliente_nome: string
  valor_mensal: number
  status: StatusCliente
}

export interface MetricasConsolidadas {
  investimento_total: number
  leads_total: number
  conversoes_total: number
  roas_medio: number
  cpl_medio: number
  ctr_medio: number
}
