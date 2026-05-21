import { formatConversationStatus, getSessionModeLabel } from "@/lib/chat-copy";

type ChatHeaderProps = {
  sessionType:
    | "appointment_setting"
    | "complaint_management"
    | "full_sales"
    | "situation_coaching";
  status: string;
  title: string | null;
};

export function ChatHeader({ sessionType, status, title }: ChatHeaderProps) {
  const modeLabel = getSessionModeLabel(sessionType, title);
  const conversationStatus = formatConversationStatus(status);
  const isFullChat = title === "__full_chat__";

  return (
    <header className="border-b border-white/80 bg-white/78 px-4 py-4 backdrop-blur sm:px-6">
      <div className="flex items-start gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#0e51a0]">
            talkingHEADS Sales Trainer
          </p>
          <h1 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-[#707070] sm:text-2xl">
            {modeLabel}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {isFullChat
              ? "Freier Trainingsraum für Argumentation, Gesprächsführung und schnelle Iteration."
              : sessionType === "appointment_setting"
                ? "Telefonisches Terminsetting mit realistischen Leads, Einwaenden und klarer Terminentscheidung."
                : sessionType === "complaint_management"
                  ? "Realistische Beschwerdegespraeche mit Fokus auf Deeskalation, Klaerung und professionelle Loesung."
                : sessionType === "situation_coaching"
                ? "Fokussiertes Coaching für konkrete Gesprächssituationen und Einwände."
                : "Aktives Sales-Training mit realistischem Gesprächsverlauf und Abschlussfokus."}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 rounded-[1.5rem] border border-white/80 bg-[linear-gradient(180deg,rgba(14,81,160,0.06),rgba(255,255,255,0.95)_32%)] p-4 text-sm text-[#707070] shadow-[0_16px_40px_rgba(15,23,42,0.06)] sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <p className="font-medium text-slate-500">Modul</p>
          <p className="mt-1 font-semibold text-[#707070]">{modeLabel}</p>
        </div>
        <div>
          <p className="font-medium text-slate-500">Status</p>
          <p className="mt-1 font-semibold text-[#707070]">{conversationStatus}</p>
        </div>
        <div className="sm:col-span-2 lg:col-span-1">
          <p className="font-medium text-slate-500">Trainingsfokus</p>
          <p className="mt-1 font-semibold text-[#707070]">
            Klarheit, Wirkung und Gesprächssicherheit
          </p>
        </div>
      </div>
    </header>
  );
}
