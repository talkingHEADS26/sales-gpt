import type { Metadata } from "next";
import Link from "next/link";
import { Plus_Jakarta_Sans } from "next/font/google";

import { RoiCalculatorSection } from "@/components/landing/roi-calculator-section";
import { PublicSiteHeader } from "@/components/public-site-header";
import { EnterpriseInquiryForm } from "./enterprise-inquiry-form";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  description:
    "talkingHEADS Sales Trainer trainiert reale Verkaufsgespräche mit direktem Feedback, klarer Entwicklung und skalierbaren Lizenzen für Einzelpersonen und Teams.",
};

const benefits = [
  "Echte Gesprächssimulation",
  "Direktes Feedback",
  "Messbarer Sales-Fortschritt",
];

const proofPoints = [
  {
    title: "Trainieren wie im echten Call",
    description:
      "Praxisnahe Szenarien bringen dein Team in relevante Gesprächssituationen statt in theoretische Übungen.",
  },
  {
    title: "Feedback, das sofort weiterhilft",
    description:
      "Erhalte direkt nach jeder Session klares Feedback zu Wirkung, Argumentation und Abschlussstärke.",
  },
  {
    title: "Fortschritt, der sichtbar wird",
    description:
      "Erkenne Entwicklung über mehrere Trainings hinweg und schaffe einen belastbaren Sales-Standard im Team.",
  },
];

const moduleSections = [
  {
    title: "Situationsanalyse",
    headline: "Vergangene Gespräche werden zu deinem nächsten Trainingsvorsprung.",
    paragraphs: [
      "Nicht jedes verlorene Gespräch ist ein verlorener Kunde. Oft steckt darin genau der Hinweis, den dein Team gebraucht hätte.",
      "Mit der Situationsanalyse können Trainer echte Beratungssituationen reflektieren: Was wurde gesagt? Wo ist Vertrauen verloren gegangen? Welche Frage hat gefehlt? Und welcher nächste Satz hätte die Gesprächsführung gedreht?",
      "talkingHEADS Sales Trainer liefert realistisches, direkt verwertbares Feedback – damit aus schwierigen Situationen messbarer Fortschritt wird.",
    ],
    highlights: [
      "Analyse realer Verkaufssituationen",
      "Feedback zu Ton, Struktur und Abschlusschance",
      "Konkrete bessere Formulierungen für das nächste Gespräch",
    ],
  },
  {
    title: "Telefontermin-Setter",
    headline: "Mehr Termine am Telefon. Ohne Skript-Gestotter.",
    paragraphs: [
      "Der erste Abschluss passiert oft nicht im Studio, sondern am Telefon. Genau dort entscheidet sich, ob aus einer Anfrage ein echter Termin wird.",
      "Der Telefontermin-Setter trainiert dein Team darin, eingehende Leads souverän zu führen, Interesse zu verdichten und verbindliche Termine zu vereinbaren – klar, freundlich und ohne Druck.",
      "So wird aus „Ich wollte nur mal fragen“ deutlich öfter ein gebuchter Beratungstermin.",
    ],
    highlights: [
      "Training für Lead-Anrufe und Terminvereinbarung",
      "Bessere Fragen statt auswendig gelernter Skripte",
      "Mehr Verbindlichkeit im ersten Kontakt",
    ],
  },
  {
    title: "Beschwerdemanagement / Happy Customer Trainer",
    headline: "Beschwerden werden nicht verwaltet. Sie werden trainiert.",
    paragraphs: [
      "Unzufriedene Mitglieder sind kein Störfall. Sie sind ein Moment, in dem Bindung entstehen oder endgültig verloren gehen kann.",
      "Mit dem Happy Customer Trainer übt dein Team, Beschwerden ruhig aufzunehmen, sauber zu klären und professionell zu reagieren – auch dann, wenn der Ton schwierig wird.",
      "So entsteht mehr Sicherheit im Umgang mit Kritik, weniger Eskalation und ein Team, das auch in unangenehmen Gesprächen souverän bleibt.",
    ],
    highlights: [
      "Training für Beschwerden und schwierige Kundensituationen",
      "Ruhige, professionelle Reaktion auf Kritik",
      "Mehr Sicherheit für Team und Mitgliederbindung",
    ],
  },
] as const;

const pricingPlans = [
  {
    name: "Solo-Lizenz",
    seatLabel: "Single Seat",
    price: "49 €",
    period: "/ Monat",
    description: "Für einzelne Seller, die ihre Abschlussquote gezielt steigern wollen.",
    checkoutUrl: "https://copecart.com/products/f69450a5/checkout",
    featured: false,
  },
  {
    name: "3er Seat",
    seatLabel: "3er Seat",
    price: "79 €",
    period: "/ Monat",
    description: "Ideal fuer kleine Vertriebsteams, die mit einem einheitlichen Trainingsstandard arbeiten.",
    checkoutUrl: "https://copecart.com/products/22c68511/checkout",
    featured: true,
  },
  {
    name: "5er Seat",
    seatLabel: "5er Seat",
    price: "149 €",
    period: "/ Monat",
    description: "Mehr Kapazität für wachsende Teams mit Fokus auf wiederholbare Performance.",
    checkoutUrl: "https://copecart.com/products/2a10ffec/checkout",
    featured: false,
  },
  {
    name: "Enterprise",
    seatLabel: "Custom Setup",
    price: "Let's talk",
    period: "",
    description: "Für größere Teams und individuelle Anforderungen.",
    featured: false,
  },
];

export default function Home() {
  return (
    <main
      className={`${plusJakartaSans.className} min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#dcecff_0%,#f7fbff_38%,#f6f8fc_72%,#eef3f9_100%)] text-[#707070]`}
    >
      <div className="relative isolate">
        <div className="absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[linear-gradient(135deg,rgba(14,81,160,0.18),rgba(14,81,160,0.03)_45%,rgba(255,255,255,0)_72%)]" />
        <div className="absolute left-1/2 top-24 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-[#0e51a0]/12 blur-3xl" />
        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 pb-16 pt-5 sm:px-6 sm:pb-20 lg:px-8">
          <PublicSiteHeader />

          <section className="relative flex flex-1 items-center py-12 sm:py-16 lg:py-20">
            <div className="grid w-full gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:items-center">
              <div className="max-w-3xl">
                <div className="inline-flex items-center rounded-full border border-[#0e51a0]/15 bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#0e51a0] shadow-[0_10px_30px_rgba(14,81,160,0.08)] backdrop-blur">
                  Sales-Training für echte Abschlüsse
                </div>
                <h1 className="mt-6 text-5xl font-semibold tracking-[-0.06em] text-balance text-[#707070] sm:text-6xl lg:text-7xl">
                  <span className="block">talkingHEADS Sales Trainer</span>
                  <span className="mt-4 block text-[0.5em] font-medium leading-tight tracking-[-0.04em] text-[#707070] sm:text-[0.44em]">
                    Trainiere Verkaufsgespräche interaktiv, präzise und mit dem Fokus auf messbar bessere Abschlüsse.
                  </span>
                </h1>
                <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
                  talkingHEADS Sales Trainer gibt dir ein Trainingssystem, das echte Gesprächsdynamik abbildet, Stärken und Schwachstellen sichtbar macht und dein Team schneller auf konstante Performance bringt.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <a
                    href="#pricing"
                    className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#0e51a0] px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_44px_rgba(14,81,160,0.32)] transition hover:-translate-y-0.5 hover:bg-[#0b478b] sm:w-auto"
                  >
                    Kaufen
                  </a>
                  <Link
                    href="/login"
                    className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-slate-200 bg-white/90 px-6 py-3 text-sm font-semibold text-[#707070] shadow-[0_12px_34px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:border-[#0e51a0]/30 hover:text-[#0e51a0] sm:w-auto"
                  >
                    Einloggen
                  </Link>
                  <EnterpriseInquiryForm
                    buttonLabel="Demo buchen"
                    inquiryType="demo"
                    className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#0e51a0] px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_44px_rgba(14,81,160,0.32)] transition hover:-translate-y-0.5 hover:bg-[#0b478b] sm:w-auto"
                  />
                </div>
                <p className="mt-4 text-sm font-medium text-slate-500">
                  Sichere dir jetzt den Trainingsvorsprung, der aus guten Gesprächen bessere Abschlüsse macht.
                </p>

                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  {benefits.map((benefit) => (
                    <div
                      key={benefit}
                      className="rounded-2xl border border-white/80 bg-white/75 px-4 py-4 text-sm font-medium text-[#707070] shadow-[0_16px_40px_rgba(15,23,42,0.06)] backdrop-blur"
                    >
                      <span className="mb-3 block h-2 w-12 rounded-full bg-[#0e51a0]" />
                      {benefit}
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative">
                <div className="absolute -left-6 top-10 hidden h-28 w-28 rounded-full bg-[#0e51a0]/10 blur-2xl sm:block" />
                <div className="rounded-[2rem] border border-white/80 bg-white/82 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.14)] backdrop-blur sm:p-6">
                  <div className="rounded-[1.6rem] border border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f6f9fd_100%)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-[#707070]">
                          Sales Session Review
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          talkingHEADS Sales Trainer analysiert Wirkung, Klarheit und Nähe zum Abschluss.
                        </p>
                      </div>
                      <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        Live Feedback
                      </div>
                    </div>

                    <div className="mt-6 space-y-4">
                      {[
                        ["Bedarfsanalyse", "Präzise Fragen, gute Struktur", "91"],
                        ["Argumentation", "Nutzen klar, Einwände noch schärfer auflösen", "84"],
                        ["Closing", "Starker Fortschritt mit direkterem Abschlussimpuls", "88"],
                      ].map(([label, text, score]) => (
                        <div
                          key={label}
                          className="rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_12px_26px_rgba(15,23,42,0.05)]"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="text-sm font-semibold text-[#707070]">{label}</p>
                              <p className="mt-1 text-sm leading-6 text-slate-500">{text}</p>
                            </div>
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0e51a0]/8 text-sm font-semibold text-[#0e51a0]">
                              {score}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 rounded-2xl bg-[#0e51a0] px-5 py-4 text-white shadow-[0_18px_36px_rgba(14,81,160,0.28)]">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
                        Ergebnis
                      </p>
                      <p className="mt-2 text-lg font-semibold">
                        Mehr Sicherheit im Gespräch. Mehr Kontrolle im Abschluss.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <RoiCalculatorSection />

          <section className="pb-10 pt-4 sm:pb-16">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#0e51a0]">
                Warum talkingHEADS Sales Trainer
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[#707070] sm:text-4xl">
                Sales-Training, das sich nach echtem Fortschritt anfühlt.
              </h2>
            </div>
            <div className="mt-10 grid gap-4 lg:grid-cols-3">
              {proofPoints.map((point) => (
                <article
                  key={point.title}
                  className="rounded-[1.75rem] border border-white/80 bg-white/82 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.07)] backdrop-blur"
                >
                  <div className="h-11 w-11 rounded-2xl bg-[#0e51a0]/10" />
                  <h3 className="mt-5 text-xl font-semibold tracking-[-0.03em] text-[#707070]">
                    {point.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {point.description}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className="pb-10 pt-2 sm:pb-16 sm:pt-2">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#0e51a0]">
                Mehr als ein Verkaufstrainer
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[#707070] sm:text-4xl">
                Trainiere die Gespräche, die im Studio wirklich entscheiden.
              </h2>
              <p className="mt-5 text-sm leading-7 text-slate-600 sm:text-base sm:leading-8">
                talkingHEADS Sales Trainer unterstützt dein Team nicht nur im Verkaufsgespräch. Es hilft auch bei den Situationen davor, danach und dazwischen – dort, wo aus Kommunikation echte Performance entsteht.
              </p>
            </div>

            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {moduleSections.map((module) => (
                <article
                  key={module.title}
                  className="flex h-full flex-col rounded-[1.9rem] border border-white/80 bg-white/88 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0e51a0]">
                    Modul
                  </p>
                  <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[#707070]">
                    {module.title}
                  </h3>
                  <p className="mt-4 text-lg font-semibold leading-8 tracking-[-0.02em] text-[#707070]">
                    {module.headline}
                  </p>

                  <div className="mt-4 space-y-3">
                    {module.paragraphs.map((paragraph) => (
                      <p key={paragraph} className="text-sm leading-7 text-slate-600">
                        {paragraph}
                      </p>
                    ))}
                  </div>

                  <div className="mt-6 rounded-2xl border border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f6f9fd_100%)] p-4">
                    <div className="space-y-2">
                      {module.highlights.map((highlight) => (
                        <p key={highlight} className="text-sm font-medium leading-6 text-[#707070]">
                          {highlight}
                        </p>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section id="pricing" className="pb-4 pt-6 sm:pt-10">
            <div className="flex flex-col gap-4 sm:items-end sm:justify-between lg:flex-row lg:items-end">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#0e51a0]">
                  Pricing
                </p>
                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[#707070] sm:text-4xl">
                  Wähle die Lizenz, die zu deiner aktuellen Sales-Stage passt.
                </h2>
              </div>
              <p className="max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
                Starte schlank oder rolle talkingHEADS Sales Trainer teamweit aus. Jede Option ist auf klares Training, saubere Umsetzung und schnelle Aktivierung ausgerichtet.
              </p>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {pricingPlans.map((plan) => (
                <article
                  key={plan.name}
                  className={`group flex h-full flex-col rounded-[1.9rem] border p-6 shadow-[0_18px_46px_rgba(15,23,42,0.08)] transition hover:-translate-y-1 ${
                    plan.featured
                      ? "border-[#0e51a0]/25 bg-[linear-gradient(180deg,rgba(14,81,160,0.08),rgba(255,255,255,0.97)_28%)] shadow-[0_24px_56px_rgba(14,81,160,0.14)]"
                      : "border-white/80 bg-white/88"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        {plan.seatLabel}
                      </p>
                      <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[#707070]">
                        {plan.name}
                      </h3>
                    </div>
                    {plan.featured ? (
                      <span className="rounded-full bg-[#0e51a0] px-3 py-1 text-xs font-semibold text-white">
                        Beliebt
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-8 flex-1">
                    <p className="text-4xl font-semibold tracking-[-0.05em] text-[#707070]">
                      {plan.price}
                      {plan.period ? (
                        <span className="ml-1 text-base font-medium tracking-normal text-slate-500">
                          {plan.period}
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-4 text-sm leading-7 text-slate-600">
                      {plan.description}
                    </p>
                    <p className="mt-2 text-xs text-slate-400">zzgl. USt.</p>
                  </div>

                  {plan.name === "Enterprise" ? (
                    <EnterpriseInquiryForm
                      buttonLabel="Enterprise anfragen"
                      inquiryType="enterprise"
                      className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#707070] transition hover:border-[#0e51a0]/30 hover:text-[#0e51a0]"
                    />
                  ) : (
                    <div className="mt-8">
                      <a
                        href={plan.checkoutUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex min-h-12 w-full items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition ${
                          plan.featured
                            ? "bg-[#0e51a0] text-white shadow-[0_16px_36px_rgba(14,81,160,0.28)] hover:bg-[#0b478b]"
                            : "border border-slate-200 bg-white text-[#707070] hover:border-[#0e51a0]/30 hover:text-[#0e51a0]"
                        }`}
                      >
                        Kaufen
                      </a>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
