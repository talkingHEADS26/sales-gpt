"use client";

import Link from "next/link";

type CookieBannerProps = {
  onAcceptAll: () => void;
  onAcceptNecessary: () => void;
  onOpenPreferences: () => void;
};

export function CookieBanner({
  onAcceptAll,
  onAcceptNecessary,
  onOpenPreferences,
}: CookieBannerProps) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-5 sm:px-7">
      <section
        className="pointer-events-auto mx-auto w-full rounded-[16px] bg-white px-6 py-7 shadow-[0_24px_52px_rgba(15,23,42,0.22)] sm:px-10 sm:py-8"
        role="dialog"
        aria-labelledby="cookie-banner-title"
      >
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_268px] lg:gap-12">
          <div className="max-w-[1320px]">
            <h2
              id="cookie-banner-title"
              className="font-sans text-[28px] font-bold leading-tight text-[#707070] sm:text-[32px]"
            >
              Wir verwenden Cookies
            </h2>
            <p className="mt-6 font-sans text-[22px] font-normal leading-[1.45] text-[#999999] sm:text-[26px]">
              Wir setzen auf dieser Internetseite Cookies ein, wie in unserer
              Datenschutzerklärung beschrieben. Einige sind technisch erforderlich (funktionale
              Cookies); andere nicht, sondern dienen der Analyse des Nutzungsverhaltens
              (Performance) oder der Ausführung von Marketingmaßnahmen (Marketing). Sie können
              diesen Cookie-Banner jederzeit aufrufen und Ihre Einwilligungserklärungen jederzeit
              modifizieren und damit auch jederzeit mit Wirkung für die Zukunft widerrufen.
            </p>
            <p className="mt-6">
              <Link
                href="/datenschutz"
                className="font-sans text-[22px] font-normal leading-none text-[#a7a7a7] underline decoration-[#cfcfcf] underline-offset-[7px] transition hover:text-[#707070] hover:decoration-[#707070] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA9413]/30 sm:text-[26px]"
              >
                Cookie-Richtlinie
              </Link>
            </p>
          </div>

          <div className="flex w-full flex-col gap-4 lg:w-[268px]">
            <button
              type="button"
              onClick={onAcceptAll}
              className="inline-flex h-16 w-full items-center justify-center rounded-[6px] border border-[#e0a02c] bg-[linear-gradient(180deg,#f6c34f_0%,#d18e21_100%)] px-5 font-sans text-[22px] font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28)] transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA9413]/35 sm:h-20 sm:text-[27px]"
            >
              Alle akzeptieren
            </button>
            <button
              type="button"
              onClick={onAcceptNecessary}
              className="inline-flex h-16 w-full items-center justify-center rounded-[6px] border border-[#eeeeee] bg-[linear-gradient(180deg,#ffffff_0%,#ebebeb_100%)] px-5 font-sans text-[22px] font-bold text-[#707070] shadow-[0_18px_34px_rgba(15,23,42,0.08)] transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 sm:h-20 sm:text-[26px]"
            >
              Ablehnen
            </button>
            <button
              type="button"
              onClick={onOpenPreferences}
              className="inline-flex h-16 w-full items-center justify-center rounded-[6px] border border-[#eeeeee] bg-[linear-gradient(180deg,#ffffff_0%,#ebebeb_100%)] px-5 font-sans text-[22px] font-bold text-[#707070] shadow-[0_18px_34px_rgba(15,23,42,0.08)] transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 sm:h-20 sm:text-[26px]"
            >
              Bearbeiten
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
