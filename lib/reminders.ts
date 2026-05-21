import type { SupabaseServerClient } from "@/lib/supabase-server";

export const TRAINING_REMINDER_INACTIVITY_DAYS = 4;
export const TRAINING_REMINDER_COOLDOWN_DAYS = 4;

type ReminderCandidateRow = {
  first_name: string | null;
  inactivity_triggered: boolean;
  last_known_activity_at: string | null;
  last_session_activity_at: string | null;
  last_user_message_at: string | null;
  open_full_sales_count: number | null;
  open_full_sales_triggered: boolean;
  profile_created_at: string;
  user_id: string;
};

type ReminderCooldownLogRow = {
  sent_at: string | null;
  user_id: string;
};

type ClaimReminderEmailRow = {
  claimed: boolean | null;
  cooldown_until: string | null;
  log_id: string | null;
  skip_reason: string | null;
};

export type TrainingReminderCandidate = {
  email: string | null;
  firstName: string | null;
  inactivityTriggered: boolean;
  lastKnownActivityAt: string | null;
  lastSessionActivityAt: string | null;
  lastUserMessageAt: string | null;
  latestReminderSentAt: string | null;
  openFullSalesCount: number;
  openFullSalesTriggered: boolean;
  profileCreatedAt: string;
  userId: string;
};

export type TrainingReminderClaimResult =
  | {
      claimed: true;
      logId: string;
    }
  | {
      claimed: false;
      cooldownUntil: string | null;
      logId: string | null;
      skipReason: string;
    };

function subtractDays(baseDate: Date, days: number) {
  const nextDate = new Date(baseDate);
  nextDate.setUTCDate(nextDate.getUTCDate() - days);
  return nextDate;
}

async function listAuthUserEmailsByIds(
  serviceRoleClient: SupabaseServerClient,
  userIds: string[]
) {
  const userIdSet = new Set(userIds);
  const emailMap = new Map<string, string | null>();
  let page = 1;
  const perPage = 200;

  if (userIdSet.size === 0) {
    return emailMap;
  }

  while (true) {
    const { data, error } = await serviceRoleClient.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw new Error(error.message);
    }

    for (const user of data.users) {
      if (userIdSet.has(user.id)) {
        emailMap.set(user.id, user.email?.trim() || null);
      }
    }

    if (data.users.length < perPage || emailMap.size === userIdSet.size) {
      break;
    }

    page += 1;
  }

  return emailMap;
}

async function getLatestReminderSentAtByUser(
  serviceRoleClient: SupabaseServerClient,
  userIds: string[]
) {
  const latestReminderMap = new Map<string, string | null>();

  if (userIds.length === 0) {
    return latestReminderMap;
  }

  const { data, error } = await serviceRoleClient
    .from("training_reminder_email_log")
    .select("user_id, sent_at")
    .in("user_id", userIds)
    .eq("delivery_status", "sent")
    .order("sent_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  for (const row of (data ?? []) as ReminderCooldownLogRow[]) {
    if (!latestReminderMap.has(row.user_id)) {
      latestReminderMap.set(row.user_id, row.sent_at ?? null);
    }
  }

  return latestReminderMap;
}

export function hasTrainingReminderTrigger(candidate: {
  inactivityTriggered: boolean;
  openFullSalesTriggered: boolean;
}) {
  return candidate.inactivityTriggered || candidate.openFullSalesTriggered;
}

export function isTrainingReminderInCooldown(
  lastSentAt: string | null,
  now = new Date(),
  cooldownDays = TRAINING_REMINDER_COOLDOWN_DAYS
) {
  if (!lastSentAt) {
    return false;
  }

  return new Date(lastSentAt) > subtractDays(now, cooldownDays);
}

export async function listTrainingReminderCandidates(
  serviceRoleClient: SupabaseServerClient
): Promise<TrainingReminderCandidate[]> {
  const { data, error } = await serviceRoleClient.rpc(
    "get_training_reminder_candidates",
    {
      p_inactivity_days: TRAINING_REMINDER_INACTIVITY_DAYS,
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as ReminderCandidateRow[];
  const userIds = rows.map((row) => row.user_id);
  const [emailMap, latestReminderMap] = await Promise.all([
    listAuthUserEmailsByIds(serviceRoleClient, userIds),
    getLatestReminderSentAtByUser(serviceRoleClient, userIds),
  ]);

  return rows.map((row) => ({
    email: emailMap.get(row.user_id) ?? null,
    firstName: row.first_name,
    inactivityTriggered: row.inactivity_triggered,
    lastKnownActivityAt: row.last_known_activity_at,
    lastSessionActivityAt: row.last_session_activity_at,
    lastUserMessageAt: row.last_user_message_at,
    latestReminderSentAt: latestReminderMap.get(row.user_id) ?? null,
    openFullSalesCount: row.open_full_sales_count ?? 0,
    openFullSalesTriggered: row.open_full_sales_triggered,
    profileCreatedAt: row.profile_created_at,
    userId: row.user_id,
  }));
}

export async function claimTrainingReminderEmail(
  serviceRoleClient: SupabaseServerClient,
  candidate: TrainingReminderCandidate
): Promise<TrainingReminderClaimResult> {
  const { data, error } = await serviceRoleClient.rpc(
    "claim_training_reminder_email",
    {
      p_user_id: candidate.userId,
      p_cooldown_days: TRAINING_REMINDER_COOLDOWN_DAYS,
      p_email: candidate.email,
      p_inactivity_triggered: candidate.inactivityTriggered,
      p_last_known_activity_at: candidate.lastKnownActivityAt,
      p_open_full_sales_triggered: candidate.openFullSalesTriggered,
      p_reason_snapshot: {
        inactivityTriggered: candidate.inactivityTriggered,
        lastKnownActivityAt: candidate.lastKnownActivityAt,
        lastSessionActivityAt: candidate.lastSessionActivityAt,
        lastUserMessageAt: candidate.lastUserMessageAt,
        openFullSalesCount: candidate.openFullSalesCount,
        openFullSalesTriggered: candidate.openFullSalesTriggered,
        profileCreatedAt: candidate.profileCreatedAt,
      },
      p_related_open_full_sales_count: candidate.openFullSalesCount,
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  const result = Array.isArray(data)
    ? ((data[0] ?? null) as ClaimReminderEmailRow | null)
    : ((data ?? null) as ClaimReminderEmailRow | null);

  if (result?.claimed && result.log_id) {
    return {
      claimed: true,
      logId: result.log_id,
    };
  }

  return {
    claimed: false,
    cooldownUntil: result?.cooldown_until ?? null,
    logId: result?.log_id ?? null,
    skipReason: result?.skip_reason ?? "unknown",
  };
}

export async function markTrainingReminderEmailSent(
  serviceRoleClient: SupabaseServerClient,
  params: {
    logId: string;
    resendMessageId?: string | null;
  }
) {
  const { error } = await serviceRoleClient
    .from("training_reminder_email_log")
    .update({
      delivery_status: "sent",
      error_message: null,
      resend_message_id: params.resendMessageId ?? null,
      sent_at: new Date().toISOString(),
    })
    .eq("id", params.logId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function markTrainingReminderEmailFailed(
  serviceRoleClient: SupabaseServerClient,
  params: {
    errorMessage: string;
    logId: string;
  }
) {
  const { error } = await serviceRoleClient
    .from("training_reminder_email_log")
    .update({
      delivery_status: "failed",
      error_message: params.errorMessage,
      resend_message_id: null,
      sent_at: null,
    })
    .eq("id", params.logId);

  if (error) {
    throw new Error(error.message);
  }
}
