-- ============================================================
-- Table : workflow_rules
-- Stocke les règles d'automatisation configurables depuis le CRM
-- À exécuter dans Supabase > SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.workflow_rules (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nom         TEXT        NOT NULL,
  description TEXT        NOT NULL DEFAULT '',
  etape_source TEXT       NOT NULL,
  etape_cible  TEXT       NOT NULL,
  condition   TEXT        DEFAULT NULL,  -- 'voie_judiciaire' | 'voie_amiable' | NULL
  actif       BOOLEAN     NOT NULL DEFAULT true,
  actions     JSONB       NOT NULL DEFAULT '[]'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Mise à jour automatique du champ updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workflow_rules_updated_at
  BEFORE UPDATE ON public.workflow_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS : même politique permissive que les autres tables du projet
ALTER TABLE public.workflow_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON public.workflow_rules FOR ALL USING (true);
