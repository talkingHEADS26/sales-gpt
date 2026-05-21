# Protokoll: Fixes & Implementierungen

Stand: 20.05.2026
Projekt: `abschluss-io`
Branch: `main`

## 1) Branchen & Prompt-Architektur

### 1.1 Register-Branchen auf neue Liste umgestellt
- Commit: `990357b`
- Betroffene Dateien:
  - `app/register/...` (branchenbezogene Auswahl-Logik)
- Änderung:
  - Branchenliste auf `Fitness`, `Finanzen`, `Franchise`, `Energie` angepasst.
  - Grundlage für konsistente Industry-Keys im gesamten Flow geschaffen.

### 1.2 Legacy-Type-Mismatch bei Branchenprompts behoben
- Commit: `c3af00d`
- Betroffene Dateien:
  - `lib/prompts/industries/automotive.ts` (und zugehörige Typquellen)
- Änderung:
  - Build-Fehler durch nicht mehr gültigen Industry-Key behoben.
  - Typkonsistenz mit zulässigen Branchen hergestellt.

### 1.3 Energie-Struktur 1:1 auf Basis Fitness aufgebaut (sauber getrennt)
- Commit: `b6f7a61`
- Betroffene Dateien:
  - `lib/prompts/industries/energy.ts`
- Änderung:
  - Eigenständige Energie-Promptstruktur angelegt.
  - Keine Vermischung mit Fitness-Inhalten.

### 1.4 Energie-Chatflow erweitert (Themen, Pain Points, Einwände)
- Commit: `aa99958`
- Betroffene Dateien:
  - `lib/prompts/industries/energy.ts`
- Änderung:
  - Inhalte ergänzt für: Wärmepumpe, Photovoltaik-Anlage, Wallbox, Energiespeicher.
  - Pain Points ergänzt: Heiz-/Energiekosten, Umweltbewusstsein, Wertsteigerung.
  - Einwandkatalog ergänzt (z. B. Bank, intern besprechen, zu teuer, Garantie, Service/Wartung, Anbietervergleich).
  - Regel ergänzt, bei zu vielen Fachbegriffen Verständnisfragen zu stellen.

## 2) Avatar-Logik (Full Sales)

### 2.1 3x-Sperr-Regel / 80%-Divergenz umgesetzt
- Commit: `e0a2d80`
- Betroffene Dateien:
  - `app/api/sessions/start/route.ts`
  - `lib/full-sales-avatar.ts` (und verknüpfte Avatar-Logik)
- Änderung:
  - Letzten Snapshot als Ausschlussbasis berücksichtigt.
  - Hohe Wiederholungsnähe verhindert (Ziel: deutliche Differenz zum vorherigen Avatar).

### 2.2 Energie-spezifische Avatarprofile (B2C/B2B, Eigentümer-Szenarien)
- Commit: `f447e8b`
- Betroffene Dateien:
  - `lib/prompts/industries/energy.ts`
  - `lib/full-sales-avatar.ts` (Mapping/Selektion)
- Änderung:
  - Zielgruppen für Eigenheim- und Mehrfamilienhausbesitzer ergänzt.
  - Alters-, Kontext-, Einwand- und Prioritätenprofile ergänzt.
  - DISG-/Persönlichkeitsbezug in Verhalten und Argumentation verankert.

## 3) Admin Panel / Rollen / Zugriff

### 3.1 Admin-Button-Sichtbarkeit stabilisiert
- Commits (Auszug):
  - `40c1ca0`, `ddfb02b`, `4cf2bb7`, `45d1e56`, `351a3f8`
- Betroffene Dateien:
  - `components/internal-app-shell.tsx`
  - `lib/admin-server.ts`
  - `app/admin/page.tsx`
- Änderung:
  - Rendering-Logik für Admin-Navigation robust gemacht.
  - Master-Admin-Erkennung über zuverlässige Guards abgesichert.

### 3.2 3-Ebenen-Verwaltung wieder strikt hergestellt
- Commit: `be83434`
- Betroffene Dateien:
  - `lib/admin-server.ts`
  - `lib/organization-admin-server.ts`
  - `components/internal-app-shell.tsx`
- Änderung:
  - Plattform-, Organisations- und Zugangs-/Abo-Ebene konsistent abgesichert.
  - Server-Guards und UI-Zugriffslogik synchronisiert.

### 3.3 Org-Zugriff für Master-Admin trotz fehlender Membership-Fälle repariert
- Commits:
  - `0048ade`, `df89d47`
- Betroffene Dateien:
  - `lib/organization-admin-server.ts`
- Änderung:
  - Fallback-Logik ergänzt, wenn direkte Membership fehlt.
  - Primäre Admin-Organisation wird belastbar aufgelöst.

### 3.4 403-Debug-Payloads für Ursachenanalyse ergänzt
- Commit: `2ca416c`
- Betroffene Dateien:
  - `app/api/admin/overview/route.ts`
  - `app/api/organization/overview/route.ts`
- Änderung:
  - Debug-Informationen bei Forbidden-Antworten ergänzt.
  - Schnellere Ursachenfindung bei Rechteproblemen.

### 3.5 Organisationsverwaltung für Non-Solo freigeschaltet
- Commit: `da09d7c`
- Betroffene Dateien:
  - `components/internal-app-shell.tsx`
  - `lib/organization-admin-server.ts`
- Änderung:
  - Zugriff auf Organisationsverwaltung für Nutzer ohne Solo-Zugang ermöglicht (gemäß gewünschter Logik).

### 3.6 Branchenänderung pro Organisation im Admin-Panel explizit speicherbar gemacht
- Commit: `c42fde7`
- Betroffene Dateien:
  - `app/admin/admin-page-view.tsx`
- Änderung:
  - Dropdown auf Draft-Auswahl umgestellt.
  - `Ändern`-Button neben Dropdown ergänzt.
  - Speichern erst per Klick; Disable-Logik bei unveränderten/ladenden Zuständen ergänzt.

## 4) Passwort-Recovery / Redirect

### 4.1 Recovery-Flow korrigiert (Hash-Token-Handling + Redirect)
- Commit: `3a6870a`
- Betroffene Dateien:
  - `app/forgot-password/page.tsx`
  - `app/reset-password/page.tsx`
- Änderung:
  - Verarbeitung von Recovery-Parametern stabilisiert.
  - Redirect-Kette für Reset-Flow korrigiert.

### 4.2 Redirect-URL dynamisch auf aktuelle Origin gestellt
- Commit: `dbd5a64`
- Betroffene Dateien:
  - `app/forgot-password/page.tsx`
- Änderung:
  - Reset-Links verwenden die aktuelle Deployment-Origin.
  - Umgebungswechsel (Preview/Prod) robuster.

### 4.3 Diagnose-Endpunkt für Supabase-Projektkonsistenz ergänzt
- Commit: `7c5e548`
- Betroffene Dateien:
  - `app/api/debug/supabase-project/route.ts`
- Änderung:
  - Prüft Konsistenz von Projekt-Ref aus URL/Key.
  - Unterstützt schnelle Fehleranalyse bei falscher Supabase-Konfiguration.

## 5) Energie-Briefing-Text im Chat

### 5.1 Umlaute im Energiebereich korrigiert
- Commit: `2d42bfa`
- Betroffene Dateien:
  - `lib/prompts/industries/energy.ts`
- Änderung:
  - ASCII-Ersatzschreibweisen (`ae/oe/ue`) in relevanten Texten auf echte Umlaute umgestellt.

### 5.2 Feldlabel im Full-Sales-Briefing branchenabhängig gemacht
- Commits:
  - `2d42bfa` (Client-Ansicht)
  - `5e4fafb` (serverseitige Session-Erzeugung)
- Betroffene Dateien:
  - `app/chat/[sessionId]/chat-session-view.tsx`
  - `app/api/sessions/start/route.ts`
- Änderung:
  - Für Branche `energy` wird statt `Beschwerdebild` jetzt `Konkretes Interesse` ausgegeben.
  - Zusätzlich Startsatz im Briefing mit echten Umlauten vereinheitlicht.
  - Hinweis: Bereits bestehende Sessions behalten alten bereits gespeicherten Briefingtext; neue Sessions zeigen die neue Fassung.

## 6) Build-/Deploy-Stabilität

- Mehrere Fixes wurden jeweils mit lokalem Build validiert (`npm run build` erfolgreich nach den jeweiligen Änderungen).
- Relevante Fix-Commits wurden direkt auf `main` gepusht.


## 7) Dynamische Branchenlogik in Modulen

### 7.1 Terminsetting: studio-lastige Texte zentral dynamisch normalisiert
- Commit: `c789ab7`
- Betroffene Dateien:
  - `lib/chat-prompts.ts`
- Änderung:
  - Für `appointment_setting` wird der Branchenblock vor Auslieferung dynamisch normalisiert.
  - Studio-Formulierungen werden für `finance`, `franchise`, `energy` automatisch auf branchenpassende Terminsetting-Texte umgeschrieben.
  - `fitness` bleibt unverändert.

### 7.2 Beschwerdemanagement: studio-lastige Texte zentral dynamisch normalisiert
- Commit: `57f6b9e`
- Betroffene Dateien:
  - `lib/chat-prompts.ts`
- Änderung:
  - Für `complaint_management` wird der Branchenblock analog dynamisch normalisiert.
  - Studio-Formulierungen werden bei Nicht-Fitness-Branchen automatisch in branchenspezifische Beschwerde-Formulierungen überführt.

## 8) Beschwerdekanal-Reduktion

### 8.1 Auswahl auf `Telefon` und `vor Ort` begrenzt
- Commit: `57f6b9e`
- Betroffene Dateien:
  - `lib/training-session-config.ts`
  - `app/dashboard/start-session-actions.tsx` (indirekt über Optionsquelle)
- Änderung:
  - `Empfang / Theke` aus den erlaubten Complaint-Kanaloptionen entfernt.
  - UI nutzt automatisch nur noch die verbleibenden Optionen aus `COMPLAINT_CHANNEL_OPTIONS`.

### 8.2 Abwärtskompatibilität für alte Snapshots mit `Empfang / Theke`
- Commit: `57f6b9e`
- Betroffene Dateien:
  - `app/api/chat/route.ts`
- Änderung:
  - Alte Snapshot-Werte `Empfang / Theke` werden beim Mapping auf `vor Ort` normalisiert.
  - Verhindert Fehler bei bestehenden historischen Datensätzen.

## 9) Energy-Beschwerdemanagement: Kontextkatalog & Branchenrouting

### 9.1 Ursache für falschen (Fitness-)Beschwerdekontext beseitigt
- Commit: `bff1e91`
- Betroffene Dateien:
  - `lib/complaint-avatar.ts`
  - `app/api/sessions/start/route.ts`
  - `app/api/chat/route.ts`
- Änderung:
  - Complaint-Avatar-Auswahl ist jetzt explizit `industryKey`-abhängig.
  - Bisherige universelle/studio-lastige Seeds sind als Default-Fallback erhalten, aber `energy` nutzt einen separaten Katalog.

### 9.2 Vollständiger Energy-Beschwerdekatalog hinterlegt
- Commit: `bff1e91`
- Betroffene Dateien:
  - `lib/complaint-avatar.ts`
- Änderung:
  - Energie-spezifische Beschwerdefälle als strukturierter Seed-Katalog ergänzt, inkl.:
    - Verbrauch/Kosten: PV-Ertrag, Wärmepumpenverbrauch, Nachzahlungen, Finanzierung, Einspartransparenz.
    - Technik/Betrieb: Speicher, Wechselrichter, Notstrom, App/Monitoring, Systemintegration.
    - Umsetzung/Service: Förderlogik, Installateur-Kommunikation, Wartezeiten, Baustellenschäden.
    - Gebäude/Komfort: Wärmeverteilung, Warmwasser, Lärm, Feuchtigkeit/Schimmel.
    - Gewerbe-Schmerzpunkte: Lastmanagement, Peak-Shaving, Leistung für Maschinen/Fuhrpark, Produktionsausfälle, Brandschutz/Versicherung, Amortisation, Bedienkomplexität.
  - Selections werden daraus zufällig gezogen, kombiniert mit Difficulty/DISC-Profil und Verlaufskontext.

## 10) Projektdokumentation im Root

### 10.1 Protokolldatei angelegt und fortlaufend erweitert
- Commits:
  - `c789ab7` (Anlage)
  - laufende inhaltliche Ergänzungen
- Betroffene Dateien:
  - `PROTOKOLL_FIXES_IMPLEMENTIERUNGEN.md`
- Änderung:
  - Zentrale Nachverfolgbarkeit der Implementierungen inkl. Commits, Dateiliste und Änderungstyp.

## 11) Finance-Ausbau (eigenständige Logik)

### 11.1 Eigenständige Finance-Logik über Kernmodule ausgebaut
- Commit: `bbfee10`
- Betroffene Dateien:
  - `lib/prompts/industries/finance.ts`
  - `lib/appointment-setting-avatar.ts`
  - `lib/complaint-avatar.ts`
  - `lib/full-sales-avatar.ts`
  - `app/api/sessions/start/route.ts`
- Änderung:
  - Finance als eigenständige Kategorie im gleichen Schema wie Energy ausgebaut.
  - Terminsetting: finance-spezifische Lead-Seeds nach Leadquelle.
  - Beschwerdemanagement: finance-spezifische Seed-Logik und Branchenrouting.
  - Full-Sales-Avatarlogik: finance-spezifische DISG-/Einwandsteuerung ergänzt.
  - Prompt-Blöcke in Finance inhaltlich auf Finanzberatung statt Studio-Kontext ausgerichtet.

### 11.2 Finance-Beschwerdekatalog massiv erweitert (analog Energy-Tiefe)
- Commit: `12260dc`
- Betroffene Dateien:
  - `lib/complaint-avatar.ts`
- Änderung:
  - Umfangreicher Finance-Beschwerdekatalog ergänzt für:
    - Versicherung (Leistungsfälle, Beitragserhöhungen, Klauseln, Kündigungen)
    - Kredit/Finanzierung/Leasing (Zinsanpassung, versteckte Kosten, Laufzeit/Tilgung)
    - Tarifvermittlung (Strom/Gas, Boni, Preisfallen)
    - Service/Prozess (Rückrufe, Zuständigkeiten, Portale, Wechsel, Betreuung)
    - Anlage/Fonds/ETF/Vermögensaufbau (Renditeabweichung, Gebühren, Risikofit, Diversifikation)
  - Seeds werden finance-spezifisch gezogen, ohne Vermischung mit anderen Branchen.

### 11.3 Finance-Situationscoaching strukturiert eingerichtet
- Commit: `2a58917`
- Betroffene Dateien:
  - `lib/prompts/industries/finance.ts`
- Änderung:
  - `situationCoaching`-Block auf klaren finance-spezifischen Prüfpfad umgestellt:
    1) Bedarf/Ausgangslage
    2) Verständlichkeit/Transparenz
    3) Eignung/Suitability
    4) Verbindlichkeit im Prozess
  - Opening für Situationscoaching konkretisiert (Kundentyp, Produkt/Thema, kritischer Moment, Einwand, Ziel).

## 12) Franchise-Doppel-Logik (Hauptbranche + Subbranche)

### 12.1 Architektur: `franchise_vertical` als zweite Ebene eingeführt
- Commit: `50b7e77`
- Betroffene Dateien:
  - `lib/industries.ts`
  - `supabase/migrations/044_add_franchise_vertical_to_organizations.sql`
- Änderung:
  - Neue Subbranchenebene für Franchise ergänzt (`restaurant`, `fashion`, `fitness`, `beauty`, `retail`, `services`, `other`).
  - Normalizer/Labels/Options ergänzt.
  - Migration für `organizations.franchise_vertical` inkl. Constraint und Default vorbereitet.

### 12.2 Prompt-Overlay für Franchise-Subbranchen ergänzt
- Commit: `50b7e77`
- Betroffene Dateien:
  - `lib/chat-prompts.ts`
- Änderung:
  - Bei `industryKey = franchise` wird ein zusätzlicher Subbranchen-Overlay in den Systemprompt aufgenommen.
  - Vertikale Fokuslogik je Segment (z. B. Gastro, Fashion, Gym, Retail, Services) ergänzt.

### 12.3 Avatar- und Session-Flow auf Subbranche verdrahtet
- Commit: `50b7e77`
- Betroffene Dateien:
  - `lib/appointment-setting-avatar.ts`
  - `lib/complaint-avatar.ts`
  - `lib/full-sales-avatar.ts`
  - `app/api/sessions/start/route.ts`
  - `app/api/chat/route.ts`
- Änderung:
  - Terminsetting und Beschwerdemanagement nutzen bei Franchise zusätzliche vertikale Seeds.
  - Full-Sales-Prompt um Franchise-Subbranchen-Verhaltensregeln ergänzt.
  - `franchiseVertical` wird im Session-/Chat-Flow mitgeführt.

### 12.4 Admin/API für Franchise-Segment-Auswahl erweitert
- Commit: `50b7e77`
- Betroffene Dateien:
  - `app/admin/admin-page-view.tsx`
  - `app/api/admin/organizations/[organizationId]/route.ts`
  - `app/api/admin/overview/route.ts`
  - `lib/organization-admin-server.ts`
- Änderung:
  - Admin kann für Franchise-Organisationen ein Segment per Dropdown setzen und speichern.
  - API akzeptiert/validiert `franchiseVertical` und räumt Feld auf `null`, wenn Branche nicht `franchise` ist.
  - Overview liefert Segmentinformationen zurück.

## 13) Produktions-Hotfix nach Deploy

### 13.1 Fehlerbild: `column organizations.franchise_vertical does not exist`
- Commit: `da3bf7e`
- Betroffene Dateien:
  - `app/api/admin/organizations/[organizationId]/route.ts`
  - `app/api/admin/overview/route.ts`
  - `app/api/sessions/start/route.ts`
  - `lib/industries.ts`
  - `lib/organization-admin-server.ts`
- Änderung:
  - Kompatibilitäts-Hotfix eingebaut, damit produktive Umgebungen ohne bereits ausgeführte Migration weiter funktionieren.
  - Kritische Selects wieder ohne harte Spaltenabhängigkeit formuliert.
  - Update-Route mit Fallback-Retry (ohne `franchise_vertical`) ergänzt.
  - Ergebnis: Admin/Organisation laden wieder, selbst wenn die Spalte in der Ziel-DB noch fehlt.

## 14) Franchise-Segment speichert wieder korrekt

### 14.1 Ursache: `franchise_vertical` in mehreren Reads nicht mehr geladen
- Commit: `tbd`
- Betroffene Dateien:
  - `app/api/admin/overview/route.ts`
  - `lib/organization-admin-server.ts`
  - `app/api/sessions/start/route.ts`
- Änderung:
  - Nach dem Kompatibilitäts-Hotfix war die Spalte `franchise_vertical` zwar in der DB vorhanden, wurde aber in zentralen Selects nicht mehr mitgeladen.
  - Dadurch wirkte die Auswahl im Admin-Dropdown nach Reload wie „nicht gespeichert“.
  - Alle relevanten Selects wurden wieder auf `franchise_vertical` erweitert:
    - Plattform-Overview
    - Organisations-Guard/Membership-Fallback
    - Session-Start (Industry-Settings-Auflösung)
  - Ergebnis: Umstellung z. B. auf `Franchise + Beauty` wird wieder konsistent gespeichert und angezeigt.
