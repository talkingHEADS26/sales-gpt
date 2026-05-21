# Handoff: Branchen-basierte Prompt-Architektur

**Stand:** 2026-05-17
**Commits:** `6f249dc` → `08c2123`
**Ziel:** Master Prompts werden aus der Datenbank geladen statt aus statischen TypeScript-Dateien.

---

## 1. Ausgangszustand (vor der Migration)

### Wie der Master Prompt bisher funktionierte

Der System-Prompt für jede Chat-Session wurde vollständig in TypeScript zusammengebaut. Einstiegspunkt ist `lib/chat-prompts.ts → getSystemPrompt()`.

Für `full_sales`-Sessions baute die Funktion den Prompt aus diesen Teilen zusammen (in dieser Reihenfolge, mit `\n\n` verbunden):

```
BASE_SHARED_PROMPT                          ← lib/prompts/base/shared.ts
industryConfig.blocks.shared               ← lib/prompts/industries/fitness.ts
BASE_FULL_SALES_PROMPT                     ← lib/prompts/base/full-sales.ts
industryConfig.blocks.fullSales            ← lib/prompts/industries/fitness.ts
buildFullSalesAvatarPrompt(avatarContext)   ← lib/full-sales-avatar.ts
```

`industryConfig` kam aus `getIndustryPromptConfig(industryKey)` in `lib/prompts/industries/index.ts`, das je nach `industryKey` eine statische TypeScript-Konfiguration zurückgab.

### Wo der industryKey herkommt

1. Pro Organisation wird in der Tabelle `organizations` ein `industry_key` gespeichert.
2. `getOrganizationIndustrySettings(supabase, organizationId)` → gibt `{ industryKey }` zurück.
3. Default: `"fitness"` (definiert in `lib/industries.ts → DEFAULT_INDUSTRY_KEY`).

---

## 2. Was wurde gebaut: `industry_prompts`-Tabelle

### Migration: `supabase/migrations/042_industry_prompts.sql`

```sql
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
```

- `industry_key` ist UNIQUE — eine Zeile pro Branche.
- `master_prompt` enthält den vollständigen Prompt-Text für `full_sales` dieser Branche.
- `avatar_config` ist ein JSONB-Feld für branchen-spezifische Avatar-Metadaten (Kontext, typische Einwände, Difficulty-Hinweise). Aktuell informativ, noch nicht in der Logik ausgewertet.
- `is_active = false` deaktiviert eine Zeile ohne sie zu löschen.

**RLS:** Authenticated Users können `SELECT` (nur `is_active = true`). Alle Schreibzugriffe laufen über den `service_role`-Client.

**Tabelle wurde manuell im Supabase Dashboard angelegt** (die Migration-Datei liegt im Repo, wurde aber nicht via Supabase CLI applied — direkt im SQL Editor ausgeführt).

### Aktueller Datensatz: `fitness`

```json
{
  "industry_key": "fitness",
  "industry_name": "Fitness & Gesundheitsstudios",
  "master_prompt": "<vollständiger Inhalt von lib/prompts/base/full-sales.ts>",
  "avatar_config": {
    "industry_context": "Fitnessclub, Gesundheitsstudio, Personal Training",
    "typical_concerns": ["Preis", "Zeit", "Motivation", "Erfahrung", "Vertragsbindung"],
    "differentiator_examples": ["spezifische Trainingsprogramme", "Betreuungsqualität", "Ergebnisse mit Referenzen"],
    "difficulty_hints": {
      "easy": "Interessent ist grundsätzlich offen und motiviert",
      "medium": "Interessent zögert wegen Preis oder Zeit",
      "hard": "Interessent ist skeptisch, hat schlechte Vorerfahrungen oder vergleicht aktiv"
    }
  }
}
```

---

## 3. Neue Chat-Logik: DB-Prompt-Ladung

### Wo: `app/api/chat/route.ts`

**Vor dem OpenAI-Call** wird für `full_sales`-Sessions ein DB-Lookup durchgeführt:

```typescript
let industryDbPrompt: string | null = null;
if (session.session_type === "full_sales") {
  const { data: industryPromptRow } = await supabase
    .from("industry_prompts")
    .select("master_prompt")
    .eq("industry_key", industryKey)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  if (industryPromptRow?.master_prompt) {
    industryDbPrompt = industryPromptRow.master_prompt;
  }
}

let resolvedSystemPrompt: string;
if (industryDbPrompt) {
  // DB-Prompt gefunden → als Basis verwenden + Avatar-Kontext anhängen
  const parts: string[] = [industryDbPrompt];
  if (fullSalesAvatarContext) {
    parts.push(buildFullSalesAvatarPrompt(fullSalesAvatarContext));
  }
  resolvedSystemPrompt = parts.join("\n\n");
} else {
  // Fallback → statischer getSystemPrompt() wie vorher
  resolvedSystemPrompt = getSystemPrompt({ ... });
}
```

### Was der DB-Prompt ersetzt

Wenn ein DB-Eintrag gefunden wird, ersetzt `master_prompt` diese statischen Teile:

```
BASE_SHARED_PROMPT + industry.shared + BASE_FULL_SALES_PROMPT + industry.fullSales
```

Der Avatar-Block (`buildFullSalesAvatarPrompt`) wird **weiterhin dynamisch** angehängt — er enthält die session-spezifischen Avatar-Daten und ändert sich pro Session.

Die dynamischen Ergänzungen (Bullshit-Bingo-Hinweis, Repetition-Hinweis, Differenzierungs-Hinweis) werden danach **wie gehabt** per String-Append auf `resolvedSystemPrompt` gesetzt.

### Wichtig: `supabase`-Client vs. `serviceRoleClient`

In `chat/route.ts` wird der **authenticated user client** (`supabase`) für den DB-Lookup verwendet — nicht der service_role-Client. Das funktioniert, weil die RLS-Policy `SELECT` für authenticated users erlaubt.

---

## 4. Neue Master Prompts einpflegen

### Neue Branche hinzufügen

**Schritt 1 — INSERT in `industry_prompts`:**

```sql
INSERT INTO industry_prompts (industry_key, industry_name, master_prompt, avatar_config)
VALUES (
  'physio',
  'Physiotherapie & Gesundheitspraxen',
  '<vollständiger Prompt-Text>',
  '{
    "industry_context": "...",
    "typical_concerns": [...],
    "difficulty_hints": {...}
  }'::jsonb
);
```

Oder via REST API mit service_role-Key:

```bash
curl -X POST "https://<project>.supabase.co/rest/v1/industry_prompts" \
  -H "apikey: <SERVICE_ROLE_KEY>" \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{ "industry_key": "physio", "industry_name": "...", "master_prompt": "...", "avatar_config": {} }'
```

**Schritt 2 — Kein Code-Change nötig**, da `app/api/chat/route.ts` den `industryKey` der Session dynamisch für den DB-Lookup verwendet.

### Bestehenden Prompt aktualisieren

```sql
UPDATE industry_prompts
SET master_prompt = '<neuer Text>', updated_at = now()
WHERE industry_key = 'fitness';
```

Kein Deployment erforderlich — die Änderung wirkt beim nächsten Chat-Request sofort.

### Prompt deaktivieren (Fallback auf statischen Prompt)

```sql
UPDATE industry_prompts SET is_active = false WHERE industry_key = 'fitness';
```

Der Code fällt dann automatisch auf `getSystemPrompt()` zurück.

---

## 5. Architektur-Übersicht (aktueller Stand)

```
Session-Start (app/api/sessions/start/route.ts)
  └── selectFullSalesAvatar()
        ├── Lädt last-10-History aus full_sales_avatar_snapshots (Negativ-Blocklist)
        ├── Filtert Kandidaten nach Geschlecht (PROBLEM 1 Fix)
        ├── Filtert Kandidaten nach Namen/Szenarien aus History (PROBLEM 2 Fix)
        └── Retry bei Alter±5/Geschlecht-Kollision (max 1 Retry)

Chat-Request (app/api/chat/route.ts)
  ├── Lädt Session + Avatar-Snapshot aus Supabase
  ├── Lädt industryKey aus Organisation
  ├── [NEU] Lädt master_prompt aus industry_prompts WHERE industry_key = ? AND is_active = true
  │     ├── Gefunden → master_prompt + buildFullSalesAvatarPrompt() = resolvedSystemPrompt
  │     └── Nicht gefunden → getSystemPrompt() (statischer Fallback)
  ├── Hängt dynamische Hinweise an (BullshitBingo, Repetition, Differenzierung)
  └── OpenAI-Call mit finalem systemMessage
```

---

## 6. Statische Fallback-Dateien (weiterhin vorhanden)

Diese Dateien sind noch aktiv und werden als Fallback verwendet:

| Datei | Inhalt |
|-------|--------|
| `lib/prompts/base/full-sales.ts` | `BASE_FULL_SALES_PROMPT` — identisch mit `master_prompt` in DB für `fitness` |
| `lib/prompts/base/shared.ts` | `BASE_SHARED_PROMPT` — allgemeine Regeln, im Fallback-Pfad vorangestellt |
| `lib/prompts/industries/fitness.ts` | Statische Industrie-Blöcke inkl. Avatar-Kandidaten für `openings.fullSales` |
| `lib/chat-prompts.ts` | `getSystemPrompt()` — Fallback-Funktion, baut Prompt aus statischen Teilen |

**Avatar-Kandidaten** (die `openings.fullSales`-Arrays in den industry-Dateien) werden **weiterhin aus TypeScript** geladen — sie sind nicht in der DB. Nur `master_prompt` kommt aus der DB.

---

## 7. Bekannte Einschränkungen und nächste Schritte

- `avatar_config` in `industry_prompts` wird geladen aber aktuell noch **nicht** in der Chat-Logik ausgewertet. Vorbereitet für spätere Nutzung.
- Nur `full_sales`-Sessions nutzen den DB-Prompt-Lookup. `appointment_setting` und `complaint_management` laufen noch vollständig über den statischen Fallback.
- Die `industry_prompts`-Tabelle ist zwar über die Supabase-Migration im Repo dokumentiert, wurde aber **manuell im SQL Editor** angelegt (kein Supabase CLI Apply).
- Supabase-Env-Vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — alle in `.env.local`.
