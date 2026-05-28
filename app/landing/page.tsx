"use client";

import Image from "next/image";
import Link from "next/link";
import { Rubik, Roboto } from "next/font/google";
import { motion } from "framer-motion";

const rubik = Rubik({ subsets: ["latin"], weight: ["500", "700"] });
const roboto = Roboto({ subsets: ["latin"], weight: ["400", "500", "700"] });

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#072f6b]/95 backdrop-blur-xl">
      <div className="mx-auto flex h-20 w-full max-w-[1240px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white shadow-[0_10px_24px_rgba(7,47,107,0.32)]">
            <Image src="/th_icon.png" alt="talkingHEADS Icon" width={40} height={40} className="h-10 w-10 object-cover" />
          </span>
          <span className={`${rubik.className} text-[14px] font-semibold uppercase tracking-[0.14em] text-white sm:text-[15px]`}>
            TALKINGHEADS SALES TRAINER
          </span>
        </div>

        <nav className="hidden items-center gap-10 lg:flex">
          <a href="#vorteile" className="text-[14px] font-semibold uppercase tracking-[0.08em] text-white/90 transition hover:text-[#EA9413]">
            Vorteile
          </a>
          <a href="#fuer-wen" className="text-[14px] font-semibold uppercase tracking-[0.08em] text-white/90 transition hover:text-[#EA9413]">
            Für wen
          </a>
          <a href="#so-funktionierts" className="text-[14px] font-semibold uppercase tracking-[0.08em] text-white/90 transition hover:text-[#EA9413]">
            So funktioniert&apos;s
          </a>
        </nav>

        <OrangeButton href="/register">Jetzt starten</OrangeButton>
      </div>
    </header>
  );
}

function OrangeButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-14 items-center justify-center rounded-[0.9rem] bg-[linear-gradient(90deg,#EA9413_0%,#f5b942_100%)] px-7 py-3 text-[14px] font-bold uppercase tracking-[0.08em] text-white shadow-[0_16px_28px_rgba(234,148,19,0.35),inset_0_1px_0_rgba(255,255,255,0.25)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_36px_rgba(234,148,19,0.42),inset_0_1px_0_rgba(255,255,255,0.3)]"
    >
      {children}
    </Link>
  );
}

function BenefitCard({ title, text }: { title: string; text: string }) {
  return (
    <article className="group rounded-[1.5rem] border border-[#dce7f7] bg-white/95 p-7 shadow-[0_14px_34px_rgba(7,47,107,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(7,47,107,0.12)]">
      <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,#0E51A0_0%,#072f6b_100%)] shadow-[0_12px_24px_rgba(14,81,160,0.26)] ring-1 ring-white/70" />
      <h3 className={`${rubik.className} text-[22px] font-bold uppercase leading-[1.15] tracking-[0.05em] text-[#0E51A0]`}>{title}</h3>
      <p className="mt-4 text-[16px] leading-[1.7] text-[#4a4a6a]">{text}</p>
    </article>
  );
}

function AudienceCard({ title, text }: { title: string; text: string }) {
  return (
    <article className="group rounded-[1.5rem] border border-[#dce7f7] bg-[linear-gradient(180deg,#ffffff_0%,#f5f8fe_100%)] p-7 shadow-[0_14px_34px_rgba(7,47,107,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(7,47,107,0.12)]">
      <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,#EA9413_0%,#f5b942_100%)] shadow-[0_12px_24px_rgba(234,148,19,0.2)] ring-1 ring-white/80" />
      <h3 className={`${rubik.className} text-[23px] font-bold uppercase leading-[1.15] tracking-[0.05em] text-[#0E51A0]`}>{title}</h3>
      <p className="mt-4 text-[16px] leading-[1.7] text-[#4a4a6a]">{text}</p>
    </article>
  );
}

export default function LandingPage() {
  return (
    <main className={`${roboto.className} overflow-x-hidden bg-[#ffffff] text-[#0d0d0d]`}>
      <Header />
      <section className="relative overflow-hidden bg-[linear-gradient(135deg,#072f6b_0%,#0e51a0_60%,#1a6bc7_100%)] px-4 pb-16 pt-10 sm:px-6 lg:px-8 lg:pb-24 lg:pt-14">
        <div className="absolute inset-0 opacity-50">
          <div className="absolute left-[-10%] top-[-12%] h-[28rem] w-[28rem] rounded-full bg-[rgba(234,148,19,0.09)] blur-3xl" />
          <div className="absolute right-[-8%] top-[10%] h-[24rem] w-[24rem] rounded-full bg-[rgba(255,255,255,0.09)] blur-3xl" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-white/20" />
        </div>
        <div className="relative mx-auto flex w-full max-w-[1240px] flex-col gap-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="relative min-w-0 overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(7,47,107,0.9)_0%,rgba(14,81,160,0.88)_60%,rgba(26,107,199,0.9)_100%)] p-8 text-white shadow-[0_30px_70px_rgba(7,47,107,0.32)] sm:p-10 lg:p-12"
          >
            <div className="absolute right-[-8rem] top-[-8rem] h-[22rem] w-[22rem] rounded-full bg-[rgba(234,148,19,0.08)] blur-3xl" />
            <div className="absolute bottom-[-7rem] left-[-5rem] h-[18rem] w-[18rem] rounded-full bg-white/8 blur-3xl" />
            <div className="relative max-w-4xl">
              <div className="mb-5 h-1.5 w-20 rounded-full bg-[linear-gradient(90deg,#EA9413_0%,#f5b942_100%)]" />
              <h1 className={`${rubik.className} text-balance text-[34px] font-black uppercase leading-[1.05] tracking-[0.04em] sm:text-[46px] lg:text-[58px]`}>
              Mehr Sales.
              <br />
              Mehr Abschlüsse.
              <br />
              Mit KI-Training.
              </h1>
              <p className="mt-6 max-w-3xl text-[16px] leading-[1.7] text-[#dce8fb] sm:text-[18px] lg:text-[22px]">
              Der talkingHEADS Sales Trainer simuliert echte Verkaufsgespräche,
              gibt sofort Feedback und hilft Verkäufern, sicherer und
              erfolgreicher abzuschließen.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
              <OrangeButton href="/register">Jetzt kostenlos testen</OrangeButton>
              <button className="inline-flex min-h-14 items-center justify-center rounded-[0.9rem] border border-white/20 bg-white/8 px-7 py-3 text-[14px] font-bold uppercase tracking-[0.08em] text-white shadow-[0_10px_20px_rgba(7,35,71,0.25)] transition duration-300 hover:border-white/30 hover:bg-white/15">
                Demo ansehen
              </button>
              </div>
            </div>
          </motion.div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[1.5rem] border border-white/10 bg-white/10 p-5 text-white shadow-[0_18px_36px_rgba(7,47,107,0.18)] backdrop-blur">
              <div className="h-1.5 w-16 rounded-full bg-[linear-gradient(90deg,#EA9413_0%,#f5b942_100%)]" />
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-white/10 p-5 text-white shadow-[0_18px_36px_rgba(7,47,107,0.18)] backdrop-blur">
              <div className="h-1.5 w-24 rounded-full bg-[linear-gradient(90deg,#EA9413_0%,#f5b942_100%)]" />
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-white/10 p-5 text-white shadow-[0_18px_36px_rgba(7,47,107,0.18)] backdrop-blur">
              <div className="h-1.5 w-20 rounded-full bg-[linear-gradient(90deg,#EA9413_0%,#f5b942_100%)]" />
            </div>
          </div>
        </div>
      </section>

      <section id="vorteile" className="bg-[linear-gradient(180deg,#ffffff_0%,#f0f4fb_100%)] px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto w-full max-w-[1240px]">
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
        </div>
      </section>

      <section id="fuer-wen" className="bg-white px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto w-full max-w-[1240px]">
          <h2 className={`${rubik.className} text-center text-[28px] font-bold uppercase tracking-[0.06em] text-[#0E51A0] sm:text-[36px] lg:text-[42px]`}>
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
        </div>
      </section>

      <section id="so-funktionierts" className="bg-[linear-gradient(135deg,#0d0d0d_0%,#1a1a2e_100%)] px-4 pb-16 pt-14 sm:px-6 lg:px-8 lg:pb-20 lg:pt-20">
        <div className="mx-auto w-full max-w-[1240px]">
          <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(7,47,107,0.2)_0%,rgba(14,81,160,0.18)_100%)] px-8 py-10 text-center shadow-[0_30px_60px_rgba(0,0,0,0.28)] sm:px-10 lg:px-12 lg:py-14">
          <h2 className={`${rubik.className} text-[28px] font-bold uppercase leading-[1.1] tracking-[0.06em] text-white sm:text-[36px] lg:text-[44px]`}>
            Bereit, Verkauf wirklich zu trainieren?
          </h2>
          <p className="mx-auto mt-4 max-w-5xl text-[16px] leading-[1.7] text-[#dce8fb] sm:text-[18px] lg:text-[22px]">
            Starte jetzt dein KI-Training und mach jeden Gesprächsabschluss zu deinem Vorteil.
          </p>
          <div className="mt-8">
            <OrangeButton href="/register">Sales Trainer starten</OrangeButton>
          </div>
          </div>
        </div>
      </section>
    </main>
  );
}
