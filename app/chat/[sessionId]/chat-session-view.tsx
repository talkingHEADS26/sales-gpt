"use client";

import { useEffect, useRef, useState } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import { useRouter } from "next/navigation";

import { InternalAppShell } from "@/components/internal-app-shell";
import { getWelcomeMessage } from "@/lib/chat-copy";
import { FRANCHISE_VERTICAL_LABELS, normalizeIndustryKey } from "@/lib/industries";
import { parseStructuredSessionFeedback } from "@/lib/session-feedback";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase";
import {
  formatDurationLabel,
  MAX_AUDIO_SECONDS_PER_SESSION,
} from "@/lib/usage-limits";
import { ChatHeader } from "./chat-header";
import { ChatInputForm } from "./chat-input-form";
import { ChatMessageList } from "./chat-message-list";
import { SessionFeedbackPanel } from "./session-feedback-panel";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
});

type ChatSession = {
  audio_seconds_used: number;
  id: string;
  limit_reason: string | null;
  organizations: {
    franchise_vertical?: string | null;
    industry_key: string | null;
  } | null;
  status: string;
  session_type:
    | "appointment_setting"
    | "complaint_management"
    | "full_sales"
    | "situation_coaching";
  title: string | null;
  usage_limit_reached: boolean;
};

type ChatMessage = {
  id: string;
  sender_type: "assistant" | "system" | "user";
  content: string;
  created_at: string;
};

type SessionFeedbackSnapshot = {
  feedback: unknown;
};

type FullSalesAvatarSnapshot = {
  avatar_age: number | null;
  avatar_difficulty: string | null;
  avatar_name: string | null;
  avatar_primary_problem: string | null;
  avatar_profession_or_context: string | null;
};

type ChatApiResponse = {
  chatMessage?: ChatMessage;
  error?: string;
};

type ChatSessionViewProps = {
  sessionId: string;
};

function toBriefingValue(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "Nicht angegeben";
  }

  if (typeof value !== "string") {
    return "Nicht angegeben";
  }

  const normalizedValue = value.trim();
  return normalizedValue.length > 0 ? normalizedValue : "Nicht angegeben";
}

function formatFullSalesBriefing(params: {
  avatarAge: number | null | undefined;
  avatarDifficulty: string | null | undefined;
  franchiseVertical?: string | null | undefined;
  industryKey: string | null | undefined;
  avatarName: string | null | undefined;
  avatarPrimaryProblem: string | null | undefined;
  avatarProfessionOrContext: string | null | undefined;
}) {
  const normalizedIndustryKey = normalizeIndustryKey(params.industryKey);
  const primaryProblemLabel = (() => {
    if (normalizedIndustryKey === "energy") {
      return "Konkretes Interesse";
    }
    if (normalizedIndustryKey === "franchise") {
      return "Interessebild";
    }
    return "Beschwerdebild";
  })();
  const briefingLines = [
    "Kunden-Briefing",
    "",
    `Name: ${toBriefingValue(params.avatarName)}`,
    `Alter: ${toBriefingValue(params.avatarAge)}`,
    `Beruf: ${toBriefingValue(params.avatarProfessionOrContext)}`,
  ];

  if (normalizedIndustryKey === "franchise") {
    const normalizedFranchiseVertical =
      typeof params.franchiseVertical === "string"
        ? params.franchiseVertical.trim()
        : "";
    const franchiseVerticalLabel =
      FRANCHISE_VERTICAL_LABELS[
        (normalizedFranchiseVertical in FRANCHISE_VERTICAL_LABELS
          ? normalizedFranchiseVertical
          : "other") as keyof typeof FRANCHISE_VERTICAL_LABELS
      ];
    briefingLines.push(`Franchise-Segment: ${franchiseVerticalLabel}`);
  }

  briefingLines.push(
    `${primaryProblemLabel}: ${toBriefingValue(params.avatarPrimaryProblem)}`,
    `Schwierigkeitslevel: ${toBriefingValue(params.avatarDifficulty)}`,
    "",
    "Starte jetzt das Beratungsgespräch. Du eröffnest das Gespräch mit deiner ersten Nachricht."
  );

  return briefingLines.join("\n");
}

export function ChatSessionView({ sessionId }: ChatSessionViewProps) {
  const router = useRouter();
  const [session, setSession] = useState<ChatSession | null>(null);
  const [sessionFeedback, setSessionFeedback] = useState<ReturnType<
    typeof parseStructuredSessionFeedback
  > | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState("");
  const [sendError, setSendError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isAwaitingAi, setIsAwaitingAi] = useState(false);
  const messageListEndRef = useRef<HTMLDivElement | null>(null);

  const loadStructuredSessionFeedback = async (
    supabase: ReturnType<typeof getSupabaseBrowserClient>,
    activeSession: ChatSession
  ) => {
    if (!supabase || activeSession.session_type === "situation_coaching") {
      setSessionFeedback(null);
      return;
    }

    const tableName =
      activeSession.session_type === "full_sales"
        ? "full_sales_kpi_snapshots"
        : activeSession.session_type === "appointment_setting"
          ? "appointment_setting_kpi_snapshots"
          : "complaint_management_kpi_snapshots";

    const { data, error } = await supabase
      .from(tableName)
      .select("feedback")
      .eq("session_id", activeSession.id)
      .maybeSingle<SessionFeedbackSnapshot>();

    if (error) {
      throw error;
    }

    setSessionFeedback(parseStructuredSessionFeedback(data?.feedback));
  };

  useEffect(() => {
    messageListEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    let isActive = true;

    const loadSession = async () => {
      if (!hasSupabaseEnv) {
        if (isActive) {
          setError(
            "Supabase ist noch nicht vollständig konfiguriert. Pruefe deine Umgebungsvariablen."
          );
          setIsLoading(false);
        }
        return;
      }

      try {
        const supabase = getSupabaseBrowserClient();

        if (!supabase) {
          throw new Error(
            "Supabase konnte nicht initialisiert werden. Pruefe die Konfiguration."
          );
        }

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          router.replace("/login");
          return;
        }

        const { data: session, error: sessionError } = await supabase
          .from("chat_sessions")
          .select(
            "id, session_type, status, title, audio_seconds_used, usage_limit_reached, limit_reason, organizations(industry_key, franchise_vertical)"
          )
          .eq("id", sessionId)
          .eq("user_id", user.id)
          .maybeSingle<ChatSession>();

        if (sessionError) {
          throw sessionError;
        }

        if (!session) {
          router.replace("/dashboard");
          return;
        }

        const { data: messages, error: messagesError } = await supabase
          .from("chat_messages")
          .select("id, sender_type, content, created_at")
          .eq("session_id", sessionId)
          .order("created_at", { ascending: true });

        if (messagesError) {
          throw messagesError;
        }

        let resolvedMessages = ((messages ?? []) as ChatMessage[]);

        if (resolvedMessages.length === 0) {
          let welcomeMessage: string;

          if (session.session_type === "full_sales") {
            const { data: avatarSnapshot, error: avatarSnapshotError } = await supabase
              .from("full_sales_avatar_snapshots")
              .select(
                "avatar_name, avatar_age, avatar_profession_or_context, avatar_primary_problem, avatar_difficulty"
              )
              .eq("session_id", session.id)
              .maybeSingle<FullSalesAvatarSnapshot>();

            if (avatarSnapshotError) {
              throw avatarSnapshotError;
            }

            welcomeMessage = formatFullSalesBriefing({
              avatarAge: avatarSnapshot?.avatar_age,
              avatarDifficulty: avatarSnapshot?.avatar_difficulty,
              franchiseVertical: session.organizations?.franchise_vertical,
              industryKey: session.organizations?.industry_key,
              avatarName: avatarSnapshot?.avatar_name,
              avatarPrimaryProblem: avatarSnapshot?.avatar_primary_problem,
              avatarProfessionOrContext: avatarSnapshot?.avatar_profession_or_context,
            });
          } else {
            welcomeMessage = getWelcomeMessage({
              industryKey: normalizeIndustryKey(session.organizations?.industry_key),
              sessionTitle: session.title,
              sessionType: session.session_type,
            });
          }

          const { data: insertedWelcomeMessage, error: welcomeInsertError } =
            await supabase
              .from("chat_messages")
              .insert({
                session_id: session.id,
                sender_type: session.session_type === "full_sales" ? "system" : "assistant",
                content: welcomeMessage,
              })
              .select("id, sender_type, content, created_at")
              .single<ChatMessage>();

          if (welcomeInsertError) {
            throw welcomeInsertError;
          }

          resolvedMessages = [insertedWelcomeMessage];
        }

        if (isActive) {
          setSession(session);
          setMessages(resolvedMessages);
          await loadStructuredSessionFeedback(supabase, session);
          setError("");
          setIsLoading(false);
        }
      } catch (err) {
        if (isActive) {
          const message =
            err instanceof Error
              ? err.message
              : "Die Session konnte nicht geladen werden.";

          setError(message);
          setIsLoading(false);
        }
      }
    };

    void loadSession();

    return () => {
      isActive = false;
    };
  }, [router, sessionId]);

  const handleSendMessage = async (content: string) => {
    if (!session) {
      return false;
    }

    if (!hasSupabaseEnv) {
      setSendError(
        "Supabase ist noch nicht vollständig konfiguriert. Pruefe deine Umgebungsvariablen."
      );
      return false;
    }

    try {
      setIsSending(true);
      setSendError("");

      const supabase = getSupabaseBrowserClient();

      if (!supabase) {
        throw new Error(
          "Supabase konnte nicht initialisiert werden. Pruefe die Konfiguration."
        );
      }

      const { data: insertedMessage, error: insertError } = await supabase
        .from("chat_messages")
        .insert({
          session_id: session.id,
          sender_type: "user",
          content,
        })
        .select("id, sender_type, content, created_at")
        .single<ChatMessage>();

      if (insertError) {
        throw insertError;
      }

      setMessages((currentMessages) => [...currentMessages, insertedMessage]);

      const {
        data: { session: authSession },
      } = await supabase.auth.getSession();

      const accessToken = authSession?.access_token;

      if (!accessToken) {
        throw new Error("Keine aktive Session fuer den AI-Request gefunden.");
      }

      setIsAwaitingAi(true);

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          sessionId: session.id,
          message: content,
        }),
      });

      const responseBody = (await response.json()) as ChatApiResponse;

      if (!response.ok) {
        throw new Error(
          responseBody.error ?? "Die AI-Antwort konnte nicht geladen werden."
        );
      }

      if (responseBody.chatMessage) {
        setMessages((currentMessages) => [
          ...currentMessages,
          responseBody.chatMessage as ChatMessage,
        ]);
      }

      const { data: refreshedSession, error: refreshedSessionError } = await supabase
        .from("chat_sessions")
        .select(
          "id, session_type, status, title, audio_seconds_used, usage_limit_reached, limit_reason, organizations(industry_key, franchise_vertical)"
        )
        .eq("id", session.id)
        .maybeSingle<ChatSession>();

      if (refreshedSessionError) {
        throw refreshedSessionError;
      }

      if (refreshedSession) {
        setSession(refreshedSession);
        await loadStructuredSessionFeedback(supabase, refreshedSession);
      }

      return true;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Die Nachricht konnte nicht gespeichert werden.";

      setSendError(message);
      return false;
    } finally {
      setIsSending(false);
      setIsAwaitingAi(false);
    }
  };

  const handleAudioUsageUpdate = (
    audioSecondsUsed: number,
    isAudioLimitReached: boolean
  ) => {
    setSession((currentSession) =>
      currentSession
        ? {
            ...currentSession,
            audio_seconds_used: audioSecondsUsed,
            limit_reason: isAudioLimitReached
              ? "session_audio_limit_reached"
              : currentSession.limit_reason,
            usage_limit_reached: isAudioLimitReached,
          }
        : currentSession
    );
  };

  return (
    <InternalAppShell
      containerClassName={`${plusJakartaSans.className} mx-auto flex min-h-screen w-full max-w-6xl flex-col px-0 py-0 sm:px-4 sm:py-5`}
    >
      <section className="flex min-h-screen w-full flex-col overflow-hidden border border-[#dbe7f8] bg-white shadow-[0_18px_45px_rgba(14,81,160,0.14)] sm:min-h-[calc(100vh-7.5rem)] sm:rounded-[1.75rem] sm:backdrop-blur">
        {session ? (
          <ChatHeader
            sessionType={session.session_type}
            title={session.title}
            status={session.status}
          />
        ) : null}

        {isLoading ? (
          <div className="flex flex-1 items-center justify-center px-6 py-12">
            <p className="text-base leading-7 text-slate-600">
              Session wird geladen...
            </p>
          </div>
        ) : null}

        {!isLoading && error ? (
          <div className="flex flex-1 items-center justify-center px-6 py-12">
            <p className="w-full max-w-xl rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          </div>
        ) : null}

        {!isLoading && !error ? (
          <div className="flex min-h-0 flex-1 flex-col bg-[linear-gradient(180deg,#f8fbff_0%,#f1f7ff_100%)]">
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="px-4 pt-5 sm:px-6 sm:pt-6">
                <div className="rounded-[1.25rem] border border-[#dbe7f8] bg-white px-4 py-3 text-sm text-slate-600 shadow-[0_10px_24px_rgba(14,81,160,0.08)]">
                  <p className="font-semibold uppercase tracking-[0.18em] text-[#0e51a0]">
                    Aktive Trainingseinheit
                  </p>
                  <p className="mt-2 leading-7">
                    Bleibe konkret, führe klar und nutze den Chat wie einen echten Trainingsraum für Verkaufsgespräche.
                  </p>
                  <div className="mt-3 flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-medium text-slate-600">
                      Audio in dieser Session:{" "}
                      <span className="text-[#0e51a0]">
                        {formatDurationLabel(session!.audio_seconds_used)} /{" "}
                        {formatDurationLabel(MAX_AUDIO_SECONDS_PER_SESSION)}
                      </span>
                    </p>
                    {session!.usage_limit_reached ? (
                      <p className="text-red-700">
                        Audio-Limit erreicht. Text bleibt verfügbar.
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
              <ChatMessageList messages={messages} />
              {sessionFeedback ? (
                <SessionFeedbackPanel
                  feedback={sessionFeedback}
                  sessionType={session!.session_type}
                />
              ) : null}
              {isAwaitingAi ? (
                <div className="px-4 pb-3 sm:px-6">
                  <div className="flex justify-start">
                    <div className="max-w-[90%] rounded-[1.75rem] rounded-bl-md border border-white/80 bg-white px-4 py-3.5 text-sm text-slate-600 shadow-[0_16px_36px_rgba(15,23,42,0.06)] sm:max-w-[78%]">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#0e51a0]/10 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0e51a0]">
                          AI
                        </span>
                        <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
                          Trainingspartner
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[#0e51a0] [animation-delay:-0.2s]" />
                        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[#0e51a0]/80 [animation-delay:-0.1s]" />
                        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[#0e51a0]/60" />
                        <span className="ml-1">talkingHEADS Sales Trainer antwortet...</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
              <div ref={messageListEndRef} />
            </div>

            {sendError ? (
              <div className="border-t border-red-100 bg-red-50 px-4 py-3 sm:px-6">
                <p className="text-sm text-red-700">{sendError}</p>
              </div>
            ) : null}

            <ChatInputForm
              audioSecondsUsed={session!.audio_seconds_used}
              disabled={isAwaitingAi}
              isAudioLimitReached={session!.usage_limit_reached}
              isSending={isSending || isAwaitingAi}
              onAudioUsageUpdate={handleAudioUsageUpdate}
              onSubmitMessage={handleSendMessage}
              sessionId={session!.id}
            />
          </div>
        ) : null}
      </section>
    </InternalAppShell>
  );
}
