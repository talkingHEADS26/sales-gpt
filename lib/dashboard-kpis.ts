import type { SupabaseServerClient } from "@/lib/supabase-server";

export type DashboardKpiSnapshot = {
  created_at: string;
  final_score: number | null;
  module_1_score: number | null;
  module_2_score: number | null;
  module_3_score: number | null;
  sale_result: "no_sale" | "sale" | null;
};

export type AppointmentSettingDashboardKpiSnapshot = {
  appointment_result: "appointment" | "no_appointment" | null;
};

export type ComplaintManagementDashboardKpiSnapshot = {
  complaint_result: "resolved" | "unresolved" | null;
  customer_happy: "no" | "yes" | null;
  resolution_probability: number | null;
};

type KpiTrend = {
  delta: number | null;
  text: string;
  windowDays: number;
};

export type DashboardKpiSummary = {
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
  trend: KpiTrend;
  overallScore: number;
};

export async function getDashboardKpiSummaryForUser(
  supabase: SupabaseServerClient,
  userId: string
) {
  const [
    snapshotResult,
    completedSessionsResult,
    appointmentSnapshotResult,
    completedAppointmentCallsResult,
    completedComplaintManagementSessionsResult,
    completedCoachingSessionsResult,
  ] = await Promise.all([
    supabase
      .from("full_sales_kpi_snapshots")
      .select(
        "created_at, module_1_score, module_2_score, module_3_score, final_score, sale_result"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("chat_sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("session_type", "full_sales")
      .eq("status", "completed"),
    supabase
      .from("appointment_setting_kpi_snapshots")
      .select("appointment_result")
      .eq("user_id", userId),
    supabase
      .from("chat_sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("session_type", "appointment_setting")
      .eq("status", "completed"),
    supabase
      .from("chat_sessions")
      .select("id")
      .eq("user_id", userId)
      .eq("session_type", "complaint_management")
      .eq("status", "completed"),
    supabase
      .from("chat_sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("session_type", "situation_coaching")
      .eq("status", "completed"),
  ]);

  const { data, error } = snapshotResult;
  const { data: appointmentSnapshotData, error: appointmentSnapshotError } =
    appointmentSnapshotResult;

  if (
    error ||
    completedSessionsResult.error ||
    appointmentSnapshotError ||
    completedAppointmentCallsResult.error ||
    completedComplaintManagementSessionsResult.error ||
    completedCoachingSessionsResult.error
  ) {
    const errorMessage =
      error?.message ??
      completedSessionsResult.error?.message ??
      appointmentSnapshotError?.message ??
      completedAppointmentCallsResult.error?.message ??
      completedComplaintManagementSessionsResult.error?.message ??
      completedCoachingSessionsResult.error?.message;

    throw new Error(errorMessage ?? "Die KPI-Daten konnten nicht geladen werden.");
  }

  const completedComplaintSessionIds = (
    completedComplaintManagementSessionsResult.data ?? []
  ).map((session) => session.id);

  let complaintManagementSnapshotData: ComplaintManagementDashboardKpiSnapshot[] = [];

  if (completedComplaintSessionIds.length > 0) {
    const {
      data: completedComplaintSnapshots,
      error: complaintManagementSnapshotError,
    } = await supabase
      .from("complaint_management_kpi_snapshots")
      .select("complaint_result, customer_happy, resolution_probability")
      .eq("user_id", userId)
      .in("session_id", completedComplaintSessionIds);

    if (complaintManagementSnapshotError) {
      throw new Error(complaintManagementSnapshotError.message);
    }

    complaintManagementSnapshotData =
      (completedComplaintSnapshots ?? []) as ComplaintManagementDashboardKpiSnapshot[];
  }

  return buildDashboardKpiSummary(
    (data ?? []) as DashboardKpiSnapshot[],
    completedSessionsResult.count ?? 0,
    (appointmentSnapshotData ?? []) as AppointmentSettingDashboardKpiSnapshot[],
    completedAppointmentCallsResult.count ?? 0,
    complaintManagementSnapshotData,
    completedComplaintSessionIds.length,
    completedCoachingSessionsResult.count ?? 0
  );
}

function average(values: Array<number | null>) {
  const numericValues = values.filter((value): value is number => value !== null);

  if (numericValues.length === 0) {
    return null;
  }

  const total = numericValues.reduce((sum, value) => sum + value, 0);

  return Number((total / numericValues.length).toFixed(1));
}

function roundDelta(delta: number) {
  return Number(delta.toFixed(1));
}

function roundPercent(value: number) {
  return Number(value.toFixed(1));
}

function buildTrend(snapshots: DashboardKpiSnapshot[]): KpiTrend {
  const windowDays = 14;
  const now = new Date();
  const currentPeriodStart = new Date(now);
  currentPeriodStart.setDate(currentPeriodStart.getDate() - windowDays);

  const previousPeriodStart = new Date(currentPeriodStart);
  previousPeriodStart.setDate(previousPeriodStart.getDate() - windowDays);

  const currentScores = snapshots
    .filter((snapshot) => {
      const createdAt = new Date(snapshot.created_at);

      return createdAt >= currentPeriodStart && createdAt <= now;
    })
    .map((snapshot) => snapshot.final_score);

  const previousScores = snapshots
    .filter((snapshot) => {
      const createdAt = new Date(snapshot.created_at);

      return createdAt >= previousPeriodStart && createdAt < currentPeriodStart;
    })
    .map((snapshot) => snapshot.final_score);

  const currentAverage = average(currentScores);
  const previousAverage = average(previousScores);

  if (currentAverage === null) {
    return {
      delta: null,
      text: "Sobald du erste vollständige Gespräche hast, erscheint hier deine Tendenz.",
      windowDays,
    };
  }

  if (previousAverage === null) {
    return {
      delta: null,
      text: `Für einen Trendvergleich über ${windowDays} Tage brauchen wir noch mehr Daten.`,
      windowDays,
    };
  }

  const delta = roundDelta(currentAverage - previousAverage);

  if (Math.abs(delta) < 0.5) {
    return {
      delta,
      text: `Deine Abschlussquote ist im Vergleich zu den ${windowDays} Tagen davor stabil geblieben.`,
      windowDays,
    };
  }

  if (delta > 0) {
    return {
      delta,
      text: `Du hast dich in den letzten ${windowDays} Tagen um ${delta} Prozentpunkte verbessert.`,
      windowDays,
    };
  }

  return {
    delta,
    text: `Deine Abschlussquote liegt aktuell ${Math.abs(
      delta
    )} Prozentpunkte unter dem vorherigen Zeitraum.`,
    windowDays,
  };
}

export function buildDashboardKpiSummary(
  snapshots: DashboardKpiSnapshot[],
  completedSessions: number,
  appointmentSettingSnapshots: AppointmentSettingDashboardKpiSnapshot[],
  completedAppointmentCalls: number,
  complaintManagementSnapshots: ComplaintManagementDashboardKpiSnapshot[],
  completedComplaintManagementSessions: number,
  completedCoachingSessions: number
): DashboardKpiSummary {
  const sortedSnapshots = [...snapshots].sort((left, right) =>
    right.created_at.localeCompare(left.created_at)
  );
  const sales = sortedSnapshots.filter(
    (snapshot) => snapshot.sale_result === "sale"
  ).length;
  const appointments = appointmentSettingSnapshots.filter(
    (snapshot) => snapshot.appointment_result === "appointment"
  ).length;
  const resolvedComplaints = complaintManagementSnapshots.filter(
    (snapshot) => snapshot.complaint_result === "resolved"
  ).length;
  const happyCustomers = complaintManagementSnapshots.filter(
    (snapshot) => snapshot.customer_happy === "yes"
  ).length;
  const latestFinalSnapshots = sortedSnapshots.filter(
    (snapshot) => snapshot.final_score !== null
  );
  const changeFromLastConversation =
    latestFinalSnapshots.length >= 2
      ? roundDelta(
          (latestFinalSnapshots[0].final_score ?? 0) -
            (latestFinalSnapshots[1].final_score ?? 0)
        )
      : null;
  const salesRate =
    completedSessions > 0 ? roundPercent((sales / completedSessions) * 100) : 0;
  const appointmentRate =
    completedAppointmentCalls > 0
      ? roundPercent((appointments / completedAppointmentCalls) * 100)
      : 0;
  const happyCustomerRate =
    completedComplaintManagementSessions > 0
      ? roundPercent((happyCustomers / completedComplaintManagementSessions) * 100)
      : 0;
  const coachingScore = Math.min(100, completedCoachingSessions * 5);
  const overallScore = roundPercent(
    salesRate * 0.4 +
      appointmentRate * 0.25 +
      happyCustomerRate * 0.25 +
      coachingScore * 0.1
  );

  return {
    averages: {
      finalScore: average(sortedSnapshots.map((snapshot) => snapshot.final_score)),
      module1Score: average(sortedSnapshots.map((snapshot) => snapshot.module_1_score)),
      module2Score: average(sortedSnapshots.map((snapshot) => snapshot.module_2_score)),
      module3Score: average(sortedSnapshots.map((snapshot) => snapshot.module_3_score)),
    },
    closingRate: {
      completedSessions,
      sales,
      value: salesRate,
    },
    appointmentRate: {
      appointments,
      completedCalls: completedAppointmentCalls,
      value: appointmentRate,
    },
    complaintManagement: {
      averages: {
        resolutionProbability: average(
          complaintManagementSnapshots.map(
            (snapshot) => snapshot.resolution_probability
          )
        ),
      },
      happyCustomerRate: {
        completedComplaints: completedComplaintManagementSessions,
        happyCustomers,
        value: happyCustomerRate,
      },
      resolutionRate: {
        completedComplaints: completedComplaintManagementSessions,
        resolvedSessions: resolvedComplaints,
        value:
          completedComplaintManagementSessions > 0
            ? roundPercent(
                (resolvedComplaints / completedComplaintManagementSessions) * 100
              )
            : 0,
      },
    },
    coaching: {
      completedSessions: completedCoachingSessions,
      score: coachingScore,
    },
    changeFromLastConversation,
    counts: {
      finalScores: sortedSnapshots.filter((snapshot) => snapshot.final_score !== null)
        .length,
      module1Scores: sortedSnapshots.filter((snapshot) => snapshot.module_1_score !== null)
        .length,
      module2Scores: sortedSnapshots.filter((snapshot) => snapshot.module_2_score !== null)
        .length,
      module3Scores: sortedSnapshots.filter((snapshot) => snapshot.module_3_score !== null)
        .length,
    },
    trend: buildTrend(sortedSnapshots),
    overallScore,
  };
}
