ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS franchise_vertical text;

UPDATE organizations
SET franchise_vertical = 'other'
WHERE franchise_vertical IS NULL;

ALTER TABLE organizations
ALTER COLUMN franchise_vertical SET DEFAULT 'other';

ALTER TABLE organizations
DROP CONSTRAINT IF EXISTS organizations_franchise_vertical_check;

ALTER TABLE organizations
ADD CONSTRAINT organizations_franchise_vertical_check
CHECK (franchise_vertical IN ('restaurant', 'fashion', 'fitness', 'beauty', 'retail', 'services', 'other'));
