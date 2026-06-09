import Image from "next/image";
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
    href: "/copecart/checkout/solo",
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
    href: "/copecart/checkout/team_3",
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
    href: "/copecart/checkout/team_5",
    featured: false,
  },
];

const footerWebsiteLinks = [
  { label: "talkingHEADS Business", href: "https://talkingheads.business/" },
  { label: "talkingHEADS Consulting", href: "https://talkingheads.consulting/" },
  { label: "talkingHEADS Academy", href: "https://talkingheads.academy/" },
];

const footerLegalLinks = [
  { label: "Datenschutz", href: "https://talkingheads.business/datenschutz" },
  { label: "Impressum", href: "https://talkingheads.business/impressum" },
  { label: "AGB", href: "https://talkingheads.business/agb" },
];

const footerSocialLinks = [
  { label: "Facebook", href: "https://www.facebook.com/talkingheadsdeutschland", icon: "facebook" },
  { label: "Instagram", href: "https://www.instagram.com/talkingheads_academy/?hl=de", icon: "instagram" },
  { label: "YouTube", href: "https://www.youtube.com/channel/UClkJA1h4oezrkgi9kpp8oqw", icon: "youtube" },
  { label: "TikTok", href: "https://www.tiktok.com/@talkingheads_academy", icon: "tiktok" },
  { label: "LinkedIn", href: "https://talkingheads.business/", icon: "linkedin" },
  { label: "Spotify", href: "https://talkingheads.business/", icon: "spotify" },
] as const;

export const metadata: Metadata = {
  title: {
    absolute: "talkingHEADS Sales Trainer",
  },
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

function FooterSocialIcon({ name }: { name: (typeof footerSocialLinks)[number]["icon"] }) {
  switch (name) {
    case "facebook":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M13.5 8.4h2.1V5.5H13.5c-1.8 0-3.1 1.4-3.1 3.4v1.7H8.2v2.8h2.2V19h3v-5.6h2.4l.5-2.8h-2.9V9c0-.4.3-.6.8-.6Z"
            fill="currentColor"
          />
        </svg>
      );
    case "instagram":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="5" y="5" width="14" height="14" rx="4" fill="none" stroke="currentColor" strokeWidth="1.7" />
          <circle cx="12" cy="12" r="3.3" fill="none" stroke="currentColor" strokeWidth="1.7" />
          <circle cx="16.6" cy="7.4" r="1.1" fill="currentColor" />
        </svg>
      );
    case "youtube":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="4" y="6.5" width="16" height="11" rx="3.2" fill="none" stroke="currentColor" strokeWidth="1.7" />
          <path d="M10 9.3v5.4l4.8-2.7L10 9.3Z" fill="currentColor" />
        </svg>
      );
    case "tiktok":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M13.8 5.5c.5 1.8 1.8 3.2 3.6 3.7v2.2c-1.2 0-2.4-.3-3.4-.9v4.8c0 2.5-2 4.4-4.5 4.4S5 18 5 15.5s2-4.4 4.5-4.4c.3 0 .5 0 .8.1v2.4a2.1 2.1 0 0 0-.8-.2 2.1 2.1 0 1 0 2.1 2.1V4.8h2.2v.7Z"
            fill="currentColor"
          />
        </svg>
      );
    case "linkedin":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M6.3 8.4H4.1v11.1h2.2V8.4ZM5.2 4.5A1.3 1.3 0 1 0 5.2 7a1.3 1.3 0 0 0 0-2.5Zm5.7 3.9H8.7v11.1h2.2v-5.8c0-1.5.5-2.7 1.9-2.7 1.2 0 1.8.9 1.8 2.6v5.9h2.2v-6.4c0-3.3-1.8-4.9-4-4.9-1.4 0-2.3.8-2.9 1.7V8.4Z"
            fill="currentColor"
          />
        </svg>
      );
    case "spotify":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="8.1" fill="none" stroke="currentColor" strokeWidth="1.7" />
          <path
            d="M8 10.1c2.5-.6 5.5-.4 8 .6M8.7 12.5c2-.4 4.5-.3 6.3.5M9.2 14.8c1.5-.2 3.2 0 4.6.6"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.6"
          />
        </svg>
      );
    default:
      return null;
  }
}

function FooterSocialLink({
  label,
  href,
  icon,
}: {
  label: string;
  href: string;
  icon: (typeof footerSocialLinks)[number]["icon"];
}) {
  return (
    <a className="footer-social" href={href} aria-label={label} target="_blank" rel="noopener noreferrer">
      <FooterSocialIcon name={icon} />
    </a>
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

        <Link className="btn btn-primary site-header__cta" href="/login">
          Login
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
            <a href="/login" className="btn btn-primary mobile-nav__cta">
              Login
            </a>
          </nav>
        </details>
      </div>
    </header>
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

      <section id="erfolge" className="insights-section landing-section">
        <div className="landing-container">
          <SectionHeading
            eyebrow="Einblicke"
            title="So sieht der Sales Trainer im Alltag aus."
          />
          <p className="insights-subheading">
            Dashboard und Chat zeigen, wie Teams Sessions starten, Training strukturieren und Gespräche im Detail
            verbessern.
          </p>
          <div className="insights-grid">
            <figure className="insight-card insight-card--dashboard">
              <div className="insight-card__image-wrap">
                <Image
                  src="/dashboard.png"
                  alt="Dashboard des talkingHEADS Sales Trainer mit Trainingsstart und zwei Aktionskarten"
                  fill
                  className="insight-card__image"
                  sizes="(min-width: 1024px) 50vw, 100vw"
                />
              </div>
              <figcaption className="insight-card__body">
                <p className="insight-card__eyebrow">Dashboard</p>
                <h3 className="insight-card__title">Training schnell starten und Überblick behalten.</h3>
                <p className="insight-card__text">
                  Von der Startseite aus kommen Nutzer direkt in passende Trainingsmodule und sehen sofort den
                  aktuellen Status ihres Setups.
                </p>
              </figcaption>
            </figure>

            <figure className="insight-card insight-card--chat">
              <div className="insight-card__image-wrap">
                <Image
                  src="/chat.png"
                  alt="Chatfenster des talkingHEADS Sales Trainer mit laufender Trainingssession und Nachrichteneingabe"
                  fill
                  className="insight-card__image"
                  sizes="(min-width: 1024px) 50vw, 100vw"
                />
              </div>
              <figcaption className="insight-card__body">
                <p className="insight-card__eyebrow">Sales Training</p>
                <h3 className="insight-card__title">Gespräche realistisch trainieren und präzise führen.</h3>
                <p className="insight-card__text">
                  Im Chat läuft das eigentliche Training: klare Inputs, strukturierte Reaktionen und ein Umfeld, das
                  auf echte Gesprächssituationen vorbereitet.
                </p>
              </figcaption>
            </figure>
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
            <address className="footer-contact">
              Geppert Consulting Group GmbH
              <br />
              Schnabelstr. 1, 45134 Essen
              <br />
              <a href="tel:020199950905">0201/99950905</a>
              <br />
              <a href="mailto:info@talkingheads.business">info@talkingheads.business</a>
            </address>
          </div>

          <div>
            <p className="footer-heading">WEBSEITEN</p>
            <ul className="footer-links">
              {footerWebsiteLinks.map((link) => (
                <li key={link.label}>
                  <a href={link.href} target="_blank" rel="noopener noreferrer">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="footer-heading">LEGAL</p>
            <ul className="footer-links">
              {footerLegalLinks.map((link) => (
                <li key={link.label}>
                  <a href={link.href} target="_blank" rel="noopener noreferrer">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="footer-heading">SOCIAL MEDIA</p>
            <div className="footer-socials" aria-label="Social Media">
              {footerSocialLinks.map((link) => (
                <FooterSocialLink key={link.label} label={link.label} href={link.href} icon={link.icon} />
              ))}
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
