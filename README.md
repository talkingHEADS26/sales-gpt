# AbschlussIO (th-gpt-neu)

AbschlussIO ist eine Next.js- und Supabase-basierte Trainingsplattform für vertriebsnahe Gesprächssimulationen mit KI-Feedback, KPI-Auswertung sowie Team-/Organisationsverwaltung.

## Tech-Stack

- Next.js `16.2.4` (App Router)
- React `19.2.4`
- TypeScript
- Tailwind CSS `4`
- Supabase (Auth, Postgres, RLS)
- OpenAI Node SDK (`openai`)
- Remotion (Video-Assets/Rendering)

## UI Design System (talkingHEADS)

- Hauptfarbe: `#0E51A0`
- CTA/Akzent: `#EA9413`
- Sekundärtext: `#707070`
- Headlines: `Rubik`
- Fließtext/UI-Text: `Roboto`
- Stil: heller Premium-Look (kein Dark-Only), klare Cards, kurze Conversion-Flows
- CTA-Stil: orange Verlauf + dezenter plastischer Schatten statt flachem Standardbutton

## Kernfunktionen

- KI-gestützte Chat-Sessions mit mehreren Trainingsmodi:
  - `full_sales`
  - `appointment_setting`
  - `complaint_management`
  - `situation_coaching`
- Sprachtranskription via API
- KPI-Snapshots und Dashboard-Aggregation
- Organisations- und Teamverwaltung (Seats, Einladungen, Mitgliederstatus)
- Admin-Bereich für Übersicht, User/Org-Management und Session-Cleanup
- CopeCart-Webhook-Integration für Subscription-/Zugriffslogik
- Reminder- und Wartungs-Cronjobs

## Projektstruktur

```text
.
├── app/                              # Next.js App Router (Pages + API)
│   ├── api/
│   │   ├── admin/                    # Master-Admin Endpunkte
│   │   ├── auth/                     # Auth-nahe Endpunkte
│   │   ├── chat/                     # KI-Chat Endpoint
│   │   ├── copecart/ipn/             # CopeCart Webhook
│   │   ├── cron/                     # Cron-Endpunkte
│   │   ├── dashboard/                # KPI API
│   │   ├── organization/             # Org-Admin Endpunkte
│   │   ├── sessions/                 # Session-Start/Resume
│   │   ├── transcribe/               # Audio-Transkription
│   │   └── usage/                    # Usage-Summary
│   ├── admin/                        # Admin UI
│   ├── chat/[sessionId]/             # Chat-UI
│   ├── dashboard/                    # User Dashboard
│   ├── organization/                 # Organisationsverwaltung UI
│   └── ...                           # Landing, Login, Register, FAQ, Legal etc.
├── components/                       # Wiederverwendbare UI-Komponenten
├── lib/                              # Domänenlogik, Auth, KPI, Billing, Prompts
│   ├── prompts/
│   │   ├── base/
│   │   └── industries/
│   └── email/
├── supabase/
│   ├── migrations/                   # SQL-Migrationen
│   └── templates/
├── src/remotion/                     # Remotion-Kompositionen
├── public/                           # Statische Assets
├── schema.sql                        # Vollständiges DB-Schema (Dump)
├── data.sql                          # Seed-/Datenstand
└── AGENTS.md                         # Agenten-/Arbeitsinstruktionen
```

## Wichtige Domänenmodule (`lib/`)

- `auth-server.ts`: JWT-basierte User-Authentifizierung für API-Routen
- `organization-admin-server.ts`: Berechtigungsprüfung für Org-Admin-Zugriffe
- `chat-session.ts`: Session-Konventionen (z. B. Full-Chat-Titel, Completion-Heuristiken)
- `dashboard-kpis.ts`: KPI-Aggregation für Dashboard-Karten und Trends
- `usage-limits.ts`: Nutzungslimits (monatliche Sessions, Audio je Session)
- `copecart-subscriptions.ts`: Subscription-State, IPN-Verarbeitung, Access-State
- `auth-signup.ts`: Signup-/Confirmation-/Provisioning-Flows
- `system-monitoring.ts`: Event-Logging und Alerting-Pfade

## Datenmodell (Supabase)

Wichtige Tabellen:

- Identität/Organisation:
  - `profiles`
  - `organizations`
  - `organization_members`
  - `invitations`
- Training/Chat:
  - `chat_sessions`
  - `chat_messages`
  - `full_sales_avatar_snapshots`
  - `full_sales_kpi_snapshots`
  - `appointment_setting_avatar_snapshots`
  - `appointment_setting_kpi_snapshots`
  - `complaint_management_avatar_snapshots`
  - `complaint_management_kpi_snapshots`
- Billing/Access:
  - `copecart_ipn_events`
  - `copecart_subscriptions`
  - `subscriptions` (Legacy/Ergänzung)
- Betrieb:
  - `system_event_log`
  - `training_reminder_email_log`

### RLS und Sicherheit

- Row Level Security ist auf zentralen Tabellen aktiv.
- Nutzer lesen/schreiben primär eigene Datensätze (`auth.uid()`-Policies).
- Org-bezogene Tabellen nutzen membership-basierte Policies.
- Service-Role-Operationen erfolgen ausschließlich serverseitig in API-/Lib-Code.

## Session- und Trainingsfluss (vereinfacht)

1. Authentifizierter User startet Session über `/api/sessions/start`.
2. Backend prüft Access-State und Session-Limits.
3. Session wird angelegt, Kontext/Avatar-Snapshot geladen oder erzeugt.
4. Chat läuft über `/api/chat` (Systemprompt + Verlauf + AI-Antwort).
5. KPI-Parser extrahieren Kennzahlen aus Assistant-Antworten.
6. Bei Abschluss werden Sessionstatus und KPI-Snapshots finalisiert.
7. Dashboard lädt Aggregation über `/api/dashboard/kpis`.

## Lokale Entwicklung

### Voraussetzungen

- Node.js `>= 20`
- npm
- Supabase-Projekt mit passenden Tabellen/Funktionen
- OpenAI API-Key

### Installation

```bash
npm install
```

### Entwicklungsserver starten

```bash
npm run dev
```

### Build und Start

```bash
npm run build
npm run start
```

### Lint

```bash
npm run lint
```

## Umgebungsvariablen

Mindestens erforderlich:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
```

Je nach genutzten Features zusätzlich:

```bash
# Cron / Jobs
TRAINING_REMINDER_CRON_SECRET=
COPECART_CRON_SECRET=

# CopeCart IPN Security
COPECART_IPN_SECRET=

# Access-/Subscription-Verhalten (nur bewusst nutzen)
ALLOW_ALL_SUBSCRIPTIONS=
COPECART_CANCEL_BLOCKS_IMMEDIATELY=

# Mail/Resend (falls Mailversand aktiv)
RESEND_API_KEY=
MAIL_FROM=
```

Hinweis: Eine Beispielkonfiguration ist in `.env.example` enthalten. Für lokale Entwicklung wird üblicherweise `.env.local` genutzt.

## Remotion

Verfügbare Skripte:

```bash
npm run remotion:studio
npm run remotion:render
npm run remotion:still
```

Quellpfad: `src/remotion/index.ts`

## Wichtige API-Bereiche

- `app/api/auth/*`: Signup, Confirmation, Access-Status
- `app/api/sessions/*`: Session öffnen/starten
- `app/api/chat/route.ts`: Haupt-Chatendpoint
- `app/api/transcribe/route.ts`: Audio-Transkription
- `app/api/dashboard/kpis/route.ts`: KPI-Dashboarddaten
- `app/api/organization/*`: Team-/Invite-Verwaltung
- `app/api/admin/*`: Plattform-Administration
- `app/api/copecart/ipn/route.ts`: Billing-Webhook
- `app/api/cron/*`: automatisierte Wartungsjobs

## Hinweise für Mitwirkende

- Projekt nutzt neuere Next.js-Version (`16.x`) mit potenziell abweichenden Konventionen.
- Bitte vor tiefen Framework-Änderungen `AGENTS.md` prüfen.
- DB-Änderungen sauber über `supabase/migrations/` abbilden.


## Troubleshooting

### 1) `Supabase konnte nicht initialisiert werden` / fehlende Env-Fehler

Typische Ursache:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` oder `SUPABASE_SERVICE_ROLE_KEY` fehlt bzw. ist leer.

Prüfen:
- `.env.local` vorhanden und korrekt gesetzt
- Entwicklungsserver nach Env-Änderung neu starten

### 2) `Nicht autorisiert` (401) in API-Requests

Typische Ursache:
- Fehlender oder abgelaufener Bearer-Token.
- Session im Browser nicht mehr gültig.

Prüfen:
- Erneut einloggen
- In Client-Requests `Authorization: Bearer <access_token>` gesetzt

### 3) Zugriff verweigert (403) trotz Login

Typische Ursache:
- Account `is_active = false`
- Organisation deaktiviert
- Subscription-/Access-State nicht aktiv (nur wenn bereits ein Abo existiert)

Prüfen:
- `profiles.is_active`
- `organizations.is_active`
- Eintrag in `copecart_subscriptions` und dessen `subscription_status`
- Hinweis: Ein fehlender CopeCart-Eintrag blockiert neue Registrierungen aktuell nicht mehr.

### 4) Chat/API läuft, aber KI-Antwort bleibt aus

Typische Ursache:
- `OPENAI_API_KEY` fehlt/ungültig
- API-Limit oder temporärer Provider-Fehler

Prüfen:
- Key in `.env.local`
- Server-Logs für Fehlermeldungen aus `app/api/chat/route.ts`

### 5) Audio-Transkription schlägt fehl

Typische Ursache:
- Kein/ungültiges Audio-File im `multipart/form-data`
- Session nicht gültig oder Audio-Limit erreicht

Prüfen:
- Request enthält `audio`, `sessionId`, optional `audioDurationSeconds`
- `MAX_AUDIO_SECONDS_PER_SESSION` und Sessionstatus

### 6) Session-Start wird blockiert (Limit erreicht)

Typische Ursache:
- Monatliches Session-Limit erreicht.

Details:
- Standardlimit ist aktuell `50` Sessions/Monat (UTC-basiert).

Prüfen:
- `lib/usage-limits.ts`
- Funktion `create_chat_session_with_monthly_limit` im DB-Schema

### 7) Invite-/Org-Admin-Endpunkte liefern Berechtigungsfehler

Typische Ursache:
- Nutzer ist kein Org-Admin oder hat keinen gültigen Org-Kontext.

Prüfen:
- `organization_members.role_in_org` (`admin`)
- Membership vorhanden und Organization aktiv

### 8) CopeCart-IPN kommt an, aber Access ändert sich nicht

Typische Ursache:
- IPN-Secret falsch oder Event wird als Duplikat/ignored verarbeitet.

Prüfen:
- `COPECART_IPN_SECRET`
- Tabelle `copecart_ipn_events` (processing_status, payload)
- Zuordnung `order_id`/`customer_email` zu User/Organization

### 9) Cronjob-Endpunkte antworten mit Unauthorized

Typische Ursache:
- Fehlender/inkorrekter Cron-Secret im Header, Bearer oder Query.

Prüfen:
- `TRAINING_REMINDER_CRON_SECRET` / `COPECART_CRON_SECRET`
- Request-Format analog Implementierung in `app/api/cron/*`

### 10) Schema-/RLS-bedingte Query-Probleme

Typische Ursache:
- Migrationen nicht auf aktuellem Stand
- RLS-Policy erlaubt die Operation nicht

Prüfen:
- Migrationen in `supabase/migrations/` anwenden
- Policies in `schema.sql` gegen tatsächlichen Use Case prüfen


## Flow-Informationen

### 1) Auth & Access

1. Browser-Login läuft über Supabase Auth.
2. API-Routen validieren Bearer-Token über `lib/auth-server.ts`.
3. Org-Admin-Endpunkte prüfen zusätzlich Rolle, Membership, Org-Status und Access-State in `lib/organization-admin-server.ts`.
4. Supabase RLS schützt Datenzugriffe zusätzlich auf Tabellenebene (`auth.uid()`-Policies).

### 2) Session-Start

1. Client ruft `POST /api/sessions/start` auf.
2. Backend validiert `sessionType` und Modusparameter.
3. Access-State und Monatslimit werden geprüft.
4. Session wird erstellt (DB-Funktion mit Limitlogik).
5. Avatar-/Prompt-Kontext wird geladen/erzeugt.
6. Session startet mit Welcome-Message.

### 3) Chat & KI

1. Client sendet Nachricht an `POST /api/chat`.
2. Backend lädt Session + Chatverlauf.
3. Systemprompt wird je Modus/Industry aufgebaut.
4. OpenAI generiert Antwort.
5. Antwort + KPI-Updates werden gespeichert.
6. Completion-Heuristiken setzen Session ggf. auf `completed`.

### 4) KPI & Dashboard

1. Dashboard lädt `GET /api/dashboard/kpis`.
2. `lib/dashboard-kpis.ts` aggregiert Quoten, Trend, Gesamtscore.
3. Frontend rendert KPI-Cards und Trendtexte.

### 5) Organisationen & Einladungen

1. Org-Admin lädt `GET /api/organization/overview`.
2. Einladungen/Mitglieder werden über `app/api/organization/*` verwaltet.
3. Seat-Limits und Paketlogik werden aus Org-/CopeCart-Daten aufgelöst.

### 6) Billing (CopeCart)

1. IPN kommt über `POST /api/copecart/ipn`.
2. Event wird normalisiert, dedupliziert und geloggt.
3. `copecart_subscriptions` wird aktualisiert.
4. App-Zugriff wird aus Subscription-State abgeleitet.

### 7) Cron & Betrieb

1. `POST /api/cron/copecart-subscriptions` pflegt Subscription-Zustände.
2. `POST /api/cron/send-training-reminders` versendet Reminder nach Kandidatenlogik.
3. Monitoring läuft über `system_event_log` und Mail-Alerts.

## TODO (Technische Weiterentwicklung)

1. KPI-/Completion-Erkennung auf strukturiertes JSON-Output umstellen statt Text-Heuristiken.
2. Access-/Billing-Entscheidungen zentralisieren und mit Audit-Trail vereinheitlichen.
3. Contract-Tests für Kernrouten ergänzen (`auth`, `sessions`, `chat`, `organization`, `copecart/ipn`, `cron`).
4. Incident-/Operations-Runbook dokumentieren (Payment-Failures, Invite-Probleme, RLS-Fehler).
5. Alte Schema-Fallbacks reduzieren und DB-Migrationspfad konsolidieren.

## Changelog / Learnings

Hinweis: Dieser Abschnitt ist die laufende Projektdokumentation. Nach jeder Erweiterung oder Fehlerbehebung werden hier Learnings, Fixes und Features ergänzt.

### Eintragsformat (Vorlage)

```text
## YYYY-MM-DD - Kurztitel

Bereich:
- feature | fix | troubleshooting | infra | docs

Änderung:
- Was wurde konkret geändert?

Warum:
- Welches Problem oder Ziel stand dahinter?

Auswirkung:
- Was ist jetzt besser/anders?

Betroffene Pfade:
- app/...
- lib/...
- supabase/...

Verifikation:
- Welche Checks/Tests wurden durchgeführt?

Offene Punkte:
- Gibt es Follow-ups oder Risiken?
```

### 2026-05-21 - README vollständig auf Projektstandard gebracht

Bereich:
- docs

Änderung:
- README von generischer Next.js-Standarddatei auf projektspezifische technische Dokumentation umgestellt.
- Struktur, Architektur, Datenmodell, API-Bereiche, Setup, Env-Variablen und Betriebsaspekte dokumentiert.

Warum:
- Fehlende belastbare Einstiegsdokumentation für Entwicklung, Betrieb und Fehlersuche.

Auswirkung:
- Einheitliche Wissensbasis für künftige Arbeit am Projekt.

Betroffene Pfade:
- README.md

Verifikation:
- Inhalt manuell gegen vorhandene Codebasis (`app/`, `lib/`, `schema.sql`) abgeglichen.

Offene Punkte:
- Bei künftigen Änderungen README zeitnah nachziehen.

### 2026-05-21 - Troubleshooting-Guide ergänzt

Bereich:
- troubleshooting

Änderung:
- Troubleshooting-Sektion mit 10 häufigen Fehlerbildern inkl. Ursachen und Prüfpfaden ergänzt.

Warum:
- Schnellere Diagnose bei lokalen Setup-, Auth-, Billing-, Cron- und RLS-Problemen.

Auswirkung:
- Kürzere Debug-Zeit und weniger implizites Wissen.

Betroffene Pfade:
- README.md

Verifikation:
- Ursachen und Prüfpfade mit den implementierten API-/Lib-Flows abgeglichen.

Offene Punkte:
- Bei neuen Incidents um reale Fehlerbilder erweitern.

### 2026-05-21 - Flow-Informationen und technische TODOs ergänzt

Bereich:
- docs

Änderung:
- End-to-End-Flows für Auth, Sessions, Chat, KPI, Organization, Billing und Cron dokumentiert.
- Priorisierte technische TODO-Liste ergänzt.

Warum:
- Gemeinsames Architekturverständnis und klare nächste Verbesserungsziele schaffen.

Auswirkung:
- Bessere Planbarkeit von Refactorings und Feature-Entwicklung.

Betroffene Pfade:
- README.md

Verifikation:
- Flows mit `app/api/*`, `lib/*` und `schema.sql` abgeglichen.

Offene Punkte:
- TODOs schrittweise in Issues/Tasks überführen.

### 2026-05-21 - Registrierung von CopeCart-Pflicht entkoppelt

Bereich:
- fix

Änderung:
- Access-Logik angepasst: `subscription_missing` blockiert den App-Zugang nicht mehr.
- Neue Accounts können sich registrieren und einloggen, auch wenn noch kein CopeCart-Abo vorliegt.
- Bestehende inaktive/abgelaufene Abos bleiben weiterhin blockierend.

Warum:
- Registrierung und Erstnutzung sollten ohne direkten Kauf möglich sein.

Auswirkung:
- Niedrigere Einstiegshürde, CopeCart wird erst für spätere Monetarisierung/Abopflege relevant.

Betroffene Pfade:
- lib/copecart-subscriptions.ts
- README.md

Verifikation:
- Access-State-Pfade für `subscription_missing` auf `allowed: true` gesetzt.
- Blockierende Pfade für `subscription_inactive`/`subscription_expired` unverändert belassen.

Offene Punkte:
- Bei Bedarf später auf Trial-Logik mit Laufzeitlimit umstellen.

### 2026-05-21 - Erste Premium-Landingpage unter /landing erstellt

Bereich:
- feature

Änderung:
- Neue Route `app/landing/page.tsx` als erster hochwertiger Frontend-Entwurf für den "talkingHEADS Sales Trainer" umgesetzt.
- Enthaltene Sektionen: Hero, Problem, Solution, Product Preview, KPI, Zielgruppen, Final CTA.
- UI-Umsetzung mit Dark-Premium-Look, Brandfarben (`#0E51A0`, `#EA9413`, `#707070`), Glassmorphism, Blue Glows, Sticky Header und responsivem Layout.
- Framer-Motion für dezente Entrance-/Hover-Animationen integriert.

Warum:
- Schneller visueller Startpunkt für Positionierung und Conversion-Testing der neuen Landingpage.

Auswirkung:
- Direkter Zugriff auf den neuen Entwurf unter `/landing` ohne Backend-Änderungen.

Betroffene Pfade:
- app/landing/page.tsx
- package.json
- package-lock.json
- README.md

Verifikation:
- `npx eslint app/landing/page.tsx` ohne Fehler ausgeführt.

Offene Punkte:
- Feinschliff der CTA-Interaktionen und optionales Ersetzen des Mockups durch finalen Produkt-Screenshot.

### 2026-05-21 - Landing-Header mit TH_Logo.png ergänzt

Bereich:
- feature

Änderung:
- Auf `/landing` wurde im Sticky Header das bereitgestellte Logo `public/TH_Logo.png` eingebunden.
- Branding-Text im Header wurde durch Logo + kompakten \"Sales Trainer\"-Zusatz ersetzt.

Warum:
- Visuelle Markenführung auf der Landingpage direkt konsistent abbilden.

Auswirkung:
- Hochwertigerer, markenklarer Ersteindruck im oberen Seitenbereich.

Betroffene Pfade:
- app/landing/page.tsx
- README.md

Verifikation:
- `npx eslint app/landing/page.tsx` ohne Fehler.

Offene Punkte:
- Optional Logo-Größe je Breakpoint feinjustieren.

### 2026-05-21 - Footer entfernt, Rebranding auf talkingHEADS, Icons ersetzt

Bereich:
- fix

Änderung:
- Globale Footer-Sektion (mit Impressum/Datenschutz-Links) aus dem Root-Layout entfernt.
- Sichtbare Brand-Texte in App-Seiten und Komponenten von `AbschlussIO` auf `talkingHEADS Sales Trainer` umgestellt.
- `SiteBrand` auf `public/th_icon.png` umgestellt.
- App-Icons ersetzt: `app/icon.png` und `app/apple-icon.png` auf Basis von `public/th_icon.png`; alte `app/icon.svg` und `app/favicon.ico` entfernt.
- Metadata-Icons zentral in `app/layout.tsx` auf `/th_icon.png` gesetzt.

Warum:
- Einheitliches neues Branding ohne Legacy-Markenreste und ohne globale Footer-Rechtslinks.

Auswirkung:
- Keine Footer-Leiste mehr auf den Seiten.
- Konsistente Markenbezeichnung in der UI.
- Icon-Assets zeigen nun das TH-Icon.

Betroffene Pfade:
- app/layout.tsx
- components/site-brand.tsx
- app/*.tsx, app/**/**/*.tsx (Brand-Textstellen)
- components/*.tsx, components/**/**/*.tsx (Brand-Textstellen)
- lib/legal.ts
- app/icon.png
- app/apple-icon.png
- app/icon.svg (entfernt)
- app/favicon.ico (entfernt)
- README.md

Verifikation:
- `npx eslint` auf den betroffenen Kernseiten/-komponenten ausgeführt (ohne Errors; 1 bestehende Warning in `app/login/login-form.tsx`).

Offene Punkte:
- Optional `components/site-footer.tsx` vollständig entfernen, falls Datei nicht mehr benötigt wird.

### 2026-05-21 - Landingpage komplett neu ausgerichtet (helles Premium-Design)

Bereich:
- feature

Änderung:
- `app/landing/page.tsx` vollständig neu aufgebaut und klar verkürzt.
- Struktur auf 5 Kernbereiche reduziert: Header, Hero, 3 Benefits, Zielgruppen, Final CTA.
- Farbsystem neu nach Vorgabe umgesetzt: `#0E51A0` (Hauptfarbe), `#EA9413` (CTA), `#707070` (Sekundärtext).
- Dunklen Look entfernt, stattdessen heller Premium-Grundaufbau.
- Hero neu mit 2-Spalten-Layout und hochwertigem Dashboard-Mockup in talkingHEADS-Farbwelt.
- CTA-Buttons mit plastischem Orange-Verlauf und Schatten (3D-Look) umgesetzt.
- Responsive Verhalten gestrafft (keine überlangen Bereiche, keine auslaufenden Inhalte, kompakte Abstände).

Warum:
- Vorheriger Entwurf war zu dunkel, zu lang und nicht passend zur gewünschten Markenwirkung.

Auswirkung:
- Deutlich fokussiertere Conversion-Landingpage mit klarem visuellen Branding und kürzerem Scroll-Flow.

Betroffene Pfade:
- app/landing/page.tsx
- README.md

Verifikation:
- `npx eslint app/landing/page.tsx` ohne Fehler.

Offene Punkte:
- Optional finale Produkt-Screenshots statt Mockup-Grafik integrieren.

### 2026-05-21 - App-Seiten visuell auf Landing-Style verdichtet (2. Runde)

Bereich:
- feature

Änderung:
- Register/Login-Darstellung weiter vom Legacy-Look gelöst: kompaktere Header, straffere Vertical-Spaces, klarere Hero-Typografie.
- Dashboard-Hero entschlackt (weniger visuelles Rauschen, Fokus auf Welcome + Trainingsstart).
- Interne App-Shell an den hellen Premium-Stil angenähert (Kanten, Border-Tone, Shadow-Gewichtung, Background).

Warum:
- Erste Design-Runde war noch zu nah am alten Seitenaufbau und wirkte nicht konsistent genug mit dem neuen Landing-Ansatz.

Auswirkung:
- Sichtbar moderneres, ruhigeres Gesamtbild mit klarerer Informationshierarchie in den Kernseiten.

Betroffene Pfade:
- components/internal-app-shell.tsx
- app/register/page.tsx
- app/login/login-form.tsx
- app/dashboard/page.tsx
- README.md

Verifikation:
- `npx eslint` auf den geänderten Dateien ohne Errors (1 bestehende Warning in `app/login/login-form.tsx`).

Offene Punkte:
- Optional dritte Runde für vollständige Vereinheitlichung der Interaktionskomponenten (Buttons/Inputs/Badges) in Chat und Session-Start-Cards.

### 2026-05-21 - Landingpage pixelnah auf Referenzstil nachgebaut

Bereich:
- feature

Änderung:
- `/landing` vollständig neu auf den Referenzstil ausgerichtet (ohne Dark-Interpretation).
- Header, Hero-Zweispalter, Produkt-Dashboard-Mockup, 3-Benefit-Bereich, 3-Zielgruppen-Cards und Final-CTA visuell eng an Referenzproportionen umgesetzt.
- Farb- und Typografie-System strikt auf `#0E51A0`, `#EA9413`, `#707070`, Rubik/Roboto geführt.
- Orange CTA-Buttons mit plastischem Verlauf, Glow und Shadow-Layer umgesetzt.

Warum:
- Vorversion war stilistisch zu weit von der Master-Referenz entfernt.

Auswirkung:
- Landing wirkt beim ersten Blick deutlich näher an der gewünschten Referenz-SaaS-Ästhetik.

Betroffene Pfade:
- app/landing/page.tsx
- README.md

Verifikation:
- `npx eslint app/landing/page.tsx` ohne Fehler.

Offene Punkte:
- Feintuning erfolgt auf Basis visueller Review im Browser (Spacing/Typo auf realen Breakpoints).

### 2026-05-21 - Landing Hero vereinfacht (ohne Bild), Hintergrund auf reinweiß

Bereich:
- fix

Änderung:
- Rechtes Hero-Bild/Dashboard auf `/landing` vollständig entfernt.
- Oberer Bereich auf den blauen Hero-Kasten reduziert.
- Gesamter Seitenhintergrund auf `#ffffff` gesetzt.
- Overflow-Clipping im Hero-Bereich bereinigt.

Warum:
- Gewünschtes Layout: kein Hero-Bild, nur klarer blauer Header-/Hero-Block.

Auswirkung:
- Ruhigeres Hero-Layout ohne abgeschnittenes Bild und konsistenter weißer Seitenhintergrund.

Betroffene Pfade:
- app/landing/page.tsx
- README.md

Verifikation:
- `npx eslint app/landing/page.tsx` ohne Fehler.

Offene Punkte:
- Keine.
