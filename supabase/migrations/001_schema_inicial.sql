-- ============================================================
-- TrafficOS — Schema inicial do banco de dados
-- Execute no SQL Editor do Supabase
-- ============================================================

-- Extensão para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PERFIS (gestores de tráfego)
-- ============================================================
CREATE TABLE profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome         TEXT NOT NULL,
  email        TEXT NOT NULL,
  avatar_url   TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CLIENTES
-- ============================================================
CREATE TABLE clientes (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gestor_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nome             TEXT NOT NULL,
  email            TEXT,
  telefone         TEXT,
  segmento         TEXT,
  cnpj_cpf         TEXT,
  status           TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','pausado','encerrado','prospecto')),
  observacoes      TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CONTRATOS
-- ============================================================
CREATE TABLE contratos (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id        UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  descricao         TEXT NOT NULL,
  valor_mensal      NUMERIC(12,2) NOT NULL,
  data_inicio       DATE NOT NULL,
  data_fim          DATE,
  renovacao_auto    BOOLEAN DEFAULT FALSE,
  tipo_contrato     TEXT DEFAULT 'mensal' CHECK (tipo_contrato IN ('mensal','trimestral','anual','avulso')),
  status            TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','encerrado','renovando')),
  arquivo_url       TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PAGAMENTOS (faturamento recebido do cliente)
-- ============================================================
CREATE TABLE pagamentos (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id       UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  contrato_id      UUID REFERENCES contratos(id),
  descricao        TEXT NOT NULL,
  valor            NUMERIC(12,2) NOT NULL,
  data_vencimento  DATE NOT NULL,
  data_pagamento   DATE,
  status           TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','pago','atrasado','cancelado')),
  forma_pagamento  TEXT,
  comprovante_url  TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- GASTOS OPERACIONAIS (custos do gestor)
-- ============================================================
CREATE TABLE gastos (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gestor_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cliente_id       UUID REFERENCES clientes(id),
  descricao        TEXT NOT NULL,
  categoria        TEXT NOT NULL CHECK (categoria IN ('ferramentas','freelancer','imposto','infraestrutura','marketing','outros')),
  valor            NUMERIC(12,2) NOT NULL,
  data_gasto       DATE NOT NULL,
  recorrente       BOOLEAN DEFAULT FALSE,
  comprovante_url  TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CONTAS META (Business Manager + Ad Accounts)
-- ============================================================
CREATE TABLE meta_business_managers (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gestor_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bm_id            TEXT NOT NULL,
  nome             TEXT NOT NULL,
  access_token     TEXT NOT NULL,
  token_expira_em  TIMESTAMPTZ,
  status           TEXT DEFAULT 'ativo' CHECK (status IN ('ativo','inativo','erro')),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE meta_ad_accounts (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bm_id            UUID NOT NULL REFERENCES meta_business_managers(id) ON DELETE CASCADE,
  cliente_id       UUID REFERENCES clientes(id),
  account_id       TEXT NOT NULL,
  nome             TEXT NOT NULL,
  moeda            TEXT DEFAULT 'BRL',
  timezone         TEXT DEFAULT 'America/Sao_Paulo',
  status           TEXT DEFAULT 'ativo',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CACHE DE MÉTRICAS META (sincronizado via API)
-- ============================================================
CREATE TABLE meta_metricas (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ad_account_id     UUID NOT NULL REFERENCES meta_ad_accounts(id) ON DELETE CASCADE,
  data_referencia   DATE NOT NULL,
  investimento      NUMERIC(14,2) DEFAULT 0,
  impressoes        BIGINT DEFAULT 0,
  alcance           BIGINT DEFAULT 0,
  cliques           BIGINT DEFAULT 0,
  ctr               NUMERIC(6,4) DEFAULT 0,
  cpc               NUMERIC(10,4) DEFAULT 0,
  cpm               NUMERIC(10,4) DEFAULT 0,
  conversoes        INTEGER DEFAULT 0,
  custo_conversao   NUMERIC(10,4) DEFAULT 0,
  roas              NUMERIC(8,4) DEFAULT 0,
  frequencia        NUMERIC(6,4) DEFAULT 0,
  leads             INTEGER DEFAULT 0,
  cpl               NUMERIC(10,4) DEFAULT 0,
  sincronizado_em   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ad_account_id, data_referencia)
);

-- ============================================================
-- CAMPANHAS (snapshot de campanhas ativas)
-- ============================================================
CREATE TABLE meta_campanhas (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ad_account_id    UUID NOT NULL REFERENCES meta_ad_accounts(id) ON DELETE CASCADE,
  campaign_id      TEXT NOT NULL,
  nome             TEXT NOT NULL,
  objetivo         TEXT,
  status           TEXT,
  budget_diario    NUMERIC(12,2),
  budget_total     NUMERIC(12,2),
  data_inicio      DATE,
  data_fim         DATE,
  sincronizado_em  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ad_account_id, campaign_id)
);

-- ============================================================
-- IDEIAS & ESTRATÉGIAS (por cliente)
-- ============================================================
CREATE TABLE ideias (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id       UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  gestor_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  titulo           TEXT NOT NULL,
  descricao        TEXT,
  categoria        TEXT CHECK (categoria IN ('criativo','audiencia','estrategia','orcamento','produto','outros')),
  status           TEXT DEFAULT 'rascunho' CHECK (status IN ('rascunho','em_avaliacao','aprovado','implementado','descartado')),
  prioridade       TEXT DEFAULT 'media' CHECK (prioridade IN ('baixa','media','alta','urgente')),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ENTREGAS (comprometimentos formais ao cliente)
-- ============================================================
CREATE TABLE entregas (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id       UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  gestor_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  titulo           TEXT NOT NULL,
  descricao        TEXT,
  tipo             TEXT CHECK (tipo IN ('relatorio','criativo','configuracao','reuniao','analise','outros')),
  prazo            DATE,
  data_entrega     DATE,
  status           TEXT DEFAULT 'pendente' CHECK (status IN ('pendente','em_andamento','entregue','atrasado','cancelado')),
  arquivo_url      TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TAREFAS (kanban operacional)
-- ============================================================
CREATE TABLE tarefas (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gestor_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cliente_id       UUID REFERENCES clientes(id),
  entrega_id       UUID REFERENCES entregas(id),
  titulo           TEXT NOT NULL,
  descricao        TEXT,
  status           TEXT DEFAULT 'a_fazer' CHECK (status IN ('a_fazer','em_andamento','concluido')),
  prioridade       TEXT DEFAULT 'media' CHECK (prioridade IN ('baixa','media','alta','urgente')),
  prazo            DATE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ANOTAÇÕES / PONTOS DE INFORMAÇÃO (histórico por cliente)
-- ============================================================
CREATE TABLE anotacoes (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id       UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  gestor_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  titulo           TEXT,
  conteudo         TEXT NOT NULL,
  tipo             TEXT DEFAULT 'nota' CHECK (tipo IN ('nota','reuniao','ligacao','email','insight','alerta')),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RELATÓRIOS GERADOS
-- ============================================================
CREATE TABLE relatorios (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id       UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  ad_account_id    UUID REFERENCES meta_ad_accounts(id),
  titulo           TEXT NOT NULL,
  periodo_inicio   DATE NOT NULL,
  periodo_fim      DATE NOT NULL,
  dados_json       JSONB,
  pdf_url          TEXT,
  enviado_em       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TRIGGERS: atualiza updated_at automaticamente
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at          BEFORE UPDATE ON profiles           FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_clientes_updated_at          BEFORE UPDATE ON clientes           FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_contratos_updated_at         BEFORE UPDATE ON contratos          FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_pagamentos_updated_at        BEFORE UPDATE ON pagamentos         FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_meta_bm_updated_at           BEFORE UPDATE ON meta_business_managers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_meta_accounts_updated_at     BEFORE UPDATE ON meta_ad_accounts   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_ideias_updated_at            BEFORE UPDATE ON ideias             FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_entregas_updated_at          BEFORE UPDATE ON entregas           FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_tarefas_updated_at           BEFORE UPDATE ON tarefas            FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY (RLS) — cada gestor só vê seus dados
-- ============================================================
ALTER TABLE profiles                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE contratos                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagamentos                ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_business_managers    ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_ad_accounts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_metricas             ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_campanhas            ENABLE ROW LEVEL SECURITY;
ALTER TABLE ideias                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE entregas                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarefas                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE anotacoes                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE relatorios                ENABLE ROW LEVEL SECURITY;

-- Profiles: usuário vê apenas o próprio perfil
CREATE POLICY "profiles_proprio" ON profiles FOR ALL USING (auth.uid() = id);

-- Clientes: gestor vê apenas seus clientes
CREATE POLICY "clientes_proprio_gestor" ON clientes FOR ALL USING (auth.uid() = gestor_id);

-- Contratos: via cliente do gestor
CREATE POLICY "contratos_via_cliente" ON contratos FOR ALL
  USING (cliente_id IN (SELECT id FROM clientes WHERE gestor_id = auth.uid()));

-- Pagamentos: via cliente do gestor
CREATE POLICY "pagamentos_via_cliente" ON pagamentos FOR ALL
  USING (cliente_id IN (SELECT id FROM clientes WHERE gestor_id = auth.uid()));

-- Gastos: do próprio gestor
CREATE POLICY "gastos_proprio_gestor" ON gastos FOR ALL USING (auth.uid() = gestor_id);

-- Meta BM: do próprio gestor
CREATE POLICY "meta_bm_proprio_gestor" ON meta_business_managers FOR ALL USING (auth.uid() = gestor_id);

-- Meta Ad Accounts: via BM do gestor
CREATE POLICY "meta_accounts_via_bm" ON meta_ad_accounts FOR ALL
  USING (bm_id IN (SELECT id FROM meta_business_managers WHERE gestor_id = auth.uid()));

-- Meta Métricas: via ad account do gestor
CREATE POLICY "meta_metricas_via_account" ON meta_metricas FOR ALL
  USING (ad_account_id IN (
    SELECT ma.id FROM meta_ad_accounts ma
    JOIN meta_business_managers bm ON bm.id = ma.bm_id
    WHERE bm.gestor_id = auth.uid()
  ));

-- Meta Campanhas: via ad account do gestor
CREATE POLICY "meta_campanhas_via_account" ON meta_campanhas FOR ALL
  USING (ad_account_id IN (
    SELECT ma.id FROM meta_ad_accounts ma
    JOIN meta_business_managers bm ON bm.id = ma.bm_id
    WHERE bm.gestor_id = auth.uid()
  ));

-- Ideias: do próprio gestor
CREATE POLICY "ideias_proprio_gestor" ON ideias FOR ALL USING (auth.uid() = gestor_id);

-- Entregas: do próprio gestor
CREATE POLICY "entregas_proprio_gestor" ON entregas FOR ALL USING (auth.uid() = gestor_id);

-- Tarefas: do próprio gestor
CREATE POLICY "tarefas_proprio_gestor" ON tarefas FOR ALL USING (auth.uid() = gestor_id);

-- Anotações: do próprio gestor
CREATE POLICY "anotacoes_proprio_gestor" ON anotacoes FOR ALL USING (auth.uid() = gestor_id);

-- Relatórios: via cliente do gestor
CREATE POLICY "relatorios_via_cliente" ON relatorios FOR ALL
  USING (cliente_id IN (SELECT id FROM clientes WHERE gestor_id = auth.uid()));

-- ============================================================
-- TRIGGER: cria perfil automaticamente ao criar usuário
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- ÍNDICES para performance
-- ============================================================
CREATE INDEX idx_clientes_gestor         ON clientes(gestor_id);
CREATE INDEX idx_contratos_cliente       ON contratos(cliente_id);
CREATE INDEX idx_pagamentos_cliente      ON pagamentos(cliente_id);
CREATE INDEX idx_pagamentos_status       ON pagamentos(status);
CREATE INDEX idx_gastos_gestor           ON gastos(gestor_id);
CREATE INDEX idx_meta_bm_gestor          ON meta_business_managers(gestor_id);
CREATE INDEX idx_meta_accounts_bm        ON meta_ad_accounts(bm_id);
CREATE INDEX idx_meta_metricas_account   ON meta_metricas(ad_account_id);
CREATE INDEX idx_meta_metricas_data      ON meta_metricas(data_referencia);
CREATE INDEX idx_ideias_cliente          ON ideias(cliente_id);
CREATE INDEX idx_entregas_cliente        ON entregas(cliente_id);
CREATE INDEX idx_tarefas_gestor          ON tarefas(gestor_id);
CREATE INDEX idx_anotacoes_cliente       ON anotacoes(cliente_id);
