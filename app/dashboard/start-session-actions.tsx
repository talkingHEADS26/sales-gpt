"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase";
import {
  APPOINTMENT_LEAD_SOURCE_OPTIONS,
  COMPLAINT_CHANNEL_OPTIONS,
  type AppointmentLeadSource,
  type ComplaintChannelOption,
} from "@/lib/training-session-config";
import {
  MONTHLY_SESSION_LIMIT_REACHED_CODE,
  MONTHLY_SESSION_LIMIT,
} from "@/lib/usage-limits";

type SessionType =
  | "appointment_setting"
  | "complaint_management"
  | "full_sales"
  | "situation_coaching"
  | "full_chat";

type SelectableSessionType = "appointment_setting" | "complaint_management";

type StartSessionActionsProps = {
  userId: string;
};

type StartSessionResponse = {
  code?: string | null;
  error?: string;
  limit?: number;
  remainingSessions?: number;
  resumedExisting?: boolean;
  sessionId?: string;
  usedSessions?: number;
};

type OpenSessionResponse = {
  coreFlowSessionId?: string | null;
  coreFlowUpdatedAt?: string | null;
  error?: string;
  fullChatSessionId?: string | null;
  fullChatUpdatedAt?: string | null;
};

type UsageSummaryResponse = {
  error?: string;
  monthlySessionLimit?: number;
  remainingSessions?: number;
  success?: boolean;
  usedSessions?: number;
};

type StartSessionOptions = {
  appointmentLeadSource?: AppointmentLeadSource;
  complaintChannel?: ComplaintChannelOption;
  forceNew?: boolean;
};

function getErrorMessage(err: unknown) {
  if (err instanceof Error) {
    return err.message;
  }

  if (
    typeof err === "object" &&
    err !== null &&
    "message" in err &&
    typeof err.message === "string"
  ) {
    return err.message;
  }

  return "Die Session konnte nicht erstellt werden.";
}

const sessionConfig: Record<
  SessionType,
  {
    buttonLabel: string;
    description: string;
    loadingLabel: string;
    title: string;
  }
> = {
  full_sales: {
    buttonLabel: "Verkaufsgespräch starten",
    loadingLabel: "Starte Verkaufsgespräch...",
    description:
      "Simuliere ein vollständiges Verkaufsgespräch mit Fokus auf Dynamik und Abschluss.",
    title: "Verkaufsgespräch starten",
  },
  appointment_setting: {
    buttonLabel: "Leadquelle wählen",
    loadingLabel: "Starte Telefontraining...",
    description:
      "Trainiere reale Leadgespräche und sichere dir verbindliche Termine unter echten Gesprächsbedingungen.",
    title: "Telefontraining",
  },
  complaint_management: {
    buttonLabel: "Kanal wählen",
    loadingLabel: "Starte Beschwerdemanager...",
    description:
      "Trainiere anspruchsvolle Beschwerdegespräche und lerne, auch schwierige Kunden professionell zurückzugewinnen.",
    title: "Beschwerdemanager",
  },
  full_chat: {
    buttonLabel: "Full Chat",
    loadingLabel: "Starte Full Chat...",
    description:
      "Arbeite frei an Argumentation, Gesprächsführung und spontanen Gesprächsverläufen.",
    title: "Full Chat",
  },
  situation_coaching: {
    buttonLabel: "Situationscoaching starten",
    loadingLabel: "Starte Situationscoaching...",
    description:
      "Analysiere echte Gespräche und erkenne, was du konkret besser machen kannst.",
    title: "Situationscoaching starten",
  },
};

function getSessionBadge(sessionType: SessionType) {
  switch (sessionType) {
    case "full_sales":
      return "Beratungstraining";
    case "appointment_setting":
      return "Telefontraining";
    case "complaint_management":
      return "Beschwerdemanager";
    case "situation_coaching":
      return "Coaching";
    case "full_chat":
    default:
      return "Training";
  }
}

function getCardClasses(isPrimary: boolean) {
  return `flex min-h-56 flex-col rounded-[1.75rem] border p-6 text-left shadow-[0_18px_46px_rgba(15,23,42,0.08)] transition ${
    isPrimary
      ? "border-[#0e51a0]/20 bg-[linear-gradient(180deg,rgba(14,81,160,0.08),rgba(255,255,255,0.98)_30%)]"
      : "border-white/80 bg-white/88"
  }`;
}

export function StartSessionActions({ userId }: StartSessionActionsProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [monthlySessionLimit, setMonthlySessionLimit] =
    useState(MONTHLY_SESSION_LIMIT);
  const [pendingSessionType, setPendingSessionType] =
    useState<SessionType | null>(null);
  const [resumableCoreFlowSessionId, setResumableCoreFlowSessionId] =
    useState<string | null>(null);
  const [isCheckingResumableSession, setIsCheckingResumableSession] =
    useState(true);
  const [remainingSessions, setRemainingSessions] = useState<number | null>(null);
  const [usedSessions, setUsedSessions] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadOpenSessions = async () => {
      if (!hasSupabaseEnv) {
        if (isMounted) {
          setIsCheckingResumableSession(false);
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
          data: { session: authSession },
        } = await supabase.auth.getSession();

        const accessToken = authSession?.access_token;

        if (!accessToken) {
          if (isMounted) {
            setResumableCoreFlowSessionId(null);
            setIsCheckingResumableSession(false);
          }
          return;
        }

        const [openSessionResponse, usageSummaryResponse] = await Promise.all([
          fetch("/api/sessions/open", {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }),
          fetch("/api/usage/summary", {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }),
        ]);

        const openSessionBody =
          (await openSessionResponse.json()) as OpenSessionResponse;
        const usageSummaryBody =
          (await usageSummaryResponse.json()) as UsageSummaryResponse;

        if (!openSessionResponse.ok) {
          throw new Error(
            openSessionBody.error ?? "Die offene Session konnte nicht geladen werden."
          );
        }

        if (!usageSummaryResponse.ok) {
          throw new Error(
            usageSummaryBody.error ?? "Die Usage-Daten konnten nicht geladen werden."
          );
        }

        if (!isMounted) {
          return;
        }

        setResumableCoreFlowSessionId(openSessionBody.coreFlowSessionId ?? null);
        setMonthlySessionLimit(
          usageSummaryBody.monthlySessionLimit ?? MONTHLY_SESSION_LIMIT
        );
        setRemainingSessions(
          usageSummaryBody.remainingSessions ?? MONTHLY_SESSION_LIMIT
        );
        setUsedSessions(usageSummaryBody.usedSessions ?? 0);
      } catch (err) {
        if (isMounted) {
          setResumableCoreFlowSessionId(null);
          setError((currentError) => currentError || getErrorMessage(err));
        }
      } finally {
        if (isMounted) {
          setIsCheckingResumableSession(false);
        }
      }
    };

    void loadOpenSessions();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const handleStartSession = async (
    sessionType: SessionType,
    options?: StartSessionOptions
  ) => {
    if (!hasSupabaseEnv) {
      setError(
        "Supabase ist noch nicht vollständig konfiguriert. Pruefe deine Umgebungsvariablen."
      );
      return;
    }

    try {
      setPendingSessionType(sessionType);
      setError("");

      const supabase = getSupabaseBrowserClient();

      if (!supabase) {
        throw new Error(
          "Supabase konnte nicht initialisiert werden. Pruefe die Konfiguration."
        );
      }

      const {
        data: { session: authSession },
      } = await supabase.auth.getSession();

      const accessToken = authSession?.access_token;

      if (!accessToken) {
        throw new Error("Keine aktive Session fuer den Session-Start gefunden.");
      }

      const response = await fetch("/api/sessions/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          appointmentLeadSource: options?.appointmentLeadSource,
          complaintChannel: options?.complaintChannel,
          forceNew: options?.forceNew ?? false,
          sessionType,
        }),
      });

      const responseBody = (await response.json()) as StartSessionResponse;

      if (!response.ok || !responseBody.sessionId) {
        if (responseBody.code === MONTHLY_SESSION_LIMIT_REACHED_CODE) {
          setMonthlySessionLimit(responseBody.limit ?? MONTHLY_SESSION_LIMIT);
          setRemainingSessions(responseBody.remainingSessions ?? 0);
          setUsedSessions(
            responseBody.usedSessions ?? responseBody.limit ?? MONTHLY_SESSION_LIMIT
          );
        }

        throw new Error(
          responseBody.error ?? "Die Session konnte nicht erstellt werden."
        );
      }

      router.push(`/chat/${responseBody.sessionId}`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setPendingSessionType(null);
    }
  };

  const isInteractionDisabled =
    pendingSessionType !== null || isCheckingResumableSession;
  const isMonthlyLimitReached = (remainingSessions ?? MONTHLY_SESSION_LIMIT) <= 0;

  const selectableSessionOptions: Record<
    SelectableSessionType,
    readonly (AppointmentLeadSource | ComplaintChannelOption)[]
  > = {
    appointment_setting: APPOINTMENT_LEAD_SOURCE_OPTIONS,
    complaint_management: COMPLAINT_CHANNEL_OPTIONS,
  };

  return (
    <div className="mt-8">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#0e51a0]">
          Trainingsstart
        </p>
        <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[#707070] sm:text-3xl">
          Wähle, wie du heute trainieren willst.
        </h2>
        <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
          Starte direkt in das Format, das zu deinem aktuellen Gesprächsziel passt.
        </p>
      </div>

      <div className="mt-6 rounded-[1.5rem] border border-white/80 bg-white/88 px-5 py-4 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-[#707070]">
            Genutzte Sessions in diesem Monat:{" "}
            <span className="text-[#0e51a0]">
              {usedSessions ?? 0} / {monthlySessionLimit}
            </span>
          </p>
          <p className="text-sm text-slate-500">
            Verbleibend: {remainingSessions ?? monthlySessionLimit}
          </p>
        </div>
        {isMonthlyLimitReached ? (
          <p className="mt-2 text-sm leading-7 text-red-700">
            Du hast dein monatliches Session-Limit erreicht. Bereits bestehende
            Sessions kannst du weiterhin öffnen.
          </p>
        ) : null}
      </div>

      {resumableCoreFlowSessionId ? (
        <div className="mt-6 rounded-[1.75rem] border border-[#0e51a0]/14 bg-[linear-gradient(180deg,rgba(14,81,160,0.05),rgba(255,255,255,0.96)_36%)] p-5 shadow-[0_18px_46px_rgba(15,23,42,0.08)] sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <span className="inline-flex rounded-full bg-[#0e51a0]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#0e51a0]">
                Offene Session
              </span>
              <h3 className="mt-4 text-lg font-semibold tracking-[-0.03em] text-[#707070]">
                Letztes Verkaufsgespräch weiterführen
              </h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Deine letzte aktive Beratungs-Session ist noch offen und kann direkt an
                der bestehenden Stelle fortgesetzt werden.
              </p>
            </div>

            <Link
              href={`/chat/${resumableCoreFlowSessionId}`}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#0e51a0] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(14,81,160,0.28)] transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0e51a0] focus-visible:ring-offset-2"
            >
              Letztes Verkaufsgespräch fortsetzen
            </Link>
          </div>
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        {([
          "full_sales",
          "appointment_setting",
          "complaint_management",
          "situation_coaching",
        ] as const).map((sessionType) => {
          const isPending = pendingSessionType === sessionType;
          const isPrimary = sessionType === "full_sales";
          const { buttonLabel, description, loadingLabel, title } =
            sessionConfig[sessionType];
          const isSelectableSession =
            sessionType === "appointment_setting" ||
            sessionType === "complaint_management";

          return (
            <article key={sessionType} className={getCardClasses(isPrimary)}>
              <div className="flex h-full flex-col justify-between">
                <div className="mb-6 min-h-[120px]">
                  <span className="inline-flex rounded-full bg-[#0e51a0]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#0e51a0]">
                    {getSessionBadge(sessionType)}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold tracking-[-0.03em] text-[#707070]">
                    {title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {description}
                  </p>
                </div>

                {isSelectableSession ? (
                  <div className="space-y-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {sessionType === "appointment_setting"
                        ? "Leadquelle"
                        : "Beschwerdekanal"}
                    </p>
                    <div
                      className={`grid gap-2 ${
                        sessionType === "appointment_setting"
                          ? "grid-cols-2"
                          : "grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-1"
                      }`}
                    >
                      {selectableSessionOptions[sessionType].map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() =>
                            void handleStartSession(sessionType, {
                              appointmentLeadSource:
                                sessionType === "appointment_setting"
                                  ? (option as AppointmentLeadSource)
                                  : undefined,
                              complaintChannel:
                                sessionType === "complaint_management"
                                  ? (option as ComplaintChannelOption)
                                  : undefined,
                              forceNew: false,
                            })
                          }
                          disabled={isInteractionDisabled || isMonthlyLimitReached}
                          className={`inline-flex min-h-11 items-center justify-center rounded-full border px-4 py-2.5 text-center text-sm font-semibold leading-tight transition ${
                            isPending
                              ? "border-[#0e51a0] bg-[#0e51a0] text-white shadow-[0_16px_36px_rgba(14,81,160,0.28)]"
                              : "border-slate-200 bg-white text-[#707070] hover:-translate-y-0.5 hover:border-[#0e51a0]/30 hover:text-[#0e51a0]"
                          } disabled:cursor-not-allowed disabled:opacity-60`}
                        >
                          {isPending ? loadingLabel : option}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      void handleStartSession(sessionType, {
                        forceNew: false,
                      })
                    }
                    disabled={isInteractionDisabled || isMonthlyLimitReached}
                    className={`inline-flex min-h-11 w-full max-w-[13rem] self-center items-center justify-center rounded-full px-5 py-2.5 text-center text-sm font-semibold leading-tight transition ${
                      isPrimary
                        ? "bg-[#0e51a0] text-white shadow-[0_16px_36px_rgba(14,81,160,0.28)]"
                        : "border border-slate-200 bg-white text-[#707070]"
                    } hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    {isPending ? loadingLabel : buttonLabel}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {error ? (
        <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
