"use client";

import Link from "next/link";
import { Rubik, Roboto } from "next/font/google";
import { motion } from "framer-motion";

const rubik = Rubik({ subsets: ["latin"], weight: ["500", "700"] });
const roboto = Roboto({ subsets: ["latin"], weight: ["400", "500", "700"] });

const benefits = [
  {
    title: "Realistische Verkaufsgespräche",
    text: "Trainiere mit KI-Kunden in echten Verkaufssituationen und wiederhole so oft du willst.",
  },
  {
    title: "Sofortiges Feedback",
    text: "Erhalte direkt nach jedem Gespräch konkrete, umsetzbare Feedbacks.",
  },
  {
    title: "Sicherer abschließen",
    text: "Verbessere deine Gesprächsführung und erhöhe deine Abschlussquote.",
  },
];

const audiences = [
  {
    title: "Fitnessstudios",
    text: "Mehr Abschlüsse bei Probetrainings und Memberships.",
  },
  {
    title: "Coaches & Berater",
    text: "Überzeuge in Beratungsgesprächen und gewinne mehr Kunden.",
  },
  {
    title: "Vertriebsteams",
    text: "Skaliere Vertriebserfolg durch professionelles Training.",
  },
];

function CtaButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[linear-gradient(180deg,#f6ab2c_0%,#EA9413_52%,#db8302_100%)] px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(234,148,19,0.35),inset_0_1px_0_rgba(255,255,255,0.35)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(234,148,19,0.45),inset_0_1px_0_rgba(255,255,255,0.4)]"
    >
      {children}
    </Link>
  );
}

function SimpleCard({ title, text }: { title: string; text: string }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.35 }}
      className="rounded-2xl border border-[#dbe7f8] bg-white p-6 shadow-[0_10px_24px_rgba(14,81,160,0.08)]"
    >
      <div className="mb-5 h-14 w-14 rounded-full bg-[linear-gradient(150deg,#1f6fcd,#0E51A0)] shadow-[0_10px_20px_rgba(14,81,160,0.26)]" />
      <h3 className={`${rubik.className} text-3xl font-semibold tracking-[-0.02em] text-[#0E51A0]`}>
        {title}
      </h3>
      <p className={`${roboto.className} mt-3 text-lg leading-8 text-[#707070]`}>{text}</p>
    </motion.article>
  );
}

function DashboardMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="overflow-hidden rounded-[1.8rem] border border-[#cadef8] bg-white shadow-[0_18px_45px_rgba(14,81,160,0.20)]"
    >
      <div className="grid min-h-[460px] lg:grid-cols-[1fr_1.45fr]">
        <aside className="bg-[linear-gradient(165deg,#0E51A0_0%,#0b4a94_70%,#0a4489_100%)] p-4 sm:p-5">
          <div className="mb-4 h-9 w-9 rounded-full border border-white/50" />
          <nav className="space-y-2">
            {[
              "Dashboard",
              "Gespräche",
              "Feedback",
              "Analysen",
              "Trainingsplan",
              "Einstellungen",
            ].map((item, idx) => (
              <div
                key={item}
                className={`rounded-lg px-3 py-2 text-sm text-white/90 ${
                  idx === 0 ? "bg-white/12" : "bg-white/6"
                }`}
              >
                {item}
              </div>
            ))}
          </nav>
        </aside>

        <div className="bg-[#f9fbff] p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between rounded-xl border border-[#dbe7f8] bg-white px-3 py-2">
            <p className={`${rubik.className} text-base font-semibold text-[#0E51A0]`}>
              Verkaufsgespräch - Preisdiskussion
            </p>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">Live</span>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-2 rounded-xl border border-[#dbe7f8] bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#0E51A0]">KI-Kunde</p>
              <div className="rounded-lg bg-[#eef4ff] p-3 text-sm text-[#285894]">
                Ich interessiere mich für euer Angebot, aber der Preis ist mir zu hoch.
              </div>

              <p className="pt-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#0E51A0]">Deine Antwort</p>
              <div className="rounded-lg bg-[#f5f8ff] p-3 text-sm text-[#3d4d68]">
                Ich verstehe. Was ist für Sie der wichtigste Faktor bei der Entscheidung?
              </div>

              <p className="pt-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#0E51A0]">KI-Kunde</p>
              <div className="rounded-lg bg-[#eef4ff] p-3 text-sm text-[#285894]">
                Es muss wirklich den Mehrwert bringen.
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-xl border border-[#dbe7f8] bg-white p-3">
                <p className="text-sm font-semibold text-[#0E51A0]">Gesprächsanalyse</p>
                <div className="mt-3 flex items-center gap-3">
                  <div className="grid h-16 w-16 place-items-center rounded-full border-4 border-[#0E51A0] text-lg font-bold text-[#0E51A0]">
                    82%
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#0E51A0]">Abschlusschance</p>
                    <p className="text-xs text-emerald-700">Sehr gut</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[#dbe7f8] bg-white p-3">
                <p className="text-sm font-semibold text-[#0E51A0]">Feedback der KI</p>
                <p className="mt-2 text-sm leading-6 text-[#707070]">
                  Sehr gute Nachfrage-Technik. Nutzen noch klarer auf das Ziel des Kunden beziehen.
                </p>
                <button className="mt-3 text-sm font-semibold text-[#EA9413]">Zum Feedback</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function LandingPage() {
  return (
    <main className={`${roboto.className} bg-[linear-gradient(180deg,#f7fbff_0%,#ffffff_40%,#f5f9ff_100%)] text-[#0f172a]`}>
      <header className="sticky top-0 z-40 border-b border-[#dfe9f8] bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className={`${rubik.className} text-xl font-bold text-[#0E51A0]`}>
            talking<span className="text-[#1f5fae]">HEADS</span>
          </div>

          <nav className="hidden items-center gap-8 md:flex">
            <a href="#vorteile" className="text-base font-medium text-[#0f2343] transition hover:text-[#0E51A0]">
              Vorteile
            </a>
            <a href="#fuer-wen" className="text-base font-medium text-[#0f2343] transition hover:text-[#0E51A0]">
              Für wen
            </a>
            <a href="#so-funktionierts" className="text-base font-medium text-[#0f2343] transition hover:text-[#0E51A0]">
              So funktioniert&apos;s
            </a>
          </nav>

          <CtaButton href="/register">Jetzt starten</CtaButton>
        </div>
      </header>

      <section className="mx-auto w-full max-w-7xl px-4 pb-16 pt-10 sm:px-6 sm:pt-14 lg:px-8 lg:pb-20">
        <div className="grid items-center gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <h1 className={`${rubik.className} text-balance text-5xl font-bold leading-[1.05] text-[#0E51A0] sm:text-6xl lg:text-7xl`}>
              Mehr Sales.
              <br />
              Mehr Abschlüsse.
              <br />
              Mit KI-Training.
            </h1>
            <p className="mt-5 max-w-xl text-2xl leading-10 text-[#31435f]">
              Der talkingHEADS Sales Trainer simuliert echte Verkaufsgespräche,
              gibt sofort Feedback und hilft Verkäufern, sicherer und erfolgreicher
              abzuschließen.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <CtaButton href="/register">Jetzt kostenlos testen</CtaButton>
              <button className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#b4caea] bg-white px-6 py-3 text-sm font-semibold text-[#0E51A0] shadow-[0_8px_20px_rgba(14,81,160,0.10)] transition hover:border-[#0E51A0]/45 hover:bg-[#f7fbff]">
                Demo ansehen
              </button>
            </div>
          </div>

          <DashboardMockup />
        </div>
      </section>

      <section id="vorteile" className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-5 md:grid-cols-3">
          {benefits.map((item) => (
            <SimpleCard key={item.title} title={item.title} text={item.text} />
          ))}
        </div>
      </section>

      <section id="fuer-wen" className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <h2 className={`${rubik.className} text-center text-4xl font-bold text-[#0E51A0] sm:text-5xl`}>
          Für wen ist der Sales Trainer?
        </h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {audiences.map((item) => (
            <SimpleCard key={item.title} title={item.title} text={item.text} />
          ))}
        </div>
      </section>

      <section id="so-funktionierts" className="mx-auto w-full max-w-7xl px-4 pb-16 pt-8 sm:px-6 lg:px-8 lg:pb-20">
        <div className="rounded-3xl bg-[linear-gradient(135deg,#0E51A0,#1f5fae)] px-6 py-10 text-center shadow-[0_20px_40px_rgba(14,81,160,0.25)] sm:px-10">
          <h2 className={`${rubik.className} text-4xl font-bold text-white sm:text-5xl`}>
            Bereit, Verkauf wirklich zu trainieren?
          </h2>
          <p className="mx-auto mt-3 max-w-3xl text-2xl text-[#d9e6fb]">
            Starte jetzt dein KI-Training und mach jeden Gesprächsabschluss zu deinem Vorteil.
          </p>
          <div className="mt-7">
            <CtaButton href="/register">Sales Trainer starten</CtaButton>
          </div>
        </div>
      </section>
    </main>
  );
}
