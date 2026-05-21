"use client";

import Link from "next/link";

import type {
  ConsentPreferences,
  ConsentCategory,
  OptionalConsentCategory,
} from "@/lib/consent";

type CookiePreferencesModalProps = {
  draftPreferences: ConsentPreferences;
  isOpen: boolean;
  isEditable: boolean;
  onClose: () => void;
  onChange: (category: OptionalConsentCategory, value: boolean) => void;
  onReset: () => void;
  onSave: () => void;
  onAcceptAll: () => void;
  onAcceptNecessary: () => void;
};

type RequiredCategoryCard = {
  category: "necessary";
  title: string;
  description: string;
  disabled: true;
};

type OptionalCategoryCard = {
  category: OptionalConsentCategory;
  title: string;
  description: string;
  disabled: false;
};

type CategoryCard = RequiredCategoryCard | OptionalCategoryCard;

const categoryCards: readonly CategoryCard[] = [
  {
    category: "necessary",
    title: "Notwendig",
    description:
      "Erforderlich für Sicherheit, Login, Seitennavigation und grundlegende Funktionen der Plattform.",
    disabled: true,
  },
  {
    category: "statistics",
    title: "Statistik / Analyse",
    description:
      "Hilft uns zu verstehen, wie AbschlussIO genutzt wird, damit wir Inhalte und Performance gezielt verbessern können.",
    disabled: false,
  },
  {
    category: "marketing",
    title: "Marketing",
    description:
      "Ermöglicht die Auswertung von Kampagnen und die kontrollierte Ausspielung relevanter Marketing-Maßnahmen.",
    disabled: false,
  },
];

function getPreferenceValue(
  preferences: ConsentPreferences,
  category: ConsentCategory
) {
  return preferences[category];
}

export function CookiePreferencesModal({
  draftPreferences,
  isOpen,
  isEditable,
  onClose,
  onChange,
  onReset,
  onSave,
  onAcceptAll,
  onAcceptNecessary,
}: CookiePreferencesModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/24 px-4 py-4 backdrop-blur-[2px] sm:items-center sm:px-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-preferences-title"
    >
      <div className="w-full max-w-3xl rounded-[2rem] border border-white/80 bg-white/92 shadow-[0_28px_90px_rgba(15,23,42,0.2)] backdrop-blur">
        <div className="rounded-[1.6rem] border border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f6f9fd_100%)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0e51a0]">
                Cookie-Einstellungen
              </p>
              <h2
                id="cookie-preferences-title"
                className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[#707070] sm:text-3xl"
              >
                Entscheidungen klar, fair und nachvollziehbar.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                Optionale Kategorien bleiben deaktiviert, bis Sie aktiv zustimmen.
                Details finden Sie in unserem{" "}
                <Link
                  className="font-medium text-[#0e51a0] transition hover:text-[#0b478b] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0e51a0]/12"
                  href="/datenschutz"
                >
                  Datenschutz
                </Link>
                .
              </p>
            </div>
            {isEditable ? (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-lg text-slate-500 shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition hover:border-[#0e51a0]/25 hover:text-[#0e51a0] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0e51a0]/12"
                aria-label="Cookie-Einstellungen schließen"
              >
                ×
              </button>
            ) : null}
          </div>

          <div className="mt-6 grid gap-4">
            {categoryCards.map((card) => {
              const isEnabled = getPreferenceValue(draftPreferences, card.category);

              return (
                <section
                  key={card.category}
                  className="rounded-[1.5rem] border border-white/80 bg-white/88 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.06)]"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-[#707070]">{card.title}</h3>
                      <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                        {card.description}
                      </p>
                    </div>
                    {card.disabled ? (
                      <span className="inline-flex min-h-11 items-center self-start rounded-full border border-[#0e51a0]/15 bg-[#0e51a0]/8 px-4 text-sm font-semibold text-[#0e51a0]">
                        Immer aktiv
                      </span>
                    ) : (
                      <OptionalConsentToggle
                        card={card}
                        isEnabled={isEnabled}
                        onChange={onChange}
                      />
                    )}
                  </div>
                </section>
              );
            })}
          </div>

          <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={onAcceptNecessary}
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#707070] shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition hover:border-[#0e51a0]/25 hover:text-[#0e51a0] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0e51a0]/12"
              >
                Nur notwendige
              </button>
              <button
                type="button"
                onClick={onAcceptAll}
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#0e51a0] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_44px_rgba(14,81,160,0.32)] transition hover:bg-[#0b478b] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0e51a0]/18"
              >
                Alle akzeptieren
              </button>
              <button
                type="button"
                onClick={onSave}
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#0e51a0]/20 bg-[#0e51a0]/6 px-5 py-3 text-sm font-semibold text-[#0e51a0] transition hover:bg-[#0e51a0]/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0e51a0]/12"
              >
                Auswahl speichern
              </button>
            </div>

            {isEditable ? (
              <button
                type="button"
                onClick={onReset}
                className="self-start text-sm font-medium text-slate-500 transition hover:text-[#0e51a0] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0e51a0]/12"
              >
                Entscheidung zurücksetzen
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

type OptionalConsentToggleProps = {
  card: OptionalCategoryCard;
  isEnabled: boolean;
  onChange: (category: OptionalConsentCategory, value: boolean) => void;
};

function OptionalConsentToggle({
  card,
  isEnabled,
  onChange,
}: OptionalConsentToggleProps) {
  return (
    <label className="inline-flex cursor-pointer items-center self-start">
      <span className="sr-only">{card.title} aktivieren</span>
      <input
        type="checkbox"
        className="peer sr-only"
        checked={isEnabled}
        onChange={(event) => onChange(card.category, event.target.checked)}
      />
      <span
        className={`inline-flex h-11 min-w-[5.75rem] items-center rounded-full border border-slate-200 bg-white px-1 shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition peer-focus-visible:ring-4 peer-focus-visible:ring-[#0e51a0]/12 peer-checked:border-[#0e51a0]/30 peer-checked:bg-[#0e51a0]/10 ${
          isEnabled ? "justify-end" : "justify-start"
        }`}
      >
        <span
          className={`h-9 w-9 rounded-full shadow-[0_10px_18px_rgba(15,23,42,0.1)] transition ${
            isEnabled ? "bg-[#0e51a0]" : "bg-slate-300"
          }`}
        />
      </span>
    </label>
  );
}
