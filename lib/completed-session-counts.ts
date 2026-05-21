import { resolveSessionFlow, type StoredSessionType } from "@/lib/chat-session";
import type { SupabaseServerClient } from "@/lib/supabase-server";

type CompletedSessionRow = {
  organization_id: string | null;
  session_type: StoredSessionType;
  title: string | null;
  user_id: string;
};

type SessionFlowCount = {
  appointment_setting: number;
  complaint_management: number;
  free_chat: number;
  full_sales: number;
  situation_coaching: number;
};

export type CompletedSessionStats = {
  byFlow: SessionFlowCount;
  total: number;
};

function createEmptyStats(): CompletedSessionStats {
  return {
    byFlow: {
      appointment_setting: 0,
      complaint_management: 0,
      free_chat: 0,
      full_sales: 0,
      situation_coaching: 0,
    },
    total: 0,
  };
}

function getStatsKey(organizationId: string, userId: string) {
  return `${organizationId}:${userId}`;
}

export async function getCompletedSessionStatsByOrganizationUsers(
  serviceRoleClient: SupabaseServerClient,
  organizationIds: string[],
  userIds: string[]
) {
  const statsMap = new Map<string, CompletedSessionStats>();

  if (organizationIds.length === 0 || userIds.length === 0) {
    return statsMap;
  }

  const { data, error } = await serviceRoleClient
    .from("chat_sessions")
    .select("organization_id, user_id, session_type, title")
    .eq("status", "completed")
    .in("organization_id", organizationIds)
    .in("user_id", userIds);

  if (error) {
    throw new Error(error.message);
  }

  const completedSessions = (data ?? []) as CompletedSessionRow[];

  for (const session of completedSessions) {
    if (!session.organization_id) {
      continue;
    }

    const key = getStatsKey(session.organization_id, session.user_id);
    const currentStats = statsMap.get(key) ?? createEmptyStats();
    const flow = resolveSessionFlow(session.session_type, session.title);

    currentStats.byFlow[flow] += 1;
    currentStats.total += 1;
    statsMap.set(key, currentStats);
  }

  return statsMap;
}

export function getCompletedSessionStatsForMember(
  statsMap: Map<string, CompletedSessionStats>,
  organizationId: string,
  userId: string
) {
  return statsMap.get(getStatsKey(organizationId, userId)) ?? createEmptyStats();
}
