import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { SiteLogo } from "@/components/site-brand";

const featureCards = [
  {
    icon: "dialog",
    title: "EINWANDBEHANDLUNG",
    text: "Trainiere Antworten auf echte Einwände und sichere Dir mehr Abschlüsse in kritischen Momenten.",
  },
  {
    icon: "feedback",
    title: "LIVE-FEEDBACK",
    text: "Erhalte direkt im Gespräch klare Hinweise zu Wirkung, Struktur und Gesprächsführung.",
  },
  {
    icon: "target",
    title: "PITCH-OPTIMIERUNG",
    text: "Schärfe Deine Argumentation und bring Dein Angebot präzise auf den Punkt.",
  },
  {
    icon: "voice",
    title: "TONANALYSE",
    text: "Verstehe, wie Stimme, Tempo und Tonfall auf Deine Gesprächspartner wirken.",
  },
  {
    icon: "chart",
    title: "FORTSCHRITTS-TRACKING",
    text: "Sieh messbar, wie sich Deine Performance von Session zu Session entwickelt.",
  },
  {
    icon: "system",
    title: "INDIVIDUELLE SZENARIEN",
    text: "Trainiere auf Deine Branche, Dein Team und Deine Zielgruppe zugeschnittene Fälle.",
  },
];

const problemCards = [
  {
    icon: "trend",
    title: "SCHWACHE ABSCHLUSSQUOTEN",
    text: "Wenn Verkaufsgespräche nicht sauber geführt werden, bleibt zu viel Umsatz auf der Strecke. Genau hier entscheidet sich, ob Interesse zu Abschluss wird.",
  },
  {
    icon: "training",
    title: "ZU WENIG TRAINING",
    text: "Sales-Gespräche werden selten regelmäßig trainiert. Ohne Wiederholung, Routine und echte Gesprächssimulation verbessert sich auch die Abschlussstärke nicht.",
  },
  {
    icon: "loop",
    title: "KEIN FEEDBACK",
    text: "Vergangene Verkaufsgespräche werden kaum analysiert. Mit Situationscoaching erkennt die KI, wo Abschlüsse verloren gehen - und was beim nächsten Gespräch besser laufen muss.",
  },
];

const steps = [
  {
    number: "01",
    title: "PASSENDES SEAT PAKET AUSWÄHLEN",
    text: "Wähle das Seat-Paket, das zu Deinem Team, Deinem Trainingsbedarf und Deinem Wachstum passt.",
  },
  {
    number: "02",
    title: "ABO BEI COPECART EINRICHTEN",
    text: "Richte Dein Abo über unseren Kooperationspartner CopeCart sauber und unkompliziert ein.",
  },
  {
    number: "03",
    title: "FIRMA IM TALKINGHEADS SALES TRAINER REGISTRIEREN",
    text: "Lege Dein Unternehmen im System an, damit Dein Team direkt mit dem passenden Setup starten kann.",
  },
  {
    number: "04",
    title: "KI SALES TRAINING STARTEN",
    text: "Starte mit realistischen Gesprächssimulationen und mache erste Fortschritte sofort messbar.",
  },
];

const testimonials = [
  {
    quote:
      "Unsere Trainer waren fachlich stark, aber im Abschluss oft zu unsicher. Durch das regelmäßige Training mit dem talkingHEADS Sales Trainer wurden Einwände sauberer behandelt - und die Abschlussquote ist innerhalb weniger Wochen deutlich gestiegen.",
    name: "Martin K.",
    role: "Studioinhaber",
  },
  {
    quote:
      "Wir konnten endlich nachvollziehen, warum Gespräche verloren gehen. Das Situationscoaching zeigt konkret, welche Fragen fehlen und wo der Abschluss kippt. Das hat sich direkt im Umsatz bemerkbar gemacht.",
    name: "Sandra M.",
    role: "Geschäftsführerin",
  },
  {
    quote:
      "Für unser Vertriebsteam ist der Sales Trainer wie ein Sparringspartner, der immer verfügbar ist. Neue Mitarbeiter kommen schneller ins Gespräch, bestehende Verkäufer schließen sicherer ab.",
    name: "Daniel R.",
    role: "Vertriebsleiter",
  },
];

const pricingCards = [
  {
    eyebrow: "SOLO-LIZENZ",
    name: "Solo-Lizenz",
    price: "29,70 € / Monat",
    seats: "1 Seat",
    text: "Für einzelne Verkäufer, Coaches oder Inhaber, die ihre Abschlussgespräche gezielt verbessern wollen.",
    note: "zzgl. USt. · monatlich kündbar",
    button: "Solo starten",
    href: "/register",
    featured: false,
  },
  {
    eyebrow: "TEAM-LIZENZ",
    name: "Team-Lizenz",
    badge: "Beliebt",
    price: "97 € / Monat",
    seats: "10 Seats",
    text: "Für kleine Vertriebsteams, Studios oder Agenturen, die Sales-Gespräche regelmäßig trainieren und einheitlich verbessern wollen.",
    note: "zzgl. USt. · monatlich kündbar",
    button: "Team starten",
    href: "/register",
    featured: true,
  },
  {
    eyebrow: "COMPANY-LIZENZ",
    name: "Company-Lizenz",
    price: "297 € / Monat",
    seats: "50 Seats",
    text: "Für größere Teams, die Sales-Training skalieren, Gesprächsqualität messbar verbessern und Abschlussquoten systematisch steigern wollen.",
    note: "zzgl. USt. · monatlich kündbar",
    button: "Company starten",
    href: "/register",
    featured: false,
  },
];

export const metadata: Metadata = {
  title: "Landing",
  description: "talkingHEADS Landing Page für KI-gestütztes Sales Training.",
};

function SectionHeading({ eyebrow, title, dark = false }: { eyebrow?: string; title: string; dark?: boolean }) {
  return (
    <div className="section-heading">
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h2 className={dark ? "heading heading-dark" : "heading"}>{title}</h2>
    </div>
  );
}

function PrimaryButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link className="btn btn-primary" href={href}>
      {children}
    </Link>
  );
}

function GhostButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link className="btn btn-ghost" href={href}>
      {children}
    </Link>
  );
}

function LandingIcon({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    dialog: (
      <>
        <path d="M5 6.5h14v8H9l-4 3v-11Z" />
        <path d="M8 10h8" />
        <path d="M8 12.5h5" />
      </>
    ),
    feedback: (
      <>
        <path d="M12 3.5v7h5L10.5 20v-7h-5L12 3.5Z" />
      </>
    ),
    target: (
      <>
        <circle cx="12" cy="12" r="7.5" />
        <circle cx="12" cy="12" r="3.5" />
        <path d="M12 2.5v3" />
        <path d="M21.5 12h-3" />
      </>
    ),
    voice: (
      <>
        <path d="M12 4.5a3 3 0 0 0-3 3v4a3 3 0 0 0 6 0v-4a3 3 0 0 0-3-3Z" />
        <path d="M6.5 11.5a5.5 5.5 0 0 0 11 0" />
        <path d="M12 17v3" />
      </>
    ),
    chart: (
      <>
        <path d="M4.5 18.5h15" />
        <path d="M6.5 15l3.5-3.5 3 2 4.5-6" />
        <path d="M15.5 7.5h2v2" />
      </>
    ),
    system: (
      <>
        <path d="M8 4.5h8v5H8z" />
        <path d="M5 14.5h6v5H5z" />
        <path d="M13 14.5h6v5h-6z" />
        <path d="M12 9.5v2.5" />
        <path d="M8 12h8" />
      </>
    ),
    trend: (
      <>
        <path d="M4.5 6.5 10 12l3-3 6.5 6.5" />
        <path d="M15.5 15.5h4v-4" />
      </>
    ),
    training: (
      <>
        <path d="M5 6.5h14v11H5z" />
        <path d="M8 10h8" />
        <path d="M8 13h5" />
      </>
    ),
    loop: (
      <>
        <path d="M17.5 8.5A6.5 6.5 0 0 0 6 7" />
        <path d="M17.5 4.5v4h-4" />
        <path d="M6.5 15.5A6.5 6.5 0 0 0 18 17" />
        <path d="M6.5 19.5v-4h4" />
      </>
    ),
  };

  return (
    <svg className="landing-icon" viewBox="0 0 24 24" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function PricingButton({ href, children, featured = false }: { href: string; children: ReactNode; featured?: boolean }) {
  return (
    <Link className={`btn btn-pricing pricing-card__cta ${featured ? "btn-pricing--featured" : ""}`} href={href}>
      {children}
    </Link>
  );
}

function Header() {
  return (
    <header className="site-header">
      <div className="landing-container site-header__inner">
        <Link href="#top" className="brand" aria-label="talkingHEADS Startseite">
          <SiteLogo priority className="brand__logo" />
        </Link>

        <nav className="site-nav" aria-label="Hauptnavigation">
          <a href="#top" className="site-nav__link">
            Startseite
          </a>
          <a href="#loesungen" className="site-nav__link">
            Vorteile
          </a>
          <a href="#branchen" className="site-nav__link">
            Für wen
          </a>
          <a href="#preise" className="site-nav__link">
            Preise
          </a>
        </nav>

        <Link className="btn btn-primary site-header__cta" href="#preise">
          Jetzt starten!
        </Link>

        <details className="mobile-nav">
          <summary className="mobile-nav__toggle" aria-label="Navigation öffnen">
            <span aria-hidden="true" />
            <span aria-hidden="true" />
            <span aria-hidden="true" />
          </summary>
          <nav className="mobile-nav__panel" aria-label="Mobile Hauptnavigation">
            <a href="#top" className="mobile-nav__link">
              Startseite
            </a>
            <a href="#loesungen" className="mobile-nav__link">
              Vorteile
            </a>
            <a href="#branchen" className="mobile-nav__link">
              Für wen
            </a>
            <a href="#preise" className="mobile-nav__link">
              Preise
            </a>
            <a href="#preise" className="btn btn-primary mobile-nav__cta">
              Jetzt starten!
            </a>
          </nav>
        </details>
      </div>
    </header>
  );
}

function FooterIcon({ label, href, children }: { label: string; href: string; children: ReactNode }) {
  return (
    <a className="footer-social" href={href} aria-label={label}>
      {children}
    </a>
  );
}

export default function LandingPage() {
  return (
    <main className="landingPage">
      <div id="top" />
      <Header />

      <section className="hero-section landing-section">
        <div className="landing-container hero-grid">
          <div className="hero-copy">
            <p className="hero-label">KI-GESTÜTZTES SALES TRAINING</p>
            <h1 className="hero-headline">MACHE DEIN TEAM ZUR VERTRIEBSRAKETE!</h1>
            <p className="hero-subline">MIT DEM 360° KI-SALES-TRAINER</p>
            <p className="hero-body">
              Kein Rollenspiel mit Kollegen. Kein teures Präsenztraining. Dein Team trainiert 24/7 mit unserem
              KI-Trainer - realistisch, messbar, skalierbar.
            </p>

            <ul className="hero-checklist" aria-label="Vorteile">
              <li>LIVE-FEEDBACK IN ECHTZEIT</li>
              <li>EINWANDBEHANDLUNG AUF HÖCHSTEM NIVEAU</li>
              <li>INDIVIDUELLES COACHING DURCH KI</li>
              <li>MESSBARE FORTSCHRITTE AUF KNOPFDRUCK</li>
            </ul>

            <div className="hero-buttons">
              <PrimaryButton href="#preise">Jetzt durchstarten!</PrimaryButton>
              <GhostButton href="#loesungen">Erfahre mehr!</GhostButton>
            </div>
          </div>

        </div>
      </section>

      <section className="problem-section landing-section">
        <div className="landing-container">
          <SectionHeading title="DAS HÄLT DEINEN VERTRIEB AM BODEN" />
          <div className="grid-3 problem-grid">
            {problemCards.map((card) => (
              <article key={card.title} className="card card-feature problem-card">
                <div className="card-icon" aria-hidden="true">
                  <LandingIcon name={card.icon} />
                </div>
                <h3 className="card-title">{card.title}</h3>
                <p className="card-text">{card.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="loesungen" className="feature-section landing-section">
        <div className="landing-container">
          <SectionHeading eyebrow="DIE LÖSUNG" title="DEIN KI-SALES-TRAINER - 24/7 VERFÜGBAR" dark />
          <div className="grid-3 feature-grid">
            {featureCards.map((card) => (
              <article key={card.title} className="card-glass feature-card">
                <div className="feature-card__icon" aria-hidden="true">
                  <LandingIcon name={card.icon} />
                </div>
                <h3 className="feature-card__title">{card.title}</h3>
                <p className="feature-card__text">{card.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="system" className="process-section landing-section">
        <div className="landing-container">
          <SectionHeading title="IN 4 SCHRITTEN ZUM VERTRIEBSERFOLG" />
          <div className="grid-4 steps-grid">
            {steps.map((step) => (
              <article key={step.number} className="card step-card">
                <div className="step-card__number" aria-hidden="true">
                  {step.number}
                </div>
                <h3 className="step-card__title">{step.title}</h3>
                <p className="step-card__text">{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="branchen" className="testimonial-section landing-section">
        <div className="landing-container">
          <SectionHeading title="STIMMEN AUS DER PRAXIS" />
          <div className="grid-3 testimonial-grid">
            {testimonials.map((testimonial) => (
              <article key={testimonial.name} className="card-testimonial">
                <p className="testimonial-quote">{testimonial.quote}</p>
                <div className="testimonial-meta">
                  <p className="testimonial-name">{testimonial.name}</p>
                  <p className="testimonial-role">{testimonial.role}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="erfolge" className="cta-section landing-section">
        <div className="landing-container">
          <div className="cta-banner">
            <h2 className="cta-heading">READY FOR TAKE OFF?</h2>
            <p className="cta-subline">STARTE JETZT DEIN KOSTENLOSES STRATEGIEGESPRÄCH</p>
            <GhostButton href="#top">JETZT KOSTENLOS BEWERBEN!</GhostButton>
          </div>
        </div>
      </section>

      <section id="preise" className="pricing-section landing-section">
        <div className="landing-container">
          <SectionHeading title="Wähle die Lizenz, die zu deinem Vertrieb passt." />
          <p className="pricing-subheading">
            Starte schlank oder trainiere dein Team mit einem klaren KI-System für bessere Sales-Gespräche, stärkere
            Abschlüsse und mehr Umsatz.
          </p>
          <div className="pricing-grid">
            {pricingCards.map((card) => (
              <article key={card.name} className={`pricing-card ${card.featured ? "pricing-card--featured" : ""}`}>
                <p className="pricing-card__eyebrow">{card.eyebrow}</p>
                <div className="pricing-card__header">
                  <h3 className="pricing-card__name">{card.name}</h3>
                  {card.badge ? <span className="pricing-card__badge">{card.badge}</span> : null}
                </div>
                <div className="pricing-card__price">{card.price}</div>
                <div className="pricing-card__seats">{card.seats}</div>
                <p className="pricing-card__text">{card.text}</p>
                <p className="pricing-card__note">{card.note}</p>
                <PricingButton href={card.href} featured={card.featured}>
                  {card.button}!
                </PricingButton>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="landing-container footer-grid">
          <div>
            <Link href="#top" className="brand brand--footer" aria-label="talkingHEADS Startseite">
              <SiteLogo variant="white" className="brand__logo brand__logo--footer" />
            </Link>
            <p className="footer-description">
              KI-gestütztes Sales Training für Teams, die schneller lernen, sauberer abschließen und messbar wachsen
              wollen.
            </p>
          </div>

          <div>
            <p className="footer-heading">ONLINE ACADEMY</p>
            <ul className="footer-links">
              <li>
                <Link href="/">THE GAME CHANGE</Link>
              </li>
              <li>
                <Link href="/">SELL AS HELL</Link>
              </li>
              <li>
                <Link href="/">FLIP FLOP CEO</Link>
              </li>
              <li>
                <Link href="/">90 DAY GAME PLAN</Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="footer-heading">KONTAKT</p>
            <address className="footer-contact">
              Geppert Consulting Group GmbH
              <br />
              Schnabelstr. 1, 45134 Essen
              <br />
              <a href="tel:020199950905">0201/99950905</a>
              <br />
              <a href="mailto:info@talkingheads.business">info@talkingheads.business</a>
            </address>
            <div className="footer-socials" aria-label="Social Media">
              <FooterIcon label="FACEBOOK" href="#top">
                F
              </FooterIcon>
              <FooterIcon label="INSTAGRAM" href="#top">
                I
              </FooterIcon>
              <FooterIcon label="YOUTUBE" href="#top">
                Y
              </FooterIcon>
              <FooterIcon label="TIKTOK" href="#top">
                T
              </FooterIcon>
              <FooterIcon label="LINKEDIN" href="#top">
                L
              </FooterIcon>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
