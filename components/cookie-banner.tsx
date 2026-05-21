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
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-16 sm:px-6 sm:pb-18 lg:pb-20">
      <div className="pointer-events-auto mx-auto max-w-5xl rounded-[2rem] border border-white/80 bg-white/90 shadow-[0_28px_90px_rgba(15,23,42,0.18)] backdrop-blur">
        <div className="rounded-[1.6rem] border border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f6f9fd_100%)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] sm:p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0e51a0]">
                Datenschutz
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[#707070] sm:text-[2rem]">
                Wir verwenden Cookies nur für klar definierte Zwecke.
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
                Notwendige Cookies sichern den Betrieb von talkingHEADS Sales Trainer. Statistik-
                und Marketing-Cookies aktivieren wir erst nach Ihrer Auswahl.
                Weitere Informationen finden Sie im{" "}
                <Link
                  className="font-medium text-[#0e51a0] transition hover:text-[#0b478b] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0e51a0]/12"
                  href="/datenschutz"
                >
                  Datenschutz
                </Link>
                .
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto lg:min-w-[28rem]">
              <button
                type="button"
                onClick={onAcceptNecessary}
                className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#707070] shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition hover:border-[#0e51a0]/25 hover:text-[#0e51a0] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0e51a0]/12"
              >
                Nur notwendige
              </button>
              <button
                type="button"
                onClick={onOpenPreferences}
                className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full border border-[#0e51a0]/20 bg-[#0e51a0]/6 px-5 py-3 text-sm font-semibold text-[#0e51a0] transition hover:bg-[#0e51a0]/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0e51a0]/12"
              >
                Einstellungen
              </button>
              <button
                type="button"
                onClick={onAcceptAll}
                className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full bg-[#0e51a0] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_44px_rgba(14,81,160,0.32)] transition hover:bg-[#0b478b] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0e51a0]/18"
              >
                Alle akzeptieren
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
