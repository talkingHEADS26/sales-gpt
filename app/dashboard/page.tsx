"use client";

import { useEffect, useState } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import { useRouter } from "next/navigation";

import { InternalAppShell } from "@/components/internal-app-shell";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase";
import { StartSessionActions } from "./start-session-actions";

type Profile = {
  first_name: string | null;
  full_name: string | null;
};

type OrganizationMembership = {
  role_in_org: string;
  organizations: {
    organization_name: string | null;
    seat_limit: number | null;
  } | null;
};

type DashboardKpiSummary = {
  averages: {
    finalScore: number | null;
    module1Score: number | null;
    module2Score: number | null;
    module3Score: number | null;
  };
  closingRate: {
    completedSessions: number;
    sales: number;
    value: number;
  };
  appointmentRate: {
    appointments: number;
    completedCalls: number;
    value: number;
  };
  complaintManagement: {
    averages: {
      resolutionProbability: number | null;
    };
    happyCustomerRate: {
      completedComplaints: number;
      happyCustomers: number;
      value: number;
    };
    resolutionRate: {
      completedComplaints: number;
      resolvedSessions: number;
      value: number;
    };
  };
  coaching: {
    completedSessions: number;
    score: number;
  };
  changeFromLastConversation: number | null;
  counts: {
    finalScores: number;
    module1Scores: number;
    module2Scores: number;
    module3Scores: number;
  };
  trend: {
    delta: number | null;
    text: string;
    windowDays: number;
  };
  overallScore: number;
};

type DashboardKpiResponse = {
  error?: string;
  summary?: DashboardKpiSummary;
};

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
});

export default function DashboardPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [kpiSummary, setKpiSummary] = useState<DashboardKpiSummary | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    const loadDashboard = async () => {
      if (!hasSupabaseEnv) {
        if (isActive) {
          setError(
            "Supabase ist noch nicht vollständig konfiguriert. Prüfe deine Umgebungsvariablen."
          );
          setIsLoading(false);
        }
        return;
      }

      try {
        const supabase = getSupabaseBrowserClient();

        if (!supabase) {
          throw new Error(
            "Supabase konnte nicht initialisiert werden. Prüfe die Konfiguration."
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

        const {
          data: { session: authSession },
        } = await supabase.auth.getSession();

        const accessToken = authSession?.access_token;

        if (accessToken) {
          const accessResponse = await fetch("/api/auth/access-status", {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });
          const accessBody = (await accessResponse.json()) as { error?: string };

          if (accessResponse.status === 401) {
            router.replace("/login");
            return;
          }

          if (accessResponse.status === 403) {
            await supabase.auth.signOut();
            router.replace(
              `/login?error=${encodeURIComponent(
                accessBody.error ?? "Dein Zugang ist aktuell nicht aktiv."
              )}`
            );
            return;
          }
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("first_name, full_name")
          .eq("id", user.id)
          .maybeSingle<Profile>();

        if (profileError) {
          throw profileError;
        }

        const { data: membership, error: membershipError } = await supabase
          .from("organization_members")
          .select("role_in_org, organizations!inner(organization_name, seat_limit)")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle<OrganizationMembership>();

        if (membershipError) {
          throw membershipError;
        }

        let resolvedKpiSummary: DashboardKpiSummary | null = null;

        if (accessToken) {
          const kpiResponse = await fetch("/api/dashboard/kpis", {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });

          const kpiResponseBody = (await kpiResponse.json()) as DashboardKpiResponse;

          if (kpiResponse.ok) {
            resolvedKpiSummary = kpiResponseBody.summary ?? null;
          }
        }

        const resolvedDisplayName =
          profile?.first_name?.trim() ||
          profile?.full_name?.trim() ||
          null;

        if (isActive) {
          setUserId(user.id);
          setDisplayName(resolvedDisplayName);
          setOrganizationName(
            membership?.organizations?.organization_name?.trim() || null
          );
          setKpiSummary(resolvedKpiSummary);
          setError("");
          setIsLoading(false);
        }
      } catch (err) {
        if (isActive) {
          const message =
            err instanceof Error
              ? err.message
              : "Das Dashboard konnte nicht geladen werden.";

          setError(message);
          setIsLoading(false);
        }
      }
    };

    void loadDashboard();

    return () => {
      isActive = false;
    };
  }, [router]);

  const kpiCards = [
    {
      label: "Abschlussquote",
      value: `${kpiSummary?.closingRate.value ?? 0} %`,
      detail: `${kpiSummary?.closingRate.sales ?? 0} Sales aus ${
        kpiSummary?.closingRate.completedSessions ?? 0
      } Gesprächen`,
    },
    {
      label: "Terminquote",
      value: `${kpiSummary?.appointmentRate.value ?? 0} %`,
      detail: `${kpiSummary?.appointmentRate.appointments ?? 0} Termine aus ${
        kpiSummary?.appointmentRate.completedCalls ?? 0
      } Calls`,
    },
    {
      label: "Happy Customer Quote",
      value: `${kpiSummary?.complaintManagement.happyCustomerRate.value ?? 0} %`,
      detail: `${kpiSummary?.complaintManagement.happyCustomerRate.happyCustomers ?? 0} zufriedene Kunden aus ${
        kpiSummary?.complaintManagement.happyCustomerRate.completedComplaints ?? 0
      } Gesprächen`,
    },
    {
      label: "Situationscoachings",
      value: `${kpiSummary?.coaching.completedSessions ?? 0}`,
      detail: `${kpiSummary?.coaching.completedSessions ?? 0} durchgeführte Analysen`,
    },
    {
      label: "Overall Score",
      value: `${kpiSummary?.overallScore ?? 0} %`,
      detail: "Deine Gesamtperformance über alle Trainingsbereiche",
    },
  ];

  return (
    <InternalAppShell>
      <div className={plusJakartaSans.className}>
          <section className="flex flex-1 items-center py-10 sm:py-14 lg:py-18">
            <div className="w-full rounded-[2rem] border border-white/80 bg-white/82 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.14)] backdrop-blur sm:p-6 lg:p-8">
              <div className="rounded-[1.6rem] border border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f6f9fd_100%)] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] sm:p-8 lg:p-10">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                  <div className="max-w-3xl">
                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#0e51a0]">
                      talkingHEADS Sales Trainer Dashboard
                    </p>
                    <h1 className="mt-4 text-4xl font-semibold tracking-[-0.06em] text-[#707070] sm:text-5xl">
                      {displayName
                        ? `Willkommen zurück, ${displayName}`
                        : "Willkommen zurück"}
                    </h1>
                    {organizationName ? (
                      <p className="mt-3 text-sm font-medium tracking-[0.08em] text-slate-500 uppercase">
                        {organizationName}
                      </p>
                    ) : null}
                    <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
                      Starte direkt in dein nächstes Sales-Training und arbeite fokussiert an besseren Gesprächen, klarerer Wirkung und stärkeren Abschlüssen.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3 lg:max-w-xl">
                    {[
                      "Echte Gesprächssimulation",
                      "Direktes Feedback",
                      "Messbarer Sales-Fortschritt",
                    ].map((benefit) => (
                      <div
                        key={benefit}
                        className="rounded-2xl border border-white/80 bg-white/85 px-4 py-4 text-sm font-medium text-[#707070] shadow-[0_16px_40px_rgba(15,23,42,0.06)]"
                      >
                        <span className="mb-3 block h-2 w-12 rounded-full bg-[#0e51a0]" />
                        {benefit}
                      </div>
                    ))}
                  </div>
                </div>

                {isLoading ? (
                  <p className="mt-8 text-base leading-7 text-slate-600">
                    Dashboard wird geladen...
                  </p>
                ) : null}

                {!isLoading && error ? (
                  <p className="mt-8 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </p>
                ) : null}

                {!isLoading && !error ? <StartSessionActions userId={userId} /> : null}

                {!isLoading && !error ? (
                  <section className="mt-10 rounded-[1.75rem] border border-white/80 bg-white/88 p-5 shadow-[0_18px_46px_rgba(15,23,42,0.08)] sm:p-6">
                    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)] lg:items-end">
                      <div className="max-w-2xl">
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0e51a0]">
                          KPI Überblick
                        </p>
                        <h2 className="mt-3 max-w-xl text-2xl font-semibold tracking-[-0.04em] text-[#707070] sm:text-[2rem]">
                          Deine Performance über alle Trainingsbereiche hinweg.
                        </h2>
                      </div>
                      <p className="max-w-lg text-sm leading-7 text-slate-600 lg:justify-self-end lg:text-right">
                        Sobald du mehr Gespräche und Trainings absolvierst, entsteht hier deine Entwicklung.
                      </p>
                    </div>

                    <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                      {kpiCards.map((card) => (
                        <article
                          key={card.label}
                          className="flex min-h-[152px] flex-col justify-between rounded-2xl border border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-4 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)] sm:min-h-[164px] sm:px-5 sm:py-5"
                        >
                          <p className="max-w-[16ch] text-[11px] font-semibold uppercase tracking-[0.1em] leading-5 text-slate-500 sm:text-xs">
                            {card.label}
                          </p>
                          <p className="mt-5 text-[1.75rem] font-semibold leading-tight tracking-[-0.05em] text-[#707070] sm:text-[2rem]">
                            {card.value}
                          </p>
                          {card.detail ? (
                            <p className="mt-3 text-sm leading-6 text-slate-500">
                              {card.detail}
                            </p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </section>
                ) : null}
              </div>
            </div>
          </section>
      </div>
    </InternalAppShell>
  );
}
