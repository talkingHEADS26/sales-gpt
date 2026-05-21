import type { Metadata } from "next";

import { LegalPageShell } from "@/components/legal-page-shell";
import { termsLastUpdated, termsSections } from "@/lib/legal";

export const metadata: Metadata = {
  title: "AGB",
  description:
    "Allgemeine Geschäftsbedingungen für die Nutzung von talkingHEADS Sales Trainer.",
};

export default function AgbPage() {
  return (
    <LegalPageShell
      eyebrow="AGB"
      title="Allgemeine Geschäftsbedingungen für talkingHEADS Sales Trainer."
      description="Die folgenden AGB wurden aus dem bereitgestellten Dokument in eine strukturierte, direkt lesbare Produktseite überführt."
    >
      {termsSections.map((section) => (
        <section
          key={section.title}
          className="rounded-[1.5rem] border border-white/80 bg-white/88 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]"
        >
          <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#707070]">
            {section.title}
          </h2>

          {"paragraphs" in section ? (
            <div className="mt-3 space-y-3 text-sm leading-7 text-slate-600 sm:text-base">
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          ) : null}

          {"bullets" in section ? (
            <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-600 sm:text-base">
              {section.bullets.map((bullet) => (
                <li key={bullet} className="flex gap-3">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#0e51a0]" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          ) : null}

          {"subSections" in section ? (
            <div className="mt-5 space-y-5">
              {section.subSections.map((subSection) => (
                <section
                  key={subSection.title}
                  className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4"
                >
                  <h3 className="text-base font-semibold text-[#707070]">
                    {subSection.title}
                  </h3>
                  <ul className="mt-3 space-y-3 text-sm leading-7 text-slate-600 sm:text-base">
                    {subSection.bullets.map((bullet) => (
                      <li key={bullet} className="flex gap-3">
                        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#0e51a0]" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          ) : null}
        </section>
      ))}

      <section className="rounded-[1.5rem] border border-white/80 bg-white/88 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0e51a0]">
          Stand
        </p>
        <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
          {termsLastUpdated}
        </p>
      </section>
    </LegalPageShell>
  );
}
