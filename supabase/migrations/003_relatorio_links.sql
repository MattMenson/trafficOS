-- Migration 003: Tabela relatorio_links
-- Cria tabela para os links públicos de relatório gerados para os clientes
-- Execute este SQL no Supabase → SQL Editor

CREATE TABLE IF NOT EXISTS relatorio_links (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  gestor_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  gestor_nome  text,
  gestor_email text,
  cliente_id   uuid REFERENCES clientes(id) ON DELETE CASCADE,
  cliente_nome text NOT NULL,
  mes          text NOT NULL,           -- formato YYYY-MM
  titulo       text NOT NULL,
  token        text UNIQUE NOT NULL,    -- UUID aleatório para acesso público
  expira_em    timestamptz NOT NULL,
  acessos      integer DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);

-- Índice para busca rápida por token (acesso público)
CREATE INDEX IF NOT EXISTS idx_relatorio_links_token ON relatorio_links (token);

-- Índice para listar por gestor
CREATE INDEX IF NOT EXISTS idx_relatorio_links_gestor ON relatorio_links (gestor_id, created_at DESC);

-- RLS: apenas o gestor pode criar e ver seus links
ALTER TABLE relatorio_links ENABLE ROW LEVEL SECURITY;

-- Gestor pode inserir seus próprios links
CREATE POLICY "gestor_insert_links"
  ON relatorio_links FOR INSERT
  WITH CHECK (gestor_id = auth.uid());

-- Gestor pode ver seus próprios links
CREATE POLICY "gestor_select_links"
  ON relatorio_links FOR SELECT
  USING (gestor_id = auth.uid());

-- Gestor pode deletar seus próprios links
CREATE POLICY "gestor_delete_links"
  ON relatorio_links FOR DELETE
  USING (gestor_id = auth.uid());

-- NOTA: O acesso público (sem auth) é feito via service_role na API route,
-- portanto não é necessário uma policy pública — o service_role bypassa RLS.
