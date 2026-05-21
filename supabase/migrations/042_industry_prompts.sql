-- Industry-specific prompt configuration table.
-- Stores master prompts, avatar configs, and metadata per industry key.
-- Readable by authenticated users, writable only by service_role.

CREATE TABLE IF NOT EXISTS industry_prompts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  industry_key text UNIQUE NOT NULL,
  industry_name text NOT NULL,
  master_prompt text NOT NULL,
  avatar_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_industry_prompts_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_industry_prompts_updated_at
  BEFORE UPDATE ON industry_prompts
  FOR EACH ROW EXECUTE FUNCTION update_industry_prompts_updated_at();

-- RLS
ALTER TABLE industry_prompts ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read active rows
CREATE POLICY "authenticated users can read industry_prompts"
  ON industry_prompts
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- service_role bypasses RLS by default — no explicit write policy needed.
-- All INSERT / UPDATE / DELETE must go through the service role client.
