import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal-page-shell";
import { legalPrivacySections } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Datenschutz",
  description:
    "Informationen zu Datenschutz, Cookie-Kategorien und der Verarbeitung technischer Nutzungsdaten in talkingHEADS Sales Trainer.",
};

export default function DatenschutzPage() {
  return (
    <LegalPageShell
      eyebrow="Datenschutz"
      title="Transparenz für Cookies und technische Datennutzung."
      description="Diese Seite erklärt auf Produkt-Ebene, welche Cookie-Kategorien in talkingHEADS Sales Trainer vorgesehen sind, welche Anbieterangaben für die Plattform hinterlegt sind und wie Nutzerinnen und Nutzer ihre Einwilligung steuern können."
    >
      {legalPrivacySections.map((section) => (
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
