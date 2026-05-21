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
    <header className="border-b border-white/20 bg-transparent px-4 py-4 sm:px-6">
      <div className="flex items-start gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#dce8fb]">
            talkingHEADS Sales Trainer
          </p>
          <h1 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-white sm:text-2xl">
            {modeLabel}
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#dce8fb]">
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

      <div className="mt-5 grid gap-3 rounded-[1.5rem] border border-white/20 bg-[#0b478b] p-4 text-sm text-white shadow-[0_16px_40px_rgba(15,23,42,0.06)] sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <p className="font-medium text-[#dce8fb]">Modul</p>
          <p className="mt-1 font-semibold text-white">{modeLabel}</p>
        </div>
        <div>
          <p className="font-medium text-[#dce8fb]">Status</p>
          <p className="mt-1 font-semibold text-white">{conversationStatus}</p>
        </div>
        <div className="sm:col-span-2 lg:col-span-1">
          <p className="font-medium text-[#dce8fb]">Trainingsfokus</p>
          <p className="mt-1 font-semibold text-white">
            Klarheit, Wirkung und Gesprächssicherheit
          </p>
        </div>
      </div>
    </header>
  );
}
