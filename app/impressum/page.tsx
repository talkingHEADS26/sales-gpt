import type { Metadata } from "next";

import { LegalPageShell } from "@/components/legal-page-shell";
import { legalNoticeSections } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Impressum",
  description:
    "Anbieterangaben und verfügbare Kontaktdaten für AbschlussIO.",
};

export default function ImpressumPage() {
  return (
    <LegalPageShell
      eyebrow="Impressum"
      title="Anbieterangaben für AbschlussIO."
      description="Das Impressum verwendet dieselben Anbieter-Stammdaten wie die Datenschutzerklärung und führt nur die Angaben auf, die im aktuellen Projektstand hinterlegt sind."
    >
      {legalNoticeSections.map((section) => (
        <section
          key={section.title}
          className="rounded-[1.5rem] border border-white/80 bg-white/88 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]"
        >
          <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#707070]">
            {section.title}
          </h2>
          <div className="mt-3 space-y-3 text-sm leading-7 text-slate-600 sm:text-base">
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </section>
      ))}
    </LegalPageShell>
  );
}
