"use client";

import Link from "next/link";
import { Rubik, Roboto } from "next/font/google";
import { motion } from "framer-motion";

const rubik = Rubik({ subsets: ["latin"], weight: ["500", "700"] });
const roboto = Roboto({ subsets: ["latin"], weight: ["400", "500", "700"] });

function OrangeButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-14 items-center justify-center rounded-xl bg-[linear-gradient(180deg,#f6ab2c_0%,#EA9413_50%,#d78207_100%)] px-7 py-3 text-base font-semibold text-white shadow-[0_14px_30px_rgba(234,148,19,0.42),inset_0_1px_0_rgba(255,255,255,0.34)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(234,148,19,0.5),inset_0_1px_0_rgba(255,255,255,0.4)]"
    >
      {children}
    </Link>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#e6edf6] bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-22 w-full max-w-[1240px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d2e2f7] bg-white shadow-[0_6px_14px_rgba(14,81,160,0.15)]">
            <span className="h-6 w-6 rounded-full bg-[#0E51A0]" />
          </span>
          <span className={`${rubik.className} text-[18px] font-semibold tracking-[0.12em] text-[#0E51A0]`}>
            TALKINGHEADS SALES TRAINER
          </span>
        </div>

        <nav className="hidden items-center gap-14 lg:flex">
          <a href="#vorteile" className="text-[18px] font-medium text-[#1b2b45] hover:text-[#0E51A0]">
            Vorteile
          </a>
          <a href="#fuer-wen" className="text-[18px] font-medium text-[#1b2b45] hover:text-[#0E51A0]">
            Für wen
          </a>
          <a href="#so-funktionierts" className="text-[18px] font-medium text-[#1b2b45] hover:text-[#0E51A0]">
            So funktioniert&apos;s
          </a>
        </nav>

        <OrangeButton href="/register">Jetzt starten</OrangeButton>
      </div>
    </header>
  );
}

function DashboardMockup() {
  return (
    <div className="overflow-hidden rounded-[1.6rem] border border-[#d5e3f6] bg-white shadow-[0_20px_44px_rgba(14,81,160,0.20)]">
      <div className="grid min-h-[620px] lg:grid-cols-[0.72fr_1.35fr]">
        <aside className="bg-[linear-gradient(165deg,#0E51A0_0%,#0c4a94_100%)] p-4 text-white sm:p-5">
          <div className="mb-5 h-9 w-9 rounded-full border border-white/70" />
          <div className="space-y-2">
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
                className={`rounded-lg px-3 py-2 text-sm ${idx === 0 ? "bg-white/18" : "bg-white/8"}`}
              >
                {item}
              </div>
            ))}
          </div>
        </aside>

        <div className="bg-[#f8fbff] p-4 sm:p-5">
          <div className="mb-3 rounded-xl border border-[#dce7f7] bg-white px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[#1b2b45]">Verkaufsgespräch - Preisdiskussion</p>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs text-emerald-700">Live</span>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-3 rounded-xl border border-[#dce7f7] bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#0E51A0]">KI-Kunde</p>
              <div className="rounded-lg bg-[#edf4ff] p-3 text-sm text-[#2a598f]">
                Ich interessiere mich für euer Angebot, aber der Preis ist mir zu hoch.
              </div>

              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#0E51A0]">Deine Antwort</p>
              <div className="rounded-lg bg-[#f4f8ff] p-3 text-sm text-[#445770]">
                Ich verstehe. Was ist für Sie der wichtigste Faktor bei der Entscheidung?
              </div>

              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#0E51A0]">KI-Kunde</p>
              <div className="rounded-lg bg-[#edf4ff] p-3 text-sm text-[#2a598f]">
                Es muss wirklich den Mehrwert bringen.
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-xl border border-[#dce7f7] bg-white p-3">
                <p className="text-sm font-semibold text-[#1b2b45]">Gesprächsanalyse</p>
                <div className="mt-3 flex items-center gap-3">
                  <div className="grid h-16 w-16 place-items-center rounded-full border-4 border-[#0E51A0] text-lg font-bold text-[#0E51A0]">
                    82%
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#1b2b45]">Abschlusschance</p>
                    <p className="text-xs text-emerald-700">Sehr gut</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[#dce7f7] bg-white p-3">
                <p className="text-sm font-semibold text-[#1b2b45]">Feedback der KI</p>
                <p className="mt-2 text-sm leading-6 text-[#707070]">
                  Sehr gute Nachfrage-Technik. Versuche, den Nutzen noch klarer auf das Ziel des Kunden zu beziehen.
                </p>
                <button className="mt-3 text-sm font-semibold text-[#0E51A0]">Zum Feedback</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BenefitCard({ title, text }: { title: string; text: string }) {
  return (
    <article className="rounded-2xl border border-[#dce7f7] bg-white p-7 shadow-[0_10px_22px_rgba(14,81,160,0.08)]">
      <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(145deg,#1d66c2,#0E51A0)] shadow-[0_10px_18px_rgba(14,81,160,0.25)]" />
      <h3 className={`${rubik.className} text-[28px] font-semibold leading-[1.15] text-[#0E51A0]`}>{title}</h3>
      <p className="mt-4 text-[21px] leading-[1.4] text-[#3f4d63]">{text}</p>
    </article>
  );
}

function AudienceCard({ title, text }: { title: string; text: string }) {
  return (
    <article className="rounded-2xl border border-[#dce7f7] bg-white p-7 shadow-[0_10px_22px_rgba(14,81,160,0.08)]">
      <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(145deg,#1d66c2,#0E51A0)]" />
      <h3 className={`${rubik.className} text-[30px] font-semibold leading-[1.2] text-[#0E51A0]`}>{title}</h3>
      <p className="mt-4 text-[21px] leading-[1.4] text-[#3f4d63]">{text}</p>
    </article>
  );
}

export default function LandingPage() {
  return (
    <main className={`${roboto.className} bg-[#f5f7fa] text-[#1b2b45]`}>
      <Header />

      <section className="mx-auto w-full max-w-[1240px] px-4 pb-12 pt-8 sm:px-6 lg:px-8 lg:pb-14 lg:pt-10">
        <div className="grid items-stretch gap-6 lg:grid-cols-[2fr_1fr]">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="rounded-[1.8rem] bg-[linear-gradient(160deg,#0E51A0_0%,#0b4a94_65%,#0a448a_100%)] p-8 text-white shadow-[0_24px_50px_rgba(14,81,160,0.24)] sm:p-10"
          >
            <h1 className={`${rubik.className} text-balance text-[52px] font-bold leading-[1.03] sm:text-[58px]`}>
              Mehr Sales.
              <br />
              Mehr Abschlüsse.
              <br />
              Mit KI-Training.
            </h1>
            <p className="mt-6 max-w-3xl text-[22px] leading-[1.4] text-[#dce8fb]">
              Der talkingHEADS Sales Trainer simuliert echte Verkaufsgespräche,
              gibt sofort Feedback und hilft Verkäufern, sicherer und
              erfolgreicher abzuschließen.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <OrangeButton href="/register">Jetzt kostenlos testen</OrangeButton>
              <button className="inline-flex min-h-14 items-center justify-center rounded-xl border border-white/55 bg-white/8 px-7 py-3 text-base font-semibold text-white shadow-[0_10px_20px_rgba(7,35,71,0.25)] transition hover:bg-white/15">
                Demo ansehen
              </button>
            </div>
          </motion.div>

          <DashboardMockup />
        </div>
      </section>

      <section id="vorteile" className="mx-auto w-full max-w-[1240px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-5 md:grid-cols-3">
          <BenefitCard
            title="Realistische Verkaufsgespräche"
            text="Trainiere mit KI-Kunden in echten Verkaufssituationen – so oft du willst."
          />
          <BenefitCard
            title="Sofortiges Feedback"
            text="Erhalte direkt nach jedem Gespräch konkrete, umsetzbare Feedbacks."
          />
          <BenefitCard
            title="Sicherer abschließen"
            text="Verbessere deine Gesprächsführung und erhöhe deine Abschlussquote."
          />
        </div>
      </section>

      <section id="fuer-wen" className="mx-auto w-full max-w-[1240px] px-4 py-10 sm:px-6 lg:px-8">
        <h2 className={`${rubik.className} text-center text-[40px] font-bold text-[#0E51A0] sm:text-[44px]`}>
          Für wen ist der Sales Trainer?
        </h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          <AudienceCard
            title="Fitnessstudios"
            text="Mehr Abschlüsse bei Probetrainings und Memberships."
          />
          <AudienceCard
            title="Coaches & Berater"
            text="Überzeuge in Beratungsgesprächen und gewinne mehr Kunden."
          />
          <AudienceCard
            title="Vertriebsteams"
            text="Skaliere Vertriebserfolg durch professionelles Training."
          />
        </div>
      </section>

      <section id="so-funktionierts" className="mx-auto w-full max-w-[1240px] px-4 pb-14 pt-4 sm:px-6 lg:px-8 lg:pb-16">
        <div className="rounded-[1.8rem] bg-[linear-gradient(145deg,#0E51A0,#1b61b8)] px-8 py-10 text-center shadow-[0_24px_44px_rgba(14,81,160,0.28)] sm:px-10">
          <h2 className={`${rubik.className} text-[40px] font-bold leading-[1.1] text-white sm:text-[44px]`}>
            Bereit, Verkauf wirklich zu trainieren?
          </h2>
          <p className="mx-auto mt-4 max-w-5xl text-[22px] leading-[1.4] text-[#dce8fb]">
            Starte jetzt dein KI-Training und mach jeden Gesprächsabschluss zu deinem Vorteil.
          </p>
          <div className="mt-8">
            <OrangeButton href="/register">Sales Trainer starten</OrangeButton>
          </div>
        </div>
      </section>
    </main>
  );
}
