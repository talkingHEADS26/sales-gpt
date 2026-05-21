"use client";

import Image from "next/image";
import Link from "next/link";
import { Rubik, Roboto } from "next/font/google";
import { motion } from "framer-motion";

const rubik = Rubik({ subsets: ["latin"], weight: ["500", "700"] });
const roboto = Roboto({ subsets: ["latin"], weight: ["400", "500", "700"] });

const problemCards = [
  {
    title: "Unsicherheit bei Einwänden",
    text: "In kritischen Momenten kippen Gespräche oft, obwohl das Angebot passt.",
  },
  {
    title: "Keine echte Gesprächspraxis",
    text: "Theorie ersetzt kein Training unter realem Verkaufsdruck.",
  },
  {
    title: "Keine objektive Analyse",
    text: "Ohne präzises Feedback bleibt unklar, was wirklich Abschlüsse kostet.",
  },
];

const featureCards = [
  {
    title: "KI-Kundensimulation",
    text: "Trainiere mit dynamischen Buyer-Personas und realistischen Einwänden.",
  },
  {
    title: "Echtzeit-Feedback",
    text: "Erhalte direkt im Gespräch Hinweise zu Sprache, Wirkung und Struktur.",
  },
  {
    title: "Abschlusswahrscheinlichkeit",
    text: "Sieh live, wie sich dein Gespräch auf den Deal-Outcome auswirkt.",
  },
  {
    title: "Situationsanalyse",
    text: "Nach jeder Session: klare Hebel für das nächste Gespräch.",
  },
];

const audienceCards = [
  {
    title: "Fitnessstudios",
    text: "Mehr Abschlüsse aus Probetrainings, Beratung und Telefon-Leadflow.",
  },
  {
    title: "Coaches & Berater",
    text: "Sicherere Closing-Calls und bessere Conversion in Premium-Angeboten.",
  },
  {
    title: "Vertriebsteams",
    text: "Einheitlicher Sales-Standard mit messbarer Performance pro Teammitglied.",
  },
];

const kpis = [
  "24/7 KI-Training",
  "Mehr Gesprächssicherheit",
  "Realistische Verkaufssimulation",
  "Analyse nach jeder Session",
];

function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      {eyebrow ? (
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-[#EA9413]">
          {eyebrow}
        </p>
      ) : null}
      <h2
        className={`${rubik.className} mt-3 text-balance text-3xl font-bold leading-tight text-white sm:text-4xl md:text-5xl`}
      >
        {title}
      </h2>
      {subtitle ? (
        <p className={`${roboto.className} mt-4 text-base text-slate-300`}>
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

function GlassCard({ title, text }: { title: string; text: string }) {
  return (
    <motion.article
      whileHover={{ y: -6 }}
      transition={{ duration: 0.2 }}
      className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
    >
      <h3 className={`${rubik.className} text-xl font-semibold text-white`}>
        {title}
      </h3>
      <p className={`${roboto.className} mt-3 text-sm leading-7 text-slate-300`}>
        {text}
      </p>
    </motion.article>
  );
}

function HeroDashboardMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className="relative mt-10 rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900/90 to-[#06142A]/90 p-5 shadow-[0_0_120px_rgba(14,81,160,0.30)] backdrop-blur-xl"
    >
      <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-[#0E51A0]/50 blur-3xl" />
      <div className="absolute -bottom-10 -left-10 h-36 w-36 rounded-full bg-[#EA9413]/25 blur-3xl" />

      <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="mb-4 flex items-center justify-between">
            <p
              className={`${roboto.className} text-xs uppercase tracking-[0.22em] text-slate-300`}
            >
              Live Sales Session
            </p>
            <span className="rounded-full bg-[#EA9413]/20 px-3 py-1 text-xs text-[#EA9413]">
              AI Active
            </span>
          </div>
          <div className="space-y-3">
            <div className="rounded-xl bg-slate-950/80 p-3 text-sm text-slate-200">
              Kunde: &quot;Ich bin unsicher, ob sich das wirklich lohnt.&quot;
            </div>
            <div className="rounded-xl bg-[#0E51A0]/25 p-3 text-sm text-white">
              Du: &quot;Darf ich kurz zeigen, wie schnell sich die Investition
              amortisiert?&quot;
            </div>
            <div className="rounded-xl bg-slate-950/80 p-3 text-sm text-slate-200">
              AI Coach: &quot;Stark. Jetzt Nutzenbeweis + nächste
              Abschlussfrage setzen.&quot;
            </div>
          </div>
          <div className="mt-4 h-10 rounded-xl bg-gradient-to-r from-[#0E51A0]/50 via-[#EA9413]/40 to-[#0E51A0]/50" />
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p
              className={`${roboto.className} text-xs uppercase tracking-[0.18em] text-slate-400`}
            >
              Sales Score
            </p>
            <p className={`${rubik.className} mt-2 text-4xl font-bold text-white`}>
              86
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p
              className={`${roboto.className} text-xs uppercase tracking-[0.18em] text-slate-400`}
            >
              Abschlusswahrscheinlichkeit
            </p>
            <p className={`${rubik.className} mt-2 text-3xl font-bold text-[#EA9413]`}>
              73%
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p
              className={`${roboto.className} text-xs uppercase tracking-[0.18em] text-slate-400`}
            >
              Einwandanalyse
            </p>
            <p className={`${roboto.className} mt-2 text-sm text-slate-200`}>
              Preis-Einwand sauber geführt, Abschlussfrage zu spät gesetzt.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {[
          "KPI: Bedarfsanalyse 88",
          "KPI: Nutzenargumentation 82",
          "KPI: Closing-Timing 74",
        ].map((item) => (
          <div
            key={item}
            className="rounded-xl border border-white/10 bg-slate-900/70 p-3 text-xs text-slate-300"
          >
            {item}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export default function LandingPage() {
  return (
    <main
      className={`${roboto.className} min-h-screen bg-[radial-gradient(circle_at_20%_0%,rgba(14,81,160,0.40),rgba(2,6,23,1)_45%),linear-gradient(165deg,#020617_0%,#07152d_50%,#0a1f40_100%)] text-[#707070]`}
    >
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
        <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/TH_Logo.png"
              alt="talkingHEADS Logo"
              width={148}
              height={40}
              className="h-10 w-auto"
              priority
            />
            <span className={`${rubik.className} hidden text-sm font-semibold text-white/90 sm:inline`}>
              Sales Trainer
            </span>
          </Link>
          <Link
            href="#final-cta"
            className="rounded-xl bg-[#EA9413] px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-[#f0a52f]"
          >
            Jetzt kostenlos testen
          </Link>
        </div>
      </header>

      <section className="mx-auto w-full max-w-7xl px-4 pb-16 pt-16 sm:px-6 sm:pt-24 lg:px-8 lg:pt-28">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-xs font-medium uppercase tracking-[0.28em] text-[#EA9413]">
            AI Sales Performance
          </p>
          <h1
            className={`${rubik.className} mt-6 max-w-4xl text-balance text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-7xl`}
          >
            KI-Verkaufstraining für echte Abschlüsse.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            Der talkingHEADS Sales Trainer simuliert echte Verkaufsgespräche,
            analysiert deine Performance und trainiert dein Closing auf
            Profi-Niveau.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link
              href="#final-cta"
              className="rounded-xl bg-[#EA9413] px-7 py-3.5 text-center text-base font-semibold text-slate-950 transition hover:bg-[#f0a52f]"
            >
              Jetzt kostenlos testen
            </Link>
            <button className="rounded-xl border border-white/25 bg-white/5 px-7 py-3.5 text-base font-semibold text-white transition hover:bg-white/10">
              Demo ansehen
            </button>
          </div>
        </motion.div>

        <HeroDashboardMockup />
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading title="Die meisten Verkäufer verlieren keine Abschlüsse wegen fehlendem Wissen. Sondern wegen fehlender Gesprächssicherheit." />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {problemCards.map((card) => (
            <GlassCard key={card.title} title={card.title} text={card.text} />
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Solution"
          title="Trainiere Sales wie Spitzensportler."
        />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {featureCards.map((card) => (
            <GlassCard key={card.title} title={card.title} text={card.text} />
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Product Preview"
          title="Performance-Dashboard für Abschlussstärke"
          subtitle="Glasmorphism UI, klare KPIs und Trainingssteuerung in einem zentralen Cockpit."
        />
        <div className="mt-12 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_0_100px_rgba(14,81,160,0.28)] backdrop-blur-2xl sm:p-10">
          <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
              <div className="h-56 rounded-xl bg-gradient-to-br from-[#0E51A0]/45 via-slate-900 to-[#EA9413]/20" />
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-white/5 p-3 text-xs text-slate-300">
                  Pipeline Momentum: +18%
                </div>
                <div className="rounded-xl bg-white/5 p-3 text-xs text-slate-300">
                  Closing Consistency: 81
                </div>
                <div className="rounded-xl bg-white/5 p-3 text-xs text-slate-300">
                  Einwand-Qualität: 84
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-200">
                Live-Coaching-Notiz: Abschlussfrage 1 Schritt früher setzen.
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-200">
                Risikobereich: Preisanker gegen Wettbewerbsvergleich schärfen.
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-200">
                Nächster Drill: Einwandkette &quot;zu teuer&quot; in 3 Varianten
                trainieren.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((item) => (
            <motion.div
              key={item}
              whileHover={{ scale: 1.02 }}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-xl"
            >
              <p className={`${rubik.className} text-xl font-semibold text-white`}>
                {item}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Zielgruppen"
          title="Gebaut für vertriebsstarke Teams und Performer"
        />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {audienceCards.map((card) => (
            <GlassCard key={card.title} title={card.title} text={card.text} />
          ))}
        </div>
      </section>

      <section
        id="final-cta"
        className="mx-auto w-full max-w-7xl px-4 pb-24 pt-12 sm:px-6 lg:px-8"
      >
        <div className="rounded-3xl border border-[#0E51A0]/60 bg-gradient-to-r from-[#0a1d3b] via-[#0b2c58] to-[#102848] p-10 text-center shadow-[0_0_90px_rgba(14,81,160,0.35)]">
          <h2
            className={`${rubik.className} text-balance text-3xl font-bold text-white sm:text-4xl md:text-5xl`}
          >
            Trainiere heute. Schließe morgen besser ab.
          </h2>
          <Link
            href="/register"
            className="mt-8 inline-flex rounded-xl bg-[#EA9413] px-8 py-3.5 text-base font-semibold text-slate-950 transition hover:bg-[#f0a52f]"
          >
            Sales Trainer starten
          </Link>
        </div>
      </section>
    </main>
  );
}
