# talkingHEADS — Design System

> Dieses Dokument ist die **verbindliche Design-Referenz** für alle Claude Code-Projekte unter der talkingHEADS-Marke (talkingheads.business, talkingheads.consulting, talkingheads.academy, AbschlussIO). Claude Code greift bei jedem Projekt hierauf zurück.

---

## 1. Farbpalette

### Primärfarben

| Name              | Hex       | Verwendung                                                  |
|-------------------|-----------|-------------------------------------------------------------|
| **TH Blau**       | `#0e51a0` | Primärfarbe, Hero-Hintergründe, Buttons, Akzente, Links     |
| **TH Orange**     | `#EA9413` | CTAs, Highlights, Badges, Hover-Effekte, Akzentlinie        |

### Sekundärfarben / Neutrals

| Name              | Hex       | Verwendung                                                  |
|-------------------|-----------|-------------------------------------------------------------|
| **Dunkelblau**    | `#072f6b` | Dunklere Variante von TH Blau, Gradient-Endpunkte, Footer   |
| **Fast Schwarz**  | `#0d0d0d` | Fließtext auf hellem Hintergrund                            |
| **Dunkelgrau**    | `#1a1a2e` | Dunkle Sektionen, Karten-Hintergrund auf dunklem BG         |
| **Mittelgrau**    | `#4a4a6a` | Sekundärtext, Sublines, Metainfos                           |
| **Hellgrau**      | `#f5f5f5` | Helle Sektionen, Karten-Hintergrund auf hellem BG           |
| **Weiß**          | `#ffffff` | Text auf dunklen Flächen, Card-Hintergründe                 |

### Gradient-Definitionen

```css
/* Hero / Hauptgradient (dunkel → TH Blau) */
background: linear-gradient(135deg, #072f6b 0%, #0e51a0 60%, #1a6bc7 100%);

/* Abschnitt-Gradient hell */
background: linear-gradient(180deg, #ffffff 0%, #f0f4fb 100%);

/* Orange Akzent-Gradient */
background: linear-gradient(90deg, #EA9413 0%, #f5b942 100%);

/* Dunkle Sektion */
background: linear-gradient(135deg, #0d0d0d 0%, #1a1a2e 100%);
```

---

## 2. Typografie

### Schriftfamilien

```css
/* Primäre Schrift — Überschriften, CTAs, Labels */
font-family: 'Rubik', sans-serif;

/* Sekundäre Schrift — Fließtext, Beschreibungen */
font-family: 'Roboto', sans-serif;

/* Google Fonts Import */
@import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800;900&family=Roboto:wght@300;400;500;700&display=swap');
```

### Typografie-Hierarchie

| Element            | Font    | Gewicht | Größe (Desktop) | Größe (Mobile) | Style                    |
|--------------------|---------|---------|-----------------|----------------|--------------------------|
| **Hero Headline**  | Rubik   | 900     | 52–64px         | 28–36px        | Uppercase, Letter-Spacing 0.05em |
| **H1**             | Rubik   | 800     | 42px            | 26px           | Uppercase                |
| **H2 Sektion**     | Rubik   | 700     | 32px            | 22px           | Uppercase, TH Blau oder Weiß |
| **H3 Karte**       | Rubik   | 600     | 20px            | 18px           | Normal oder Uppercase    |
| **Subline / Label**| Rubik   | 500     | 14px            | 13px           | Uppercase, TH Orange, Letter-Spacing 0.1em |
| **Body Text**      | Roboto  | 400     | 16px            | 15px           | Normal, Zeilenhöhe 1.6   |
| **Button Text**    | Rubik   | 700     | 15px            | 14px           | Uppercase, Letter-Spacing 0.08em |
| **Kleindruck**     | Roboto  | 300     | 13px            | 12px           | Normal                   |

### Typografie-Prinzipien

- Überschriften und CTAs **immer in Uppercase** (talkingHEADS-typisch, sehr konsequent durchgezogen)
- Starker Kontrast zwischen Headlines (fett, groß) und Bodytext (schlank, ruhig)
- Orange (`#EA9413`) als Highlight-Farbe für wichtige Wörter in Überschriften möglich: `<span style="color:#EA9413">SKALIEREN</span>`
- Keine Kursivschrift im Interface-Kontext

---

## 3. Layout-Struktur

### Grundprinzip

Seitenaufbau folgt einem **Sektion-Stapel-Prinzip**: Volle Breite, wechselnde Hintergründe (dunkel/hell/dunkel), maximale Inhaltsbreite zentriert.

```css
/* Seiten-Container */
.page-wrapper {
  width: 100%;
  overflow-x: hidden;
}

/* Sektion */
.section {
  width: 100%;
  padding: 80px 20px;        /* Desktop */
}

/* Inhalts-Container */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

/* Responsive */
@media (max-width: 768px) {
  .section { padding: 48px 16px; }
}
```

### Seitenstruktur (Standard-Reihenfolge)

```
1. NAVIGATION (sticky, transparent → solid beim Scrollen)
2. HERO SECTION (dunkelblau, Gradient, volle Viewport-Höhe oder min 70vh)
3. LOGO-BAND / SOCIAL PROOF (weiß/hellgrau, scrollend)
4. PROBLEM/VALUE PROPOSITION (weiß oder hellgrau)
5. VIDEO SECTION (dunkelblau)
6. ERFOLGSGESCHICHTEN / TESTIMONIALS (weiß, Karussell)
7. SYSTEM / LEVELS / STEPS (wechselnd hell/dunkel, alternierend links-rechts)
8. BRANCHEN-STUDIEN (dunkel, mit Bild-Scroll)
9. LÖSUNGEN / FEATURES (hellgrau, Karten-Grid)
10. PROZESS / WORKFLOW (weiß, Schritt-für-Schritt)
11. CTA SECTION (TH Orange oder TH Blau, volle Breite)
12. KONTAKT / TERMIN (dunkelblau)
13. FAQ (hellgrau, Akkordeon)
14. FOOTER (fast schwarz / dunkel)
```

### Grid-System

```css
/* 2-Spalten (Feature-Pair) */
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }

/* 3-Spalten (Feature-Cards) */
.grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }

/* 4-Spalten (Stats / Icons) */
.grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }

/* Alternierend Links-Rechts (Bild + Text) */
.split-left  { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: center; }
.split-right { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: center; direction: rtl; }

/* Responsive: alles 1 Spalte ab 768px */
@media (max-width: 768px) {
  .grid-2, .grid-3, .grid-4, .split-left, .split-right {
    grid-template-columns: 1fr;
    direction: ltr;
  }
}
```

---

## 4. Navigation

```css
.navbar {
  position: sticky;
  top: 0;
  z-index: 1000;
  background: rgba(7, 47, 107, 0.95);
  backdrop-filter: blur(10px);
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.nav-links a {
  font-family: 'Rubik', sans-serif;
  font-weight: 600;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #ffffff;
  text-decoration: none;
}

.nav-links a:hover { color: #EA9413; }

/* Nav-CTA Button */
.nav-cta {
  background: #EA9413;
  color: #ffffff;
  padding: 10px 20px;
  border-radius: 4px;
  font-family: 'Rubik', sans-serif;
  font-weight: 700;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
```

---

## 5. Hero Section

```css
.hero {
  background: linear-gradient(135deg, #072f6b 0%, #0e51a0 60%, #1a6bc7 100%);
  min-height: 85vh;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 100px 24px 80px;
  position: relative;
  overflow: hidden;
}

/* Optionale geometrische Hintergrund-Dekoration */
.hero::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -20%;
  width: 600px;
  height: 600px;
  background: rgba(234, 148, 19, 0.08);
  border-radius: 50%;
  pointer-events: none;
}

.hero-label {
  font-family: 'Rubik', sans-serif;
  font-weight: 500;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: #EA9413;
  margin-bottom: 16px;
}

.hero-headline {
  font-family: 'Rubik', sans-serif;
  font-weight: 900;
  font-size: 56px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #ffffff;
  line-height: 1.1;
  margin-bottom: 20px;
}

.hero-subline {
  font-family: 'Rubik', sans-serif;
  font-weight: 600;
  font-size: 22px;
  text-transform: uppercase;
  color: #EA9413;
  letter-spacing: 0.06em;
  margin-bottom: 32px;
}

.hero-body {
  font-family: 'Roboto', sans-serif;
  font-weight: 400;
  font-size: 18px;
  color: rgba(255,255,255,0.85);
  max-width: 640px;
  margin: 0 auto 40px;
  line-height: 1.6;
}
```

---

## 6. Karten-Formen & Komponenten

### Standard-Karte (hell)

```css
.card {
  background: #ffffff;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 4px 24px rgba(14, 81, 160, 0.10);
  border: 1px solid rgba(14, 81, 160, 0.08);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(14, 81, 160, 0.18);
}
```

### Karte auf dunklem Hintergrund

```css
.card-dark {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 12px;
  padding: 32px;
  backdrop-filter: blur(8px);
  transition: background 0.2s ease, border-color 0.2s ease;
}

.card-dark:hover {
  background: rgba(255,255,255,0.10);
  border-color: rgba(234, 148, 19, 0.4);
}
```

### Feature-Karte mit farbigem Top-Border

```css
.card-feature {
  background: #ffffff;
  border-radius: 12px;
  padding: 32px;
  border-top: 4px solid #EA9413;
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
}
```

### Nummer-Karte (Prozess-Steps)

```css
.card-step {
  background: #ffffff;
  border-radius: 12px;
  padding: 28px 24px;
  box-shadow: 0 4px 20px rgba(14, 81, 160, 0.10);
  position: relative;
}

.card-step .step-number {
  font-family: 'Rubik', sans-serif;
  font-weight: 900;
  font-size: 48px;
  color: rgba(14, 81, 160, 0.12);
  line-height: 1;
  margin-bottom: 12px;
}
```

### Testimonial-Karte

```css
.card-testimonial {
  background: #ffffff;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 4px 24px rgba(14, 81, 160, 0.10);
  border-left: 4px solid #EA9413;
}

.card-testimonial .quote {
  font-family: 'Roboto', sans-serif;
  font-size: 15px;
  line-height: 1.7;
  color: #333;
  font-style: italic;
  margin-bottom: 20px;
}

.card-testimonial .author-name {
  font-family: 'Rubik', sans-serif;
  font-weight: 700;
  font-size: 15px;
  color: #0e51a0;
}

.card-testimonial .author-role {
  font-family: 'Roboto', sans-serif;
  font-size: 13px;
  color: #888;
}
```

### Badge / Stat-Karte

```css
.badge-stat {
  background: linear-gradient(135deg, #0e51a0, #1a6bc7);
  color: #ffffff;
  border-radius: 12px;
  padding: 24px;
  text-align: center;
}

.badge-stat .stat-number {
  font-family: 'Rubik', sans-serif;
  font-weight: 900;
  font-size: 42px;
  color: #EA9413;
}

.badge-stat .stat-label {
  font-family: 'Rubik', sans-serif;
  font-weight: 600;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255,255,255,0.85);
}
```

---

## 7. CTAs (Call-to-Action)

### Primär-CTA (Orange — Hauptaktion)

```css
.btn-primary {
  display: inline-block;
  background: #EA9413;
  color: #ffffff;
  font-family: 'Rubik', sans-serif;
  font-weight: 700;
  font-size: 15px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 16px 36px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  text-decoration: none;
  transition: background 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease;
  box-shadow: 0 4px 20px rgba(234, 148, 19, 0.35);
}

.btn-primary:hover {
  background: #d4830f;
  transform: translateY(-2px);
  box-shadow: 0 8px 28px rgba(234, 148, 19, 0.5);
}
```

### Sekundär-CTA (Blau — Weiterlesen / Info)

```css
.btn-secondary {
  display: inline-block;
  background: #0e51a0;
  color: #ffffff;
  font-family: 'Rubik', sans-serif;
  font-weight: 700;
  font-size: 15px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 16px 36px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  text-decoration: none;
  transition: background 0.2s ease, transform 0.15s ease;
}

.btn-secondary:hover {
  background: #072f6b;
  transform: translateY(-2px);
}
```

### Ghost-CTA (Outline auf dunklem Hintergrund)

```css
.btn-ghost {
  display: inline-block;
  background: transparent;
  color: #ffffff;
  font-family: 'Rubik', sans-serif;
  font-weight: 700;
  font-size: 15px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 14px 34px;
  border-radius: 6px;
  border: 2px solid #ffffff;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s ease;
}

.btn-ghost:hover {
  background: #ffffff;
  color: #0e51a0;
}
```

### CTA-Texte (talkingHEADS-typisch)

Folgende CTA-Formulierungen werden auf den Originalseiten konsistent verwendet und sollten beibehalten werden:

- **Primär:** `JETZT KOSTENLOS BEWERBEN!`
- **Sekundär:** `BEWIRB DICH JETZT KOSTENLOS!`
- **Soft:** `ERFAHRE HIER MEHR!` / `HIER GEHTS ZUM SYSTEM!`
- **Tertiär:** `HIER DIE KI TERMINBUCHUNG STARTEN!`

---

## 8. Hintergrund-Designs & Sektionen

### Hell-Sektion

```css
.section-light {
  background: #ffffff;
  color: #0d0d0d;
}

.section-lightgray {
  background: #f5f5f5;
  color: #0d0d0d;
}
```

### Dunkel-Sektion (Blau)

```css
.section-dark {
  background: linear-gradient(135deg, #072f6b 0%, #0e51a0 100%);
  color: #ffffff;
}
```

### Tief-Dunkel-Sektion

```css
.section-black {
  background: linear-gradient(135deg, #0d0d0d 0%, #1a1a2e 100%);
  color: #ffffff;
}
```

### Geometrische Dekorations-Elemente (wiederkehrendes Muster)

```css
/* Diagonaler Trennstreifen zwischen Sektionen */
.section-divider {
  width: 100%;
  height: 80px;
  background: inherit;
  clip-path: polygon(0 0, 100% 0, 100% 100%, 0 40%);
}

/* Kreis-Deko im Hintergrund */
.bg-circle {
  position: absolute;
  border-radius: 50%;
  background: rgba(234, 148, 19, 0.06);
  pointer-events: none;
}

/* Horizontale Orange-Akzentlinie unter Headlines */
.headline-underline {
  display: block;
  width: 60px;
  height: 4px;
  background: #EA9413;
  border-radius: 2px;
  margin: 16px auto 0;  /* zentriert */
}
/* oder linksbündig: margin: 16px 0 0; */
```

---

## 9. Ikonen & Visuelle Elemente

- **Ikonen-Stil:** Outline oder Solid, gerundet (kein scharfkantiger Stil). Empfohlen: Lucide Icons oder HeroIcons.
- **Icon-Farbe auf hell:** `#0e51a0` (TH Blau) oder `#EA9413` (TH Orange)
- **Icon-Farbe auf dunkel:** `#EA9413` oder `#ffffff`
- **Icon-Hintergrund (Karten):** Kleines Quadrat oder Kreis mit `background: rgba(14,81,160,0.08)`, `border-radius: 8px`, Padding 10px

### Checkmark-Liste (talkingHEADS-typisch)

```css
.check-list li {
  font-family: 'Roboto', sans-serif;
  font-size: 16px;
  color: rgba(255,255,255,0.9);  /* auf dunklem BG */
  padding: 8px 0 8px 32px;
  position: relative;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}

.check-list li::before {
  content: '✓';
  position: absolute;
  left: 0;
  color: #EA9413;
  font-weight: 700;
  font-size: 16px;
}
```

---

## 10. Logo-Band / Partner-Scroll

Wiederkehrendes Element: Horizontales Infinite-Scroll-Band mit Logos/Badges auf weißem oder hellgrauem Hintergrund.

```css
.logo-band {
  overflow: hidden;
  padding: 24px 0;
  background: #ffffff;
  border-top: 1px solid #ebebeb;
  border-bottom: 1px solid #ebebeb;
}

.logo-band-track {
  display: flex;
  gap: 48px;
  align-items: center;
  animation: scroll-logos 30s linear infinite;
  width: max-content;
}

@keyframes scroll-logos {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}
```

---

## 11. Footer

```css
.footer {
  background: #0d0d0d;
  color: rgba(255,255,255,0.7);
  padding: 60px 24px 32px;
  font-family: 'Roboto', sans-serif;
  font-size: 14px;
}

.footer-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 48px;
  max-width: 1200px;
  margin: 0 auto 40px;
}

.footer-heading {
  font-family: 'Rubik', sans-serif;
  font-weight: 700;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #ffffff;
  margin-bottom: 16px;
}

.footer a {
  color: rgba(255,255,255,0.6);
  text-decoration: none;
  display: block;
  margin-bottom: 8px;
}

.footer a:hover { color: #EA9413; }

.footer-bottom {
  border-top: 1px solid rgba(255,255,255,0.1);
  padding-top: 24px;
  text-align: center;
  font-size: 12px;
  color: rgba(255,255,255,0.4);
}
```

---

## 12. Formular-Elemente

```css
.form-group {
  margin-bottom: 20px;
}

.form-label {
  font-family: 'Rubik', sans-serif;
  font-weight: 600;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #0e51a0;
  display: block;
  margin-bottom: 8px;
}

.form-input {
  width: 100%;
  padding: 14px 16px;
  font-family: 'Roboto', sans-serif;
  font-size: 15px;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  background: #ffffff;
  color: #0d0d0d;
  transition: border-color 0.2s ease;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: #0e51a0;
}
```

---

## 13. Responsive Breakpoints

```css
/* Desktop Large */
@media (min-width: 1200px) { /* max-width: 1200px container */ }

/* Desktop */
@media (max-width: 1024px) { /* Navigation anpassen */ }

/* Tablet */
@media (max-width: 768px) {
  /* Grids → 1 Spalte */
  /* Hero: font-size reduzieren */
  /* Padding: 48px 16px */
}

/* Mobile */
@media (max-width: 480px) {
  /* Hero H1: max 28px */
  /* Buttons: 100% Breite */
  /* Padding: 40px 16px */
}
```

---

## 14. Ton & Markenprinzipien (für Content)

- **Sprache:** Deutsch, Duzen ("Du", "Dein", "Dich" — immer groß)
- **Ton:** Direkt, energetisch, motivierend, keine Weichzeichner
- **Headline-Stil:** ALL CAPS, kurze Schlagwörter, Ausrufezeichen
- **Zahlen immer mit Kontext:** `20 Jahre`, `90 Tage`, `360°`, `10x`
- **System-Vokabular:** 360° System, Rocket Tools, Game Plan, Level Up, Full Run, Test Run, Autopilot
- **Emojis:** Sparsam und gezielt: 🚀 für Skalierung, ✓ für Features, 💬 für Support

---

## 15. Zusammenfassung: Quick-Reference

```
Primärblau:   #0e51a0
Orange/CTA:   #EA9413
Dunkelblau:   #072f6b
Hintergrund:  #f5f5f5 (hell) / #0d0d0d (dunkel)

Überschriften: Rubik, Uppercase, Bold–Black (700–900)
Fließtext:     Roboto, Regular (400), 16px, Zeilenhöhe 1.6

Karten:        border-radius 12px, Box-Shadow blau-tinted
CTAs:          Orange (primär), Blau (sekundär), Ghost (auf dunkel)
Border-Akzent: 4px solid #EA9413

Max-Breite:    1200px
Sektion-Padding: 80px 24px (Desktop) / 48px 16px (Mobile)
```
