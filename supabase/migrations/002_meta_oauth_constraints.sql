-- ============================================================
-- Migration 002 — Constraints para upsert do OAuth Meta
-- Execute após a migration 001
-- ============================================================

-- Unique constraint para upsert do Business Manager por gestor
ALTER TABLE meta_business_managers
  ADD CONSTRAINT meta_bm_gestor_bmid_unique UNIQUE (gestor_id, bm_id);

-- Unique constraint para upsert de contas de anúncio por BM
ALTER TABLE meta_ad_accounts
  ADD CONSTRAINT meta_accounts_bm_accountid_unique UNIQUE (bm_id, account_id);

-- Index para busca de métricas por período (performance de relatórios)
CREATE INDEX IF NOT EXISTS idx_meta_metricas_periodo
  ON meta_metricas (ad_account_id, data_referencia DESC);

-- Garante que campanhas não duplicam por conta
ALTER TABLE meta_campanhas
  DROP CONSTRAINT IF EXISTS meta_campanhas_ad_account_id_campaign_id_key;

ALTER TABLE meta_campanhas
  ADD CONSTRAINT meta_campanhas_account_campaign_unique UNIQUE (ad_account_id, campaign_id);
