type ChatMessage = {
  id: string;
  sender_type: "assistant" | "system" | "user";
  content: string;
  created_at: string;
};

type ChatMessageListProps = {
  messages: ChatMessage[];
};

const timeFormatter = new Intl.DateTimeFormat("de-DE", {
  hour: "2-digit",
  minute: "2-digit",
});

export function ChatMessageList({ messages }: ChatMessageListProps) {
  return (
    <div className="space-y-4 px-4 py-6 sm:px-6 sm:py-8">
      {messages.map((message) => {
        const isUserMessage = message.sender_type === "user";
        const isSystemMessage = message.sender_type === "system";

        return (
          <div
            key={message.id}
            className={`flex ${
              isSystemMessage
                ? "justify-center"
                : isUserMessage
                  ? "justify-end"
                  : "justify-start"
            }`}
          >
            <article
              className={`${
                isSystemMessage ? "max-w-xl" : "max-w-[90%] sm:max-w-[78%]"
              } rounded-[1.75rem] px-4 py-3.5 shadow-[0_16px_36px_rgba(15,23,42,0.06)] ${
                isSystemMessage
                  ? "border border-[#0b478b] bg-[#0E51A0] text-[#dce8fb]"
                  : isUserMessage
                    ? "rounded-br-md bg-[linear-gradient(180deg,#f6ab2c_0%,#EA9413_52%,#db8302_100%)] text-white shadow-[0_20px_42px_rgba(14,81,160,0.24)]"
                    : "rounded-bl-md border border-[#dbe7f8] bg-white text-[#1b2b45]"
              }`}
            >
              {!isSystemMessage ? (
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold uppercase tracking-[0.18em] ${
                      isUserMessage
                        ? "bg-white/16 text-white"
                        : "bg-[#0e51a0]/10 text-[#dce8fb]"
                    }`}
                  >
                    {isUserMessage ? "Du" : "AI"}
                  </span>
                  <span
                    className={`text-[11px] font-medium uppercase tracking-[0.18em] ${
                      isUserMessage ? "text-white/70" : "text-slate-500"
                    }`}
                  >
                    {isUserMessage ? "Dein Beitrag" : "Trainingspartner"}
                  </span>
                </div>
              ) : (
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#dce8fb]">
                  Trainingshinweis
                </p>
              )}

              <p className="whitespace-pre-wrap break-words text-sm leading-7 sm:text-[15px]">
                {message.content}
              </p>
              <p
                className={`mt-3 text-[11px] ${
                  isSystemMessage
                    ? "text-slate-500"
                    : isUserMessage
                      ? "text-white/70"
                      : "text-slate-500"
                }`}
              >
                {timeFormatter.format(new Date(message.created_at))}
              </p>
            </article>
          </div>
        );
      })}
    </div>
  );
}
