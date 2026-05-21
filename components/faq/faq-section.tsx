import { FaqAccordion, type FaqAccordionItem } from "@/components/faq/faq-accordion";

export type FaqSectionData = {
  description: string;
  id: string;
  items: readonly FaqAccordionItem[];
  title: string;
};

type FaqSectionProps = {
  section: FaqSectionData;
};

export function FaqSection({ section }: FaqSectionProps) {
  return (
    <section
      id={section.id}
      className="scroll-mt-28 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)] sm:p-6 lg:p-7"
    >
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#0e51a0]">
          Kategorie
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[#707070] sm:text-3xl">
          {section.title}
        </h2>
        <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
          {section.description}
        </p>
      </div>

      <div className="mt-6">
        <FaqAccordion items={section.items} />
      </div>
    </section>
  );
}
