"use client";

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
        className="pointer-events-auto mx-auto w-full max-w-[1700px] rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_18px_56px_rgba(15,23,42,0.14)] sm:p-8 lg:p-10"
        role="dialog"
        aria-labelledby="cookie-banner-title"
        aria-describedby="cookie-banner-description"
      >
        <div className="grid items-center gap-8 md:grid-cols-[minmax(0,4fr)_minmax(220px,1fr)] lg:gap-10">
          <div className="max-w-5xl">
            <h2
              id="cookie-banner-title"
              className="font-heading text-2xl font-normal text-[#2f3337] sm:text-3xl lg:text-[2.35rem] lg:leading-tight"
            >
              Wir verwenden Cookies für klar definierte Zwecke.
            </h2>
            <div
              id="cookie-banner-description"
              className="mt-5 max-w-4xl space-y-4 font-sans text-sm leading-7 text-[#555b61] sm:text-base"
            >
              <p>
                Notwendige Cookies sichern den Betrieb von talkingHEADS Sales Trainer. Statistik-
                und Marketing-Cookies aktivieren wir erst nach Ihrer Auswahl.
              </p>
              <button
                type="button"
                onClick={onOpenPreferences}
                className="font-medium text-[#2f3337] underline decoration-slate-300 underline-offset-4 transition hover:text-[#EA9413] hover:decoration-[#EA9413] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA9413]/30"
              >
                Cookie-Richtlinie
              </button>
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 md:ml-auto md:max-w-[260px]">
            <button
              type="button"
              onClick={onAcceptAll}
              className="inline-flex h-12 w-full items-center justify-center rounded-[14px] bg-[linear-gradient(180deg,#F2A32A_0%,#EA9413_100%)] px-5 font-sans text-sm font-medium text-white shadow-[0_8px_18px_rgba(234,148,19,0.22)] transition hover:bg-[#d8840f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA9413]/35 sm:h-13"
            >
              Alle akzeptieren
            </button>
            <button
              type="button"
              onClick={onAcceptNecessary}
              className="inline-flex h-12 w-full items-center justify-center rounded-[14px] border border-slate-200 bg-[#f7f8fa] px-5 font-sans text-sm font-medium text-[#2f3337] transition hover:border-slate-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 sm:h-13"
            >
              Ablehnen
            </button>
            <button
              type="button"
              onClick={onOpenPreferences}
              className="inline-flex h-12 w-full items-center justify-center rounded-[14px] border border-slate-200 bg-[#f7f8fa] px-5 font-sans text-sm font-medium text-[#2f3337] transition hover:border-slate-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 sm:h-13"
            >
              Einstellungen
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
