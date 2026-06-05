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
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-6 sm:px-6 sm:pb-8 lg:px-10 lg:pb-10">
      <section
        className="pointer-events-auto mx-auto w-full max-w-[850px] rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_18px_56px_rgba(15,23,42,0.14)] sm:p-8 lg:p-10"
        role="dialog"
        aria-labelledby="cookie-banner-title"
      >
        <div className="grid items-center gap-8 md:grid-cols-[minmax(0,4fr)_minmax(210px,1fr)] lg:gap-10">
          <div className="max-w-2xl">
            <h2
              id="cookie-banner-title"
              className="font-heading text-base font-normal leading-7 text-[#707070] sm:text-lg sm:leading-8"
            >
              Wir setzen auf dieser Internetseite Cookies ein, wie in unserer{" "}
              <Link
                href="/datenschutz"
                className="font-medium text-[#707070] underline decoration-slate-300 underline-offset-4 transition hover:decoration-[#707070] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA9413]/30"
              >
                Datenschutzerklärung
              </Link>{" "}
              beschrieben. Einige sind technisch erforderlich (funktionale Cookies); andere
              nicht, sondern dienen der Analyse des Nutzungsverhaltens (Performance) oder der
              Ausführung von Marketingmaßnahmen (Marketing). Sie können diesen Cookie-Banner
              jederzeit aufrufen und Ihre Einwilligungserklärungen jederzeit modifizieren und
              damit auch jederzeit mit Wirkung für die Zukunft widerrufen.
            </h2>
          </div>

          <div className="flex w-full flex-col gap-3 md:ml-auto md:max-w-[260px]">
            <button
              type="button"
              onClick={onAcceptAll}
              className="inline-flex h-12 w-full items-center justify-center rounded-[8px] bg-[linear-gradient(180deg,#F2A32A_0%,#EA9413_100%)] px-5 font-sans text-sm font-medium text-white shadow-[0_8px_18px_rgba(234,148,19,0.22)] transition hover:bg-[#d8840f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA9413]/35 sm:h-13"
            >
              Alle akzeptieren
            </button>
            <button
              type="button"
              onClick={onAcceptNecessary}
              className="inline-flex h-12 w-full items-center justify-center rounded-[8px] border border-slate-200 bg-[#f7f8fa] px-5 font-sans text-sm font-medium text-[#707070] transition hover:border-slate-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 sm:h-13"
            >
              Ablehnen
            </button>
            <button
              type="button"
              onClick={onOpenPreferences}
              className="inline-flex h-12 w-full items-center justify-center rounded-[8px] border border-slate-200 bg-[#f7f8fa] px-5 font-sans text-sm font-medium text-[#707070] transition hover:border-slate-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 sm:h-13"
            >
              Einstellungen
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
