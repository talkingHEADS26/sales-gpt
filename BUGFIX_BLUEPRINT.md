# Bugfix Blueprint — AbschlussIO Registration & Dashboard

Ursprünglich erstellt 2026-05-22. Aktualisiert mit tatsächlichen Root Causes und verifizierten Fixes nach vollständiger Analyse (Migration 001–047, alle relevanten API-Routes und Libs).

---

## Überblick: Tatsächliche Bugs (nach vollständiger Analyse)

| # | Bug | Tatsächlicher Root Cause | Status |
|---|-----|--------------------------|--------|
| 1 | E-Mail-Link → "requested path is invalid" | `NEXT_PUBLIC_SITE_URL` nicht in Vercel gesetzt + Supabase Redirect-Allowlist unvollständig | Fix: Env-Var + Supabase Dashboard |
| 2 | `on_auth_user_created` Trigger fehlt auf Remote | Trigger wurde in Migration 002 definiert aber ist auf der hosted Supabase-DB nicht aktiv | Fix: Trigger manuell anlegen |
| 3 | Kein Team-Dashboard sichtbar | Dashboard nutzt `seat_limit` nicht im JSX + Trigger-Bug verhindert Org-Anlage | Fix: Code + Trigger |
| 4 | `industry_key` falsch / fehlt | Trigger nicht aktiv → keine Org angelegt | Fix: Trigger anlegen |

> **Wichtig**: Die BUGFIX_BLUEPRINT.md v1 hatte falsche Root Causes. Migration 030 ist NICHT der finale Trigger. Der aktive Trigger stammt aus **Migration 047** (`047_require_manual_activation_for_basic_signup.sql`) und ist korrekt. Das eigentliche Problem war, dass der Trigger gar nicht als DB-Trigger registriert war.

---

## BUG 1: E-Mail-Bestätigungslink → "requested path is invalid"

### Symptom
Supabase-Bestätigungslink in der E-Mail führt zu:
```json
{"error":"requested path is invalid"}
```
URL-Muster: `https://<project>.supabase.co/auth/v1/verify?token=...&redirect_to=sales-gpt-eta.vercel.app`

### Root Cause
Zwei Ursachen gleichzeitig:

**A) `NEXT_PUBLIC_SITE_URL` fehlt in Vercel** → `getAuthRedirectBaseUrl()` in `lib/site-url.ts` fällt auf `OFFICIAL_PRODUCTION_APP_URL` zurück = `https://sales.diebestenberatungsagenturen.de`. Vercel nutzt aber die Preview-URL `sales-gpt-eta.vercel.app` als Default ohne Protokoll.

**B) Supabase hosted Projekt** (Authentication → URL Configuration) hat `https://sales.diebestenberatungsagenturen.de` nicht in der Redirect-Allowlist → Supabase lehnt den `redirect_to` Parameter ab.

### Fix

**Vercel** → Settings → Environment Variables:
```
NEXT_PUBLIC_SITE_URL=https://sales.diebestenberatungsagenturen.de
NEXT_PUBLIC_APP_URL=https://sales.diebestenberatungsagenturen.de
APP_BASE_URL=https://sales.diebestenberatungsagenturen.de
```

**Supabase Dashboard** → Authentication → URL Configuration:
- Site URL: `https://sales.diebestenberatungsagenturen.de`
- Redirect URLs hinzufügen:
  - `https://sales.diebestenberatungsagenturen.de/login?confirmed=1`
  - `https://sales.diebestenberatungsagenturen.de/reset-password`

### Code-Fix (bereits committed)
`lib/site-url.ts` — localhost nur in production blocken:
```typescript
// Vorher:
if (isLocalhostOrigin(normalizedUrl)) { ... return OFFICIAL_PRODUCTION_APP_URL; }

// Nachher:
if (isLocalhostOrigin(normalizedUrl) && process.env.NODE_ENV === "production") {
  return OFFICIAL_PRODUCTION_APP_URL;
}
```

---

## BUG 2: DB-Trigger `on_auth_user_created` fehlt auf Remote

### Symptom
Nach Registrierung hat der User in der DB:
- `profiles` → vorhanden (angelegt durch Supabase Auth intern oder Bootstrap)
- `organizations` → NULL
- `organization_members` → NULL
- `subscriptions` → NULL

Diagnose-Query:
```sql
SELECT
  u.email, u.id as user_id,
  om.organization_id, om.role_in_org,
  o.seat_limit, o.is_active,
  s.plan_key, s.status
FROM auth.users u
LEFT JOIN organization_members om ON om.user_id = u.id
LEFT JOIN organizations o ON o.id = om.organization_id
LEFT JOIN subscriptions s ON s.organization_id = om.organization_id
WHERE u.email = 'user@example.com';
```

Trigger-Existenz prüfen:
```sql
SELECT trigger_name, event_object_schema, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
-- Leeres Ergebnis = Trigger fehlt
```

### Root Cause
Migration 002 definiert den Trigger:
```sql
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();
```

Der Trigger ist auf der **hosted Supabase-DB nicht aktiv** obwohl `supabase db push` "Remote database is up to date" meldet. Die Function `handle_new_auth_user()` existiert, ist aber nicht als Trigger registriert.

### Fix — Trigger manuell anlegen (Supabase SQL Editor)
```sql
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user();
```

### Fix — Bestehende User ohne Org manuell reparieren
```sql
DO $$
DECLARE
  v_user_id uuid := '<user-uuid-hier>';  -- aus auth.users.id
  v_org_id uuid;
BEGIN
  INSERT INTO public.organizations (organization_name, seat_limit, industry_key, prompt_profile_key, is_active)
  VALUES ('Organisation Name', 3, 'fitness', 'fitness', true)
  RETURNING id INTO v_org_id;

  INSERT INTO public.organization_members (organization_id, user_id, role_in_org)
  VALUES (v_org_id, v_user_id, 'admin');

  INSERT INTO public.subscriptions (organization_id, plan_key, status)
  VALUES (v_org_id, 'team_3', 'active');

  UPDATE public.profiles SET role = 'org_admin' WHERE id = v_user_id;
END $$;
```
`organization_name`, `industry_key` und `plan_key` (`solo` / `team_3` / `team_5`) anpassen.

---

## BUG 3 & 4: Kein Team-Dashboard / industry_key falsch

### Root Cause
Beide Bugs haben dieselbe Ursache: **Trigger fehlt** (Bug 2). Ohne Trigger wird keine Org angelegt → kein Team-Dashboard, kein industry_key.

Nach Trigger-Fix (Bug 2) funktionieren beide automatisch.

### Zusatz: Dashboard-Button für Team-Verwaltung (Code-Fix bereits committed)
`app/dashboard/page.tsx` zeigt jetzt einen "Team verwalten"-Button wenn `seat_limit > 1 && role_in_org === 'admin'`.

Der Nav-Link in `components/internal-app-shell.tsx` war bereits vorhanden und funktioniert korrekt — zeigt nur für `team_3`/`team_5`/`enterprise` Plan.

### Wichtig: `/organization` nur für Team-Pläne
`/api/organization/overview` blockt mit 403 wenn `effectiveSeatLimit <= 1`:
- `solo` Plan → `seat_limit = 1` → kein Zugriff (by design)
- `team_3` Plan → `seat_limit = 3` → Zugriff erlaubt
- `team_5` Plan → `seat_limit = 5` → Zugriff erlaubt

---

## Trigger-Architektur (korrekte Version)

Der finale Trigger kommt aus **Migration 047** (`047_require_manual_activation_for_basic_signup.sql`):

| `registration_mode` | `is_active` | Org angelegt | Subscription |
|---------------------|-------------|--------------|--------------|
| `organization_signup` | `true` | ja | `plan_key`, `status='active'` |
| `basic` | `false` | nein | nein |
| `invitation_accept` | `true` | nein | nein |

Valide `industry_key` Werte: `fitness`, `finance`, `franchise`, `energy`

---

## Access Control Flow (verifiziert)

```
Login → /api/auth/access-status → requirePaidAppUser()
  → ensureOrgSignupAccessBootstrap() ← repariert fehlende Org-Daten beim ersten Login
  → profiles.is_active == false? → BLOCKED (account_inactive)
  → organizations.is_active == false? → BLOCKED (organization_inactive)
  → copecart_subscriptions.status == 'active' + paid_until > now()? → ALLOWED
  → subscriptions.plan_key == 'manual' + status == 'active'? → ALLOWED (legacy)
  → Org hat pending subscription ohne IPN? → ALLOWED (Fallback, Zeile 985)
  → ALLOW_ALL_SUBSCRIPTIONS == true? → ALLOWED (debug bypass)
  → sonst → BLOCKED
```

**Wichtig**: Org-Signup User ohne CopeCart IPN werden durch den Fallback (Zeile 985 in `lib/copecart-subscriptions.ts`) automatisch durchgelassen solange `copecart_subscriptions.status = 'pending'` und kein IPN-Event vorhanden ist.

---

## Relevante Dateien

| Datei | Warum relevant |
|-------|---------------|
| `lib/site-url.ts` | Bug 1: localhost in production blocken (Fix committed) |
| `supabase/migrations/047_require_manual_activation_for_basic_signup.sql` | Finaler aktiver Trigger (korrekt) |
| `supabase/migrations/002_rls_and_profile_bootstrap.sql` | Trigger-Registrierung (fehlt auf Remote) |
| `lib/copecart-subscriptions.ts` | Access Control, Bootstrap-Logik |
| `lib/organization-admin-server.ts` | `/organization` Auth — blockt solo Plan |
| `app/dashboard/page.tsx` | Bug 3: Team-Button (Fix committed) |
| `supabase/config.toml` | Lokale Auth Redirect-URLs (Fix committed) |

---

## Schnell-Checkliste für neue Instanz / frisches Deployment

1. **Vercel Env Vars** setzen: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_APP_URL`, `APP_BASE_URL` → alle auf `https://sales.diebestenberatungsagenturen.de`
2. **Supabase Dashboard** → Authentication → URL Configuration → Redirect URLs eintragen
3. **Trigger prüfen** (SQL Editor):
   ```sql
   SELECT trigger_name FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created';
   ```
   Falls leer → Trigger manuell anlegen (siehe Bug 2 Fix)
4. **Test-Registrierung** mit `team_3` oder `team_5` Plan durchführen
5. **Org-Daten verifizieren** nach Signup:
   ```sql
   SELECT u.email, om.role_in_org, o.seat_limit, o.industry_key, s.plan_key
   FROM auth.users u
   LEFT JOIN organization_members om ON om.user_id = u.id
   LEFT JOIN organizations o ON o.id = om.organization_id
   LEFT JOIN subscriptions s ON s.organization_id = om.organization_id
   WHERE u.email = 'test@example.com';
   ```
   Erwartet: `role_in_org='admin'`, `seat_limit=3`, `plan_key='team_3'`
