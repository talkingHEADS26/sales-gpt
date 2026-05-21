import type { StructuredSessionFeedback } from "@/lib/session-feedback";

type SessionFeedbackPanelProps = {
  feedback: StructuredSessionFeedback;
  sessionType:
    | "appointment_setting"
    | "complaint_management"
    | "full_sales"
    | "situation_coaching";
};

function getOutcomeLabel(
  sessionType: SessionFeedbackPanelProps["sessionType"],
  outcome: string
) {
  switch (sessionType) {
    case "full_sales":
      return outcome === "closed" ? "Abschluss erzielt" : "Kein Abschluss";
    case "appointment_setting":
      return outcome === "appointment_booked"
        ? "Termin vereinbart"
        : "Kein Termin";
    case "complaint_management":
      return outcome === "resolved" ? "Beschwerde gelöst" : "Nicht gelöst";
    case "situation_coaching":
    default:
      return outcome;
  }
}

type FeedbackSectionProps = {
  bullets: string[];
  summary: string;
  title: string;
};

function FeedbackSection({ bullets, summary, title }: FeedbackSectionProps) {
  return (
    <section className="rounded-[1.4rem] border border-slate-200 bg-white px-4 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {bullets.length > 0 ? (
        <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
          {bullets.map((bullet) => (
            <li key={bullet} className="flex gap-2">
              <span className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[#0e51a0]" />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {summary ? <p className="mt-3 text-sm leading-6 text-slate-600">{summary}</p> : null}
    </section>
  );
}

export function SessionFeedbackPanel({
  feedback,
  sessionType,
}: SessionFeedbackPanelProps) {
  return (
    <div className="px-4 pb-6 pt-2 sm:px-6 sm:pb-8">
      <section className="rounded-[1.75rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f7faff_100%)] p-4 shadow-[0_20px_48px_rgba(15,23,42,0.08)] sm:p-5">
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0e51a0]">
              Session-Ergebnis
            </p>
            <h2 className="mt-2 text-lg font-semibold text-slate-900">
              {getOutcomeLabel(sessionType, feedback.outcome)}
            </h2>
          </div>
          <span className="inline-flex items-center rounded-full bg-[#0e51a0]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#0e51a0]">
            Outcome: {feedback.outcome}
          </span>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <FeedbackSection
            bullets={feedback.positive.bullets}
            summary={feedback.positive.summary}
            title="Was war positiv"
          />
          <FeedbackSection
            bullets={feedback.negative.bullets}
            summary={feedback.negative.summary}
            title="Was ist nicht gut gelaufen"
          />
          <section className="rounded-[1.4rem] border border-slate-200 bg-white px-4 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
            <h3 className="text-sm font-semibold text-slate-900">
              Konkrete Handlungsempfehlungen
            </h3>
            {feedback.recommendations.specific.length > 0 ? (
              <>
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Gesprächsbezogen
                </p>
                <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-700">
                  {feedback.recommendations.specific.map((bullet) => (
                    <li key={bullet} className="flex gap-2">
                      <span className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[#0e51a0]" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            {feedback.recommendations.general.length > 0 ? (
              <>
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Allgemein
                </p>
                <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-700">
                  {feedback.recommendations.general.map((bullet) => (
                    <li key={bullet} className="flex gap-2">
                      <span className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[#0e51a0]" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </section>
        </div>
      </section>
    </div>
  );
}
