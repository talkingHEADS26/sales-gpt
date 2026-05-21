"use client";

import { useId, useState } from "react";

export type FaqAccordionItem = {
  answer: string;
  question: string;
};

type FaqAccordionProps = {
  items: readonly FaqAccordionItem[];
};

export function FaqAccordion({ items }: FaqAccordionProps) {
  const accordionId = useId();
  const [openItemIndex, setOpenItemIndex] = useState<number | null>(0);

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const isOpen = openItemIndex === index;
        const triggerId = `${accordionId}-trigger-${index}`;
        const panelId = `${accordionId}-panel-${index}`;

        return (
          <article
            key={item.question}
            className={`rounded-[1.5rem] border bg-white ${
              isOpen
                ? "border-[#0e51a0]/24"
                : "border-slate-200"
            }`}
          >
            <button
              type="button"
              id={triggerId}
              onClick={() =>
                // Keep exactly one stable trigger per item and avoid layout-heavy
                // height calculations. This prevents double-trigger quirks and
                // mobile browser instability during rapid toggles.
                setOpenItemIndex((currentIndex) =>
                  currentIndex === index ? null : index
                )
              }
              className="flex w-full items-start gap-4 px-5 py-5 text-left sm:px-6"
              aria-controls={panelId}
              aria-expanded={isOpen}
            >
              <span className="pointer-events-none mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-[#0e51a0]/8 text-[#0e51a0]">
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  {isOpen ? <path d="M5 12H19" /> : (
                    <>
                      <path d="M12 5V19" />
                      <path d="M5 12H19" />
                    </>
                  )}
                </svg>
              </span>
              <span className="min-w-0 flex-1">
                <h3 className="text-base font-semibold leading-7 tracking-[-0.02em] text-[#707070] sm:text-lg">
                  {item.question}
                </h3>
              </span>
            </button>

            {isOpen ? (
              <div
                id={panelId}
                role="region"
                aria-labelledby={triggerId}
                className="px-5 pb-5 sm:px-6 sm:pb-6"
              >
                <p className="pr-2 text-sm leading-7 text-slate-600 sm:text-base">
                  {item.answer}
                </p>
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
