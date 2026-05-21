"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase";
import {
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
      ? "border-[#0b478b] bg-[#0E51A0]"
      : "border-[#0b478b] bg-[#0E51A0]"
  }`;
}

export function StartSessionActions({ userId }: StartSessionActionsProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [monthlySessionLimit, setMonthlySessionLimit] =
    useState(MONTHLY_SESSION_LIMIT);
  const [pendingSessionType, setPendingSessionType] =
    useState<SessionType | null>(null);
  const [isCheckingResumableSession, setIsCheckingResumableSession] =
    useState(true);
  const [remainingSessions, setRemainingSessions] = useState<number | null>(null);
  const [usedSessions, setUsedSessions] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadUsageSummary = async () => {
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
            setIsCheckingResumableSession(false);
          }
          return;
        }

        const usageSummaryResponse = await fetch("/api/usage/summary", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        const usageSummaryBody =
          (await usageSummaryResponse.json()) as UsageSummaryResponse;

        if (!usageSummaryResponse.ok) {
          throw new Error(
            usageSummaryBody.error ?? "Die Usage-Daten konnten nicht geladen werden."
          );
        }

        if (!isMounted) {
          return;
        }

        setMonthlySessionLimit(
          usageSummaryBody.monthlySessionLimit ?? MONTHLY_SESSION_LIMIT
        );
        setRemainingSessions(
          usageSummaryBody.remainingSessions ?? MONTHLY_SESSION_LIMIT
        );
        setUsedSessions(usageSummaryBody.usedSessions ?? 0);
      } catch (err) {
        if (isMounted) {
          setError((currentError) => currentError || getErrorMessage(err));
        }
      } finally {
        if (isMounted) {
          setIsCheckingResumableSession(false);
        }
      }
    };

    void loadUsageSummary();

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

  return (
    <div className="mt-8">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#0e51a0]">
          Trainingsstart
        </p>
        <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">
          Wähle, wie du heute trainieren willst.
        </h2>
        <p className="mt-3 text-sm leading-7 text-[#dce8fb] sm:text-base">
          Starte direkt in das Format, das zu deinem aktuellen Gesprächsziel passt.
        </p>
      </div>

      <div className="mt-6 rounded-[1.5rem] border border-white/20 bg-[#0b478b] px-5 py-4 shadow-[0_16px_40px_rgba(15,23,42,0.12)]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-white">
            Genutzte Sessions in diesem Monat:{" "}
            <span className="text-[#dce8fb]">
              {usedSessions ?? 0} / {monthlySessionLimit}
            </span>
          </p>
          <p className="text-sm text-[#dce8fb]">
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

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {([
          "full_sales",
          "situation_coaching",
        ] as const).map((sessionType) => {
          const isPending = pendingSessionType === sessionType;
          const isPrimary = sessionType === "full_sales";
          const { buttonLabel, description, loadingLabel, title } =
            sessionConfig[sessionType];

          return (
            <article key={sessionType} className={getCardClasses(isPrimary)}>
              <div className="flex h-full flex-col justify-between">
                <div className="mb-6 min-h-[120px]">
                  <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#dce8fb]">
                    {getSessionBadge(sessionType)}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold tracking-[-0.03em] text-white">
                    {title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-[#dce8fb]">
                    {description}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    void handleStartSession(sessionType, {
                      forceNew: false,
                    })
                  }
                  disabled={isInteractionDisabled || isMonthlyLimitReached}
                  className={`inline-flex min-h-11 w-full max-w-[13rem] self-center items-center justify-center rounded-full px-5 py-2.5 text-center text-sm font-semibold leading-tight transition ${
                    "bg-[linear-gradient(180deg,#f6ab2c_0%,#EA9413_52%,#db8302_100%)] text-white shadow-[0_10px_24px_rgba(234,148,19,0.35),inset_0_1px_0_rgba(255,255,255,0.35)]"
                  } hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {isPending ? loadingLabel : buttonLabel}
                </button>
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
