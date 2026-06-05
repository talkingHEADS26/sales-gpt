"use client";

import { memo, useMemo, useState } from "react";

import { EnterpriseInquiryForm } from "@/app/enterprise-inquiry-form";
import {
  ROI_DEFAULTS,
  ROI_IMPROVEMENT_OPTIONS,
  ROI_TEAM_SIZE_OPTIONS,
  calculateRoi,
} from "@/lib/roi-calculator";

const euroFormatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const rampUpLabels = [
  "Monat 1-2",
  "Monat 3-4",
  "Monat 5-6",
  "Monat 7-12",
];

const rampUpValues = ["25 %", "50 %", "75 %", "100 %"];

function formatCurrency(value: number) {
  return euroFormatter.format(Math.round(value));
}

const ResultCard = memo(function ResultCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <article className="rounded-[1.35rem] border border-white/12 bg-white/8 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] tabular-nums">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-blue-50/80">{hint}</p>
    </article>
  );
});

const RoiDemoButton = memo(function RoiDemoButton() {
  return (
    <EnterpriseInquiryForm
      buttonLabel="Demo buchen!"
      inquiryType="demo"
      className="th-reference-cta"
    />
  );
});

export function RoiCalculatorSection() {
  const [dealValue, setDealValue] = useState<number>(ROI_DEFAULTS.dealValue);
  const [conversationsPerMonth, setConversationsPerMonth] = useState<number>(
    ROI_DEFAULTS.conversationsPerMonth
  );
  const [teamSize, setTeamSize] = useState<number>(ROI_DEFAULTS.teamSize);
  const [improvementRate, setImprovementRate] = useState<number>(
    ROI_DEFAULTS.improvementRate
  );

  const results = useMemo(
    () =>
      calculateRoi({
        dealValue,
        conversationsPerMonth,
        improvementRate,
        teamSize,
      }),
    [dealValue, conversationsPerMonth, improvementRate, teamSize]
  );

  const monthlyGainLabel = useMemo(
    () => formatCurrency(results.monthlyGainAtFullEffect),
    [results.monthlyGainAtFullEffect]
  );
  const annualGainLabel = useMemo(
    () => formatCurrency(results.annualGain),
    [results.annualGain]
  );
  const perSeatGainLabel = useMemo(
    () => formatCurrency(results.perSeatMonthlyGain),
    [results.perSeatMonthlyGain]
  );

  return (
    <section
      className="pb-10 pt-4 sm:pb-16 sm:pt-6"
      style={{ contain: "layout paint" }}
    >
      <div className="overflow-hidden rounded-[2rem] border border-white/80 bg-[linear-gradient(145deg,#ffffff,rgba(235,244,255,0.92))] shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="border-b border-white/70 p-6 sm:p-8 lg:border-b-0 lg:border-r">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#0e51a0]">
              ROI-Rechner
            </p>
            <h2 className="mt-4 max-w-xl text-3xl font-semibold tracking-[-0.05em] text-[#707070] sm:text-4xl">
              Berechne, was talkingHEADS Sales Trainer in 12 Monaten bewegen kann
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
              Gib 4 Werte ein und sieh in Sekunden, welchen wirtschaftlichen
              Hebel konsequentes Sales-Training mit realistischer Lernkurve
              erzeugen kann.
            </p>

            <div className="mt-8 space-y-5">
              <label className="block rounded-[1.6rem] border border-slate-100 bg-white p-5 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-base font-semibold tracking-[-0.02em] text-[#707070]">
                      Kunden- oder Auftragswert
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      Was ist ein gewonnener Kunde oder Auftrag für dich wert?
                    </p>
                  </div>
                  <span className="rounded-full bg-[#0e51a0]/8 px-3 py-1 text-sm font-semibold text-[#0e51a0]">
                    {formatCurrency(dealValue)}
                  </span>
                </div>
                <input
                  type="range"
                  min={100}
                  max={10000}
                  step={100}
                  value={dealValue}
                  onChange={(event) => setDealValue(Number(event.target.value))}
                  className="mt-5 h-2 w-full cursor-pointer appearance-none rounded-full bg-[#d7e5f5] accent-[#0e51a0]"
                />
                <div className="mt-2 flex justify-between text-xs font-medium text-slate-400">
                  <span>100 EUR</span>
                  <span>10.000 EUR</span>
                </div>
              </label>

              <div className="rounded-[1.6rem] border border-slate-100 bg-white p-5 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-base font-semibold tracking-[-0.02em] text-[#707070]">
                      Teamgröße
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      Wie viele Mitarbeiter trainieren mit talkingHEADS Sales Trainer?
                    </p>
                  </div>
                  <span className="rounded-full bg-[#0e51a0]/8 px-3 py-1 text-sm font-semibold text-[#0e51a0]">
                    {teamSize}
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3">
                  {ROI_TEAM_SIZE_OPTIONS.map((option) => {
                    const isActive = option === teamSize;

                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setTeamSize(option)}
                        className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors ${
                          isActive
                            ? "border-[#0e51a0] bg-[#0e51a0] text-white"
                            : "border-slate-200 bg-white text-[#707070] hover:border-[#0e51a0]/30 hover:text-[#0e51a0]"
                        }`}
                        aria-pressed={isActive}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="block rounded-[1.6rem] border border-slate-100 bg-white p-5 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-base font-semibold tracking-[-0.02em] text-[#707070]">
                      Verkaufsgespräche pro Mitarbeiter pro Monat
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      Wie viele echte Verkaufschancen hat jeder Mitarbeiter im Monat?
                    </p>
                  </div>
                  <span className="rounded-full bg-[#0e51a0]/8 px-3 py-1 text-sm font-semibold text-[#0e51a0]">
                    {conversationsPerMonth}
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={100}
                  step={1}
                  value={conversationsPerMonth}
                  onChange={(event) =>
                    setConversationsPerMonth(Number(event.target.value))
                  }
                  className="mt-5 h-2 w-full cursor-pointer appearance-none rounded-full bg-[#d7e5f5] accent-[#0e51a0]"
                />
                <div className="mt-2 flex justify-between text-xs font-medium text-slate-400">
                  <span>1</span>
                  <span>100</span>
                </div>
              </label>

              <div className="rounded-[1.6rem] border border-slate-100 bg-white p-5 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-base font-semibold tracking-[-0.02em] text-[#707070]">
                      Verbesserung durch Training
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      Plausible Leistungssteigerung bei konsequenter Nutzung.
                    </p>
                  </div>
                  <span className="rounded-full bg-[#0e51a0]/8 px-3 py-1 text-sm font-semibold text-[#0e51a0]">
                    {Math.round(improvementRate * 100)} %
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3">
                  {ROI_IMPROVEMENT_OPTIONS.map((option) => {
                    const isActive = option === improvementRate;

                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setImprovementRate(option)}
                        className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors ${
                          isActive
                            ? "border-[#0e51a0] bg-[#0e51a0] text-white"
                            : "border-slate-200 bg-white text-[#707070] hover:border-[#0e51a0]/30 hover:text-[#0e51a0]"
                        }`}
                        aria-pressed={isActive}
                      >
                        {Math.round(option * 100)} %
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="relative p-6 sm:p-8">
            <div className="rounded-[1.8rem] border border-[#0e51a0]/12 bg-[#0f4f98] p-5 text-white shadow-[0_12px_28px_rgba(14,81,160,0.18)] sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
                Live-Ergebnis
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-balance sm:text-3xl">
                Schon kleine Verbesserungen können deutlichen Mehrumsatz
                auslösen.
              </h3>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-blue-50/88">
                Der Jahreswert berücksichtigt bewusst einen realistischen Ramp-up
                statt ab Monat 1 mit vollem Effekt zu rechnen und skaliert auf
                dein trainierendes Team.
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <ResultCard
                  label="Möglicher Mehrumsatz pro Monat"
                  value={monthlyGainLabel}
                  hint="Bei vollem Effekt nach dem Ramp-up."
                />
                <ResultCard
                  label="Plausibler Mehrumsatz in 12 Monaten"
                  value={annualGainLabel}
                  hint="Mit Lernkurve über alle 12 Monate."
                />
                <ResultCard
                  label="Umsatz pro Kopf"
                  value={perSeatGainLabel}
                  hint="Je trainiertem Mitarbeiter bei vollem Effekt."
                />
              </div>

              <div className="mt-6 rounded-[1.5rem] border border-white/12 bg-white/6 p-4">
                <div className="flex flex-wrap gap-2">
                  {rampUpLabels.map((label, index) => (
                    <div
                      key={label}
                      className="rounded-full border border-white/14 bg-white/8 px-3 py-2 text-xs font-semibold tracking-[0.08em] text-white/80"
                    >
                      {label}: {rampUpValues[index]}
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-sm leading-7 text-blue-50/84">
                  Grundlage aktuell: {results.totalConversationsPerMonth} Verkaufsgespräche
                  pro Monat im Team bei {teamSize} trainierenden Mitarbeitern.
                </p>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <RoiDemoButton />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
