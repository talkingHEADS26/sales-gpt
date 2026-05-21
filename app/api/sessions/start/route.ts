import { NextResponse } from "next/server";

import {
  selectAppointmentAvatar,
  type AppointmentAvatarSnapshot,
} from "@/lib/appointment-setting-avatar";
import { getWelcomeMessage } from "@/lib/chat-copy";
import {
  selectComplaintAvatar,
} from "@/lib/complaint-avatar";
import {
  FULL_CHAT_TITLE,
  isResumableFullChatSession,
} from "@/lib/chat-session";
import {
  selectFullSalesAvatar,
  type FullSalesAvatarHistoryEntry,
  type FullSalesAvatarSnapshot,
} from "@/lib/full-sales-avatar";
import {
  FRANCHISE_VERTICAL_LABELS,
  getOrganizationIndustrySettings,
  resolveIndustrySettings,
} from "@/lib/industries";
import { getIndustryPromptConfig } from "@/lib/prompts/industries";
import { isFailure as isPaidAppAuthFailure, requireAuthUser } from "@/lib/auth-server";
import type { SupabaseServerClient } from "@/lib/supabase-server";
import { getErrorMessage, logSystemEvent } from "@/lib/system-monitoring";
import {
  isAppointmentLeadSource,
  isComplaintChannelOption,
  resolveAutomaticDifficulty,
  type AppointmentLeadSource,
  type ComplaintChannelOption,
} from "@/lib/training-session-config";
import {
  MONTHLY_SESSION_LIMIT_REACHED_CODE,
  MONTHLY_SESSION_LIMIT,
} from "@/lib/usage-limits";

type RequestBody = {
  appointmentLeadSource?: AppointmentLeadSource;
  complaintChannel?: ComplaintChannelOption;
  forceNew?: boolean;
  sessionType?:
    | "appointment_setting"
    | "complaint_management"
    | "full_sales"
    | "situation_coaching"
    | "full_chat";
};

type OrganizationMembership = {
  organization_id: string;
  organizations: {
    franchise_vertical?: string | null;
    industry_key: string | null;
    industry_locked: boolean | null;
    prompt_profile_key: string | null;
  } | null;
};

type ChatSessionInsertResult = {
  id: string;
};

type CreateSessionWithLimitResult = {
  code: string | null;
  message: string | null;
  remaining_sessions: number;
  session_id: string | null;
  success: boolean;
  used_sessions: number;
};

type ChatSessionRecord = {
  id: string;
  title: string | null;
  session_type:
    | "appointment_setting"
    | "complaint_management"
    | "full_sales"
    | "situation_coaching";
  status: string;
};

async function logSessionStartEvent(params: {
  forceNotify?: boolean;
  message: string;
  metadata?: Record<string, unknown>;
  severity: "critical" | "error" | "warning";
}) {
  await logSystemEvent({
    forceNotify: params.forceNotify,
    message: params.message,
    metadata: params.metadata,
    severity: params.severity,
    source: "api_sessions_start",
  });
}

async function getLatestFullSalesAvatarSnapshot(params: {
  industryKey: string;
  organizationId: string | null;
  serviceRoleClient: SupabaseServerClient;
  userId: string;
}) {
  const { industryKey, organizationId, serviceRoleClient, userId } = params;

  const { data: latestUserAvatar, error: latestUserAvatarError } =
    await serviceRoleClient
      .from("full_sales_avatar_snapshots")
      .select(
        "id, session_id, previous_avatar_snapshot_id, user_id, organization_id, industry_key, avatar_name, avatar_gender, avatar_age, avatar_job_situation, avatar_family_situation, avatar_time_budget, avatar_financial_budget, avatar_disc_type, avatar_difficulty, avatar_objections, avatar_life_stage, avatar_profession_or_context, avatar_primary_problem, avatar_secondary_context, avatar_goal, avatar_emotional_tone, opening_message, created_at"
      )
      .eq("user_id", userId)
      .eq("industry_key", industryKey)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<{
        avatar_age: number;
        avatar_difficulty: FullSalesAvatarSnapshot["avatarDifficulty"] | null;
        avatar_emotional_tone: string;
        avatar_family_situation: FullSalesAvatarSnapshot["avatarFamilySituation"] | null;
        avatar_financial_budget: FullSalesAvatarSnapshot["avatarFinancialBudget"] | null;
        avatar_gender: "male" | "female";
        avatar_goal: string;
        avatar_job_situation: FullSalesAvatarSnapshot["avatarJobSituation"] | null;
        avatar_life_stage: string;
        avatar_name: string;
        avatar_objections: FullSalesAvatarSnapshot["avatarObjections"] | null;
        avatar_primary_problem: string;
        avatar_profession_or_context: string;
        avatar_secondary_context: string | null;
        avatar_disc_type: FullSalesAvatarSnapshot["avatarDiscType"] | null;
        avatar_time_budget: FullSalesAvatarSnapshot["avatarTimeBudget"] | null;
        created_at: string;
        id: string;
        industry_key: string;
        opening_message: string;
        organization_id: string | null;
        previous_avatar_snapshot_id: string | null;
        session_id: string;
        user_id: string;
      }>();

  if (latestUserAvatarError) {
    throw new Error(latestUserAvatarError.message);
  }

  if (latestUserAvatar) {
    return {
      avatarAge: latestUserAvatar.avatar_age,
      avatarDifficulty: latestUserAvatar.avatar_difficulty ?? "medium",
      avatarDiscType: latestUserAvatar.avatar_disc_type ?? "analytical",
      avatarEmotionalTone: latestUserAvatar.avatar_emotional_tone,
      avatarFamilySituation: latestUserAvatar.avatar_family_situation ?? "single",
      avatarFinancialBudget: latestUserAvatar.avatar_financial_budget ?? "medium",
      avatarGender: latestUserAvatar.avatar_gender,
      avatarGoal: latestUserAvatar.avatar_goal,
      avatarJobSituation: latestUserAvatar.avatar_job_situation ?? "employed_full_time",
      avatarLifeStage: latestUserAvatar.avatar_life_stage,
      avatarName: latestUserAvatar.avatar_name,
      avatarObjections: latestUserAvatar.avatar_objections ?? [],
      avatarPrimaryProblem: latestUserAvatar.avatar_primary_problem,
      avatarProfessionOrContext: latestUserAvatar.avatar_profession_or_context,
      avatarSecondaryContext: latestUserAvatar.avatar_secondary_context ?? "",
      avatarTimeBudget: latestUserAvatar.avatar_time_budget ?? "medium",
      createdAt: latestUserAvatar.created_at,
      id: latestUserAvatar.id,
      industryKey: latestUserAvatar.industry_key as FullSalesAvatarSnapshot["industryKey"],
      openingMessage: latestUserAvatar.opening_message,
      organizationId: latestUserAvatar.organization_id,
      previousAvatarSnapshotId: latestUserAvatar.previous_avatar_snapshot_id,
      sessionId: latestUserAvatar.session_id,
      userId: latestUserAvatar.user_id,
    } satisfies FullSalesAvatarSnapshot;
  }

  if (!organizationId) {
    return null;
  }

  const { data: latestOrganizationAvatar, error: latestOrganizationAvatarError } =
    await serviceRoleClient
      .from("full_sales_avatar_snapshots")
      .select(
        "id, session_id, previous_avatar_snapshot_id, user_id, organization_id, industry_key, avatar_name, avatar_gender, avatar_age, avatar_job_situation, avatar_family_situation, avatar_time_budget, avatar_financial_budget, avatar_disc_type, avatar_difficulty, avatar_objections, avatar_life_stage, avatar_profession_or_context, avatar_primary_problem, avatar_secondary_context, avatar_goal, avatar_emotional_tone, opening_message, created_at"
      )
      .eq("organization_id", organizationId)
      .eq("industry_key", industryKey)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<{
        avatar_age: number;
        avatar_difficulty: FullSalesAvatarSnapshot["avatarDifficulty"] | null;
        avatar_emotional_tone: string;
        avatar_family_situation: FullSalesAvatarSnapshot["avatarFamilySituation"] | null;
        avatar_financial_budget: FullSalesAvatarSnapshot["avatarFinancialBudget"] | null;
        avatar_gender: "male" | "female";
        avatar_goal: string;
        avatar_job_situation: FullSalesAvatarSnapshot["avatarJobSituation"] | null;
        avatar_life_stage: string;
        avatar_name: string;
        avatar_objections: FullSalesAvatarSnapshot["avatarObjections"] | null;
        avatar_primary_problem: string;
        avatar_profession_or_context: string;
        avatar_secondary_context: string | null;
        avatar_disc_type: FullSalesAvatarSnapshot["avatarDiscType"] | null;
        avatar_time_budget: FullSalesAvatarSnapshot["avatarTimeBudget"] | null;
        created_at: string;
        id: string;
        industry_key: string;
        opening_message: string;
        organization_id: string | null;
        previous_avatar_snapshot_id: string | null;
        session_id: string;
        user_id: string;
      }>();

  if (latestOrganizationAvatarError) {
    throw new Error(latestOrganizationAvatarError.message);
  }

  if (!latestOrganizationAvatar) {
    return null;
  }

  return {
    avatarAge: latestOrganizationAvatar.avatar_age,
    avatarDifficulty: latestOrganizationAvatar.avatar_difficulty ?? "medium",
    avatarDiscType: latestOrganizationAvatar.avatar_disc_type ?? "analytical",
    avatarEmotionalTone: latestOrganizationAvatar.avatar_emotional_tone,
    avatarFamilySituation: latestOrganizationAvatar.avatar_family_situation ?? "single",
    avatarFinancialBudget: latestOrganizationAvatar.avatar_financial_budget ?? "medium",
    avatarGender: latestOrganizationAvatar.avatar_gender,
    avatarGoal: latestOrganizationAvatar.avatar_goal,
    avatarJobSituation: latestOrganizationAvatar.avatar_job_situation ?? "employed_full_time",
    avatarLifeStage: latestOrganizationAvatar.avatar_life_stage,
    avatarName: latestOrganizationAvatar.avatar_name,
    avatarObjections: latestOrganizationAvatar.avatar_objections ?? [],
    avatarPrimaryProblem: latestOrganizationAvatar.avatar_primary_problem,
    avatarProfessionOrContext: latestOrganizationAvatar.avatar_profession_or_context,
    avatarSecondaryContext: latestOrganizationAvatar.avatar_secondary_context ?? "",
    avatarTimeBudget: latestOrganizationAvatar.avatar_time_budget ?? "medium",
    createdAt: latestOrganizationAvatar.created_at,
    id: latestOrganizationAvatar.id,
    industryKey: latestOrganizationAvatar.industry_key as FullSalesAvatarSnapshot["industryKey"],
    openingMessage: latestOrganizationAvatar.opening_message,
    organizationId: latestOrganizationAvatar.organization_id,
    previousAvatarSnapshotId: latestOrganizationAvatar.previous_avatar_snapshot_id,
    sessionId: latestOrganizationAvatar.session_id,
    userId: latestOrganizationAvatar.user_id,
  } satisfies FullSalesAvatarSnapshot;
}

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
  const {
    avatarAge,
    avatarDifficulty,
    franchiseVertical,
    industryKey,
    avatarName,
    avatarPrimaryProblem,
    avatarProfessionOrContext,
  } = params;
  const primaryProblemLabel = (() => {
    if (industryKey === "energy") {
      return "Konkretes Interesse";
    }
    if (industryKey === "franchise") {
      return "Interessebild";
    }
    return "Beschwerdebild";
  })();
  const briefingLines = [
    "Kunden-Briefing",
    "",
    `Name: ${toBriefingValue(avatarName)}`,
    `Alter: ${toBriefingValue(avatarAge)}`,
    `Beruf: ${toBriefingValue(avatarProfessionOrContext)}`,
  ];

  if (industryKey === "franchise") {
    const normalizedFranchiseVertical =
      typeof franchiseVertical === "string" ? franchiseVertical.trim() : "";
    const franchiseVerticalLabel =
      FRANCHISE_VERTICAL_LABELS[
        (normalizedFranchiseVertical in FRANCHISE_VERTICAL_LABELS
          ? normalizedFranchiseVertical
          : "other") as keyof typeof FRANCHISE_VERTICAL_LABELS
      ];
    briefingLines.push(`Franchise-Segment: ${franchiseVerticalLabel}`);
  }

  briefingLines.push(
    `${primaryProblemLabel}: ${toBriefingValue(avatarPrimaryProblem)}`,
    `Schwierigkeitslevel: ${toBriefingValue(avatarDifficulty)}`,
    "",
    "Starte jetzt das Beratungsgespräch. Du eröffnest das Gespräch mit deiner ersten Nachricht."
  );

  return briefingLines.join("\n");
}

export async function POST(request: Request) {
  try {
    const {
      appointmentLeadSource,
      complaintChannel,
      forceNew = false,
      sessionType,
    } = (await request.json()) as RequestBody;

    if (
      !sessionType ||
      ![
        "appointment_setting",
        "complaint_management",
        "full_sales",
        "situation_coaching",
        "full_chat",
      ].includes(sessionType)
    ) {
      return NextResponse.json(
        { error: "sessionType ist ungueltig." },
        { status: 400 }
      );
    }

    if (
      sessionType === "appointment_setting" &&
      !isAppointmentLeadSource(appointmentLeadSource)
    ) {
      return NextResponse.json(
        { error: "appointmentLeadSource ist ungueltig." },
        { status: 400 }
      );
    }

    if (
      sessionType === "complaint_management" &&
      !isComplaintChannelOption(complaintChannel)
    ) {
      return NextResponse.json(
        { error: "complaintChannel ist ungueltig." },
        { status: 400 }
      );
    }

    const authResult = await requireAuthUser(
      request.headers.get("authorization")
    );

    if (isPaidAppAuthFailure(authResult)) {
      return NextResponse.json(
        { code: authResult.code, error: authResult.error },
        { status: authResult.status }
      );
    }

    const { serviceRoleClient, supabase, userId } = authResult;

    const { error: profileEnsureError } = await serviceRoleClient
      .from("profiles")
      .upsert(
        {
          id: userId,
          role: "user",
        },
        { onConflict: "id" }
      );

    if (profileEnsureError) {
      await logSessionStartEvent({
        message: "Profile upsert failed during session start",
        metadata: {
          error: profileEnsureError.message,
          userId,
        },
        severity: "error",
      });

      return NextResponse.json(
        { error: profileEnsureError.message },
        { status: 500 }
      );
    }

    const membershipWithFranchise = await supabase
      .from("organization_members")
      .select(
        "organization_id, organizations(industry_key, prompt_profile_key, industry_locked, franchise_vertical)"
      )
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle<OrganizationMembership>();
    const membershipWithoutFranchise =
      membershipWithFranchise.error?.message?.includes("franchise_vertical")
        ? await supabase
            .from("organization_members")
            .select(
              "organization_id, organizations(industry_key, prompt_profile_key, industry_locked)"
            )
            .eq("user_id", userId)
            .limit(1)
            .maybeSingle<OrganizationMembership>()
        : null;
    const { data: membership, error: membershipError } =
      membershipWithoutFranchise ?? membershipWithFranchise;

    if (membershipError) {
      await logSessionStartEvent({
        message: "Membership lookup failed during session start",
        metadata: {
          error: membershipError.message,
          userId,
        },
        severity: "error",
      });

      return NextResponse.json(
        { error: membershipError.message },
        { status: 500 }
      );
    }

    const industrySettings = membership?.organizations
      ? resolveIndustrySettings(membership.organizations)
      : await getOrganizationIndustrySettings(
          serviceRoleClient,
          membership?.organization_id ?? null
        );

    if (sessionType === "full_chat" && !forceNew) {
      const { data: existingFullChatSession, error: existingFullChatSessionError } =
        await supabase
          .from("chat_sessions")
          .select("id, session_type, status, title")
          .eq("user_id", userId)
          .eq("session_type", "situation_coaching")
          .eq("title", FULL_CHAT_TITLE)
          .eq("status", "active")
          .order("updated_at", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle<ChatSessionRecord>();

      if (existingFullChatSessionError) {
        return NextResponse.json(
          { error: existingFullChatSessionError.message },
          { status: 500 }
        );
      }

      if (
        existingFullChatSession &&
        isResumableFullChatSession(existingFullChatSession)
      ) {
        return NextResponse.json({
          resumedExisting: true,
          sessionId: existingFullChatSession.id,
        });
      }
    }

    const automaticDifficulty =
      sessionType === "appointment_setting" ||
      sessionType === "complaint_management" ||
      sessionType === "full_sales"
        ? resolveAutomaticDifficulty()
        : null;

    const { data: createdSessionResult, error: createSessionError } =
      await serviceRoleClient.rpc("create_chat_session_with_monthly_limit", {
        p_appointment_lead_source:
          sessionType === "appointment_setting" ? appointmentLeadSource ?? null : null,
        p_complaint_channel:
          sessionType === "complaint_management" ? complaintChannel ?? null : null,
        p_organization_id: membership?.organization_id ?? null,
        p_session_difficulty: automaticDifficulty,
        p_session_type:
          sessionType === "full_chat" ? "situation_coaching" : sessionType,
        p_status: "draft",
        p_title: sessionType === "full_chat" ? FULL_CHAT_TITLE : null,
        p_user_id: userId,
      });

    if (createSessionError) {
      await logSessionStartEvent({
        forceNotify: true,
        message: "Session creation RPC failed",
        metadata: {
          error: createSessionError.message,
          sessionType,
          userId,
        },
        severity: "error",
      });

      return NextResponse.json(
        { error: createSessionError.message },
        { status: 500 }
      );
    }

    const createdSession = Array.isArray(createdSessionResult)
      ? ((createdSessionResult[0] ?? null) as CreateSessionWithLimitResult | null)
      : ((createdSessionResult ?? null) as CreateSessionWithLimitResult | null);

    if (!createdSession?.success || !createdSession.session_id) {
      const isMonthlyLimitReached =
        createdSession?.code === MONTHLY_SESSION_LIMIT_REACHED_CODE;

      return NextResponse.json(
        {
          code: createdSession?.code ?? null,
          error:
            createdSession?.message ??
            "Die Session konnte nicht erstellt werden.",
          limit: MONTHLY_SESSION_LIMIT,
          remainingSessions: createdSession?.remaining_sessions ?? 0,
          success: false,
          usedSessions: createdSession?.used_sessions ?? MONTHLY_SESSION_LIMIT,
        },
        { status: isMonthlyLimitReached ? 429 : 500 }
      );
    }

    const session = {
      id: createdSession.session_id,
    } satisfies ChatSessionInsertResult;

    const archiveSessionError =
      sessionType === "full_sales"
        ? (
            await serviceRoleClient
              .from("chat_sessions")
              .update({ status: "archived" })
              .eq("user_id", userId)
              .eq("session_type", "full_sales")
              .eq("status", "active")
          ).error
        : sessionType === "appointment_setting"
          ? (
              await serviceRoleClient
                .from("chat_sessions")
                .update({ status: "archived" })
                .eq("user_id", userId)
                .eq("session_type", "appointment_setting")
                .eq("status", "active")
            ).error
          : sessionType === "complaint_management"
            ? (
                await serviceRoleClient
                  .from("chat_sessions")
                  .update({ status: "archived" })
                  .eq("user_id", userId)
                  .eq("session_type", "complaint_management")
                  .eq("status", "active")
              ).error
            : sessionType === "full_chat"
              ? (
                  await serviceRoleClient
                    .from("chat_sessions")
                    .update({ status: "archived" })
                    .eq("user_id", userId)
                    .eq("session_type", "situation_coaching")
                    .eq("title", FULL_CHAT_TITLE)
                    .eq("status", "active")
                ).error
              : null;

    if (archiveSessionError) {
      await logSessionStartEvent({
        message: "Archiving previous active sessions failed",
        metadata: {
          error: archiveSessionError.message,
          newSessionId: session.id,
          sessionType,
          userId,
        },
        severity: "error",
      });

      await serviceRoleClient.from("chat_sessions").delete().eq("id", session.id);

      return NextResponse.json(
        { error: archiveSessionError.message },
        { status: 500 }
      );
    }

    if (sessionType === "full_sales") {
      const previousAvatar = await getLatestFullSalesAvatarSnapshot({
        industryKey: industrySettings.industryKey,
        organizationId: membership?.organization_id ?? null,
        serviceRoleClient,
        userId,
      });

      const { data: avatarHistoryRows } = await serviceRoleClient
        .from("full_sales_avatar_snapshots")
        .select("avatar_name, avatar_gender, avatar_age, avatar_profession_or_context")
        .eq("user_id", userId)
        .eq("industry_key", industrySettings.industryKey)
        .order("created_at", { ascending: false })
        .limit(10);

      const sessionHistory: FullSalesAvatarHistoryEntry[] = (avatarHistoryRows ?? []).map(
        (row) => ({
          avatarAge: row.avatar_age,
          avatarGender: row.avatar_gender as "male" | "female",
          avatarName: row.avatar_name,
          avatarProfessionOrContext: row.avatar_profession_or_context,
        })
      );

      const industryPromptConfig = getIndustryPromptConfig(industrySettings.industryKey);
      const selection = selectFullSalesAvatar({
        candidates: industryPromptConfig.openings.fullSales,
        difficulty: automaticDifficulty ?? "medium",
        franchiseVertical: industrySettings.franchiseVertical,
        industryKey: industrySettings.industryKey,
        previousAvatar,
        sessionHistory,
      });
      const briefingMessage = formatFullSalesBriefing({
        avatarAge: selection.avatar.avatarAge,
        avatarDifficulty: selection.avatar.avatarDifficulty,
        franchiseVertical: industrySettings.franchiseVertical,
        industryKey: industrySettings.industryKey,
        avatarName: selection.avatar.avatarName,
        avatarPrimaryProblem: selection.avatar.avatarPrimaryProblem,
        avatarProfessionOrContext: selection.avatar.avatarProfessionOrContext,
      });

      const [
        { error: initialMessageError },
        { error: avatarSnapshotError },
      ] = await Promise.all([
        serviceRoleClient.from("chat_messages").insert({
          session_id: session.id,
          sender_type: "system",
          content: briefingMessage,
        }),
        serviceRoleClient.from("full_sales_avatar_snapshots").insert({
          session_id: session.id,
          previous_avatar_snapshot_id: previousAvatar?.id ?? null,
          user_id: userId,
          organization_id: membership?.organization_id ?? null,
          industry_key: industrySettings.industryKey,
          avatar_name: selection.avatar.avatarName,
          avatar_gender: selection.avatar.avatarGender,
          avatar_age: selection.avatar.avatarAge,
          avatar_job_situation: selection.avatar.avatarJobSituation,
          avatar_family_situation: selection.avatar.avatarFamilySituation,
          avatar_time_budget: selection.avatar.avatarTimeBudget,
          avatar_financial_budget: selection.avatar.avatarFinancialBudget,
          avatar_disc_type: selection.avatar.avatarDiscType,
          avatar_difficulty: selection.avatar.avatarDifficulty,
          avatar_objections: selection.avatar.avatarObjections,
          avatar_life_stage: selection.avatar.avatarLifeStage,
          avatar_profession_or_context: selection.avatar.avatarProfessionOrContext,
          avatar_primary_problem: selection.avatar.avatarPrimaryProblem,
          avatar_secondary_context: selection.avatar.avatarSecondaryContext,
          avatar_goal: selection.avatar.avatarGoal,
          avatar_emotional_tone: selection.avatar.avatarEmotionalTone,
          opening_message: selection.avatar.openingMessage,
        }),
      ]);

      if (initialMessageError || avatarSnapshotError) {
        await serviceRoleClient.from("chat_sessions").delete().eq("id", session.id);

        return NextResponse.json(
          {
            error:
              initialMessageError?.message ??
              avatarSnapshotError?.message ??
              "Die full_sales-Session konnte nicht initialisiert werden.",
          },
          { status: 500 }
        );
      }
    }

    if (sessionType === "appointment_setting") {
      const leadSource = appointmentLeadSource;

      if (!leadSource) {
        await serviceRoleClient.from("chat_sessions").delete().eq("id", session.id);

        return NextResponse.json(
          { error: "appointmentLeadSource fehlt." },
          { status: 400 }
        );
      }

      const appointmentAvatarSelectClause =
        "id, session_id, previous_avatar_snapshot_id, user_id, organization_id, industry_key, avatar_name, avatar_gender, avatar_age, avatar_job_situation, avatar_family_situation, avatar_time_budget, avatar_financial_budget, avatar_disc_type, avatar_difficulty, avatar_objections, lead_source, lead_context, lead_goal, lead_tone, opening_message, created_at";
      const { data: latestUserAppointmentAvatar, error: latestUserAppointmentAvatarError } =
        await serviceRoleClient
          .from("appointment_setting_avatar_snapshots")
          .select(appointmentAvatarSelectClause)
          .eq("user_id", userId)
          .eq("industry_key", industrySettings.industryKey)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

      if (latestUserAppointmentAvatarError) {
        await serviceRoleClient.from("chat_sessions").delete().eq("id", session.id);

        return NextResponse.json(
          { error: latestUserAppointmentAvatarError.message },
          { status: 500 }
        );
      }

      let previousAvatar = latestUserAppointmentAvatar;

      if (!previousAvatar && membership?.organization_id) {
        const {
          data: latestOrganizationAppointmentAvatar,
          error: latestOrganizationAppointmentAvatarError,
        } = await serviceRoleClient
          .from("appointment_setting_avatar_snapshots")
          .select(appointmentAvatarSelectClause)
          .eq("organization_id", membership.organization_id)
          .eq("industry_key", industrySettings.industryKey)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestOrganizationAppointmentAvatarError) {
          await serviceRoleClient.from("chat_sessions").delete().eq("id", session.id);

          return NextResponse.json(
            { error: latestOrganizationAppointmentAvatarError.message },
            { status: 500 }
          );
        }

        previousAvatar = latestOrganizationAppointmentAvatar;
      }

      const selection = selectAppointmentAvatar({
        difficulty: automaticDifficulty ?? "medium",
        franchiseVertical: industrySettings.franchiseVertical,
        industryKey: industrySettings.industryKey,
        leadSource,
        previousAvatar: previousAvatar
          ? ({
              avatarAge: previousAvatar.avatar_age,
              avatarDifficulty: previousAvatar.avatar_difficulty ?? "medium",
              avatarDiscType: previousAvatar.avatar_disc_type ?? "analytical",
              avatarFamilySituation:
                previousAvatar.avatar_family_situation ?? "single",
              avatarFinancialBudget:
                previousAvatar.avatar_financial_budget ?? "medium",
              avatarGender: previousAvatar.avatar_gender,
              avatarJobSituation:
                previousAvatar.avatar_job_situation ?? "employed_full_time",
              avatarObjections: previousAvatar.avatar_objections ?? [],
              avatarTimeBudget: previousAvatar.avatar_time_budget ?? "medium",
              createdAt: previousAvatar.created_at,
              id: previousAvatar.id,
              leadContext: previousAvatar.lead_context,
              leadGoal: previousAvatar.lead_goal,
              leadName: previousAvatar.avatar_name,
              leadSource: previousAvatar.lead_source,
              leadTone: previousAvatar.lead_tone,
              openingMessage: previousAvatar.opening_message,
              organizationId: previousAvatar.organization_id,
              previousAvatarSnapshotId: previousAvatar.previous_avatar_snapshot_id,
              sessionId: previousAvatar.session_id,
              userId: previousAvatar.user_id,
            } satisfies AppointmentAvatarSnapshot)
          : null,
      });
      const initialMessage = selection.avatar.openingMessage;

      const [
        { error: initialMessageError },
        { error: avatarSnapshotError },
      ] = await Promise.all([
        serviceRoleClient.from("chat_messages").insert({
          session_id: session.id,
          sender_type: "assistant",
          content: initialMessage,
        }),
        serviceRoleClient.from("appointment_setting_avatar_snapshots").insert({
          session_id: session.id,
          previous_avatar_snapshot_id: previousAvatar?.id ?? null,
          user_id: userId,
          organization_id: membership?.organization_id ?? null,
          industry_key: industrySettings.industryKey,
          avatar_name: selection.avatar.leadName,
          avatar_gender: selection.avatar.avatarGender,
          avatar_age: selection.avatar.avatarAge,
          avatar_job_situation: selection.avatar.avatarJobSituation,
          avatar_family_situation: selection.avatar.avatarFamilySituation,
          avatar_time_budget: selection.avatar.avatarTimeBudget,
          avatar_financial_budget: selection.avatar.avatarFinancialBudget,
          avatar_disc_type: selection.avatar.avatarDiscType,
          avatar_difficulty: selection.avatar.avatarDifficulty,
          avatar_objections: selection.avatar.avatarObjections,
          lead_source: selection.avatar.leadSource,
          lead_context: selection.avatar.leadContext,
          lead_goal: selection.avatar.leadGoal,
          lead_tone: selection.avatar.leadTone,
          opening_message: selection.avatar.openingMessage,
        }),
      ]);

      if (initialMessageError || avatarSnapshotError) {
        await serviceRoleClient.from("chat_sessions").delete().eq("id", session.id);

        return NextResponse.json(
          {
            error:
              initialMessageError?.message ??
              avatarSnapshotError?.message ??
              "Die appointment_setting-Session konnte nicht initialisiert werden.",
          },
          { status: 500 }
        );
      }
    }

    if (sessionType === "complaint_management") {
      const selectedComplaintChannel = complaintChannel;

      if (!selectedComplaintChannel) {
        await serviceRoleClient.from("chat_sessions").delete().eq("id", session.id);

        return NextResponse.json(
          { error: "complaintChannel fehlt." },
          { status: 400 }
        );
      }

      const complaintSelectClause =
        "id, session_id, previous_avatar_snapshot_id, user_id, organization_id, industry_key, avatar_name, avatar_gender, avatar_age, avatar_job_situation, avatar_family_situation, avatar_time_budget, avatar_financial_budget, avatar_disc_type, avatar_difficulty, avatar_objections, avatar_channel, avatar_membership_context, avatar_life_context, avatar_complaint_topic, avatar_complaint_context, avatar_complaint_goal, avatar_complaint_type, avatar_complaint_history, avatar_inner_amplifiers, avatar_emotional_tone, opening_message, created_at";
      const {
        data: latestUserComplaintAvatarSnapshot,
        error: latestComplaintAvatarError,
      } = await serviceRoleClient
        .from("complaint_management_avatar_snapshots")
        .select(complaintSelectClause)
        .eq("user_id", userId)
        .eq("industry_key", industrySettings.industryKey)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestComplaintAvatarError) {
        await serviceRoleClient.from("chat_sessions").delete().eq("id", session.id);

        return NextResponse.json(
          { error: latestComplaintAvatarError.message },
          { status: 500 }
        );
      }

      let previousAvatar = latestUserComplaintAvatarSnapshot;

      if (!previousAvatar && membership?.organization_id) {
        const {
          data: latestOrganizationComplaintAvatarSnapshot,
          error: latestOrganizationComplaintAvatarError,
        } = await serviceRoleClient
          .from("complaint_management_avatar_snapshots")
          .select(complaintSelectClause)
          .eq("organization_id", membership.organization_id)
          .eq("industry_key", industrySettings.industryKey)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestOrganizationComplaintAvatarError) {
          await serviceRoleClient.from("chat_sessions").delete().eq("id", session.id);

          return NextResponse.json(
            { error: latestOrganizationComplaintAvatarError.message },
            { status: 500 }
          );
        }

        previousAvatar = latestOrganizationComplaintAvatarSnapshot;
      }

      const selection = selectComplaintAvatar({
        channel: selectedComplaintChannel,
        difficulty: automaticDifficulty ?? "easy",
        franchiseVertical: industrySettings.franchiseVertical,
        industryKey: industrySettings.industryKey,
        previousAvatar: previousAvatar
          ? {
              avatarAge: previousAvatar.avatar_age,
              avatarDifficulty: previousAvatar.avatar_difficulty ?? "medium",
              avatarChannel: previousAvatar.avatar_channel,
              avatarComplaintContext: previousAvatar.avatar_complaint_context,
              avatarComplaintGoal: previousAvatar.avatar_complaint_goal,
              avatarComplaintHistory: previousAvatar.avatar_complaint_history,
              avatarComplaintTopic: previousAvatar.avatar_complaint_topic,
              avatarComplaintType: previousAvatar.avatar_complaint_type,
              avatarDiscType: previousAvatar.avatar_disc_type ?? "analytical",
              avatarEmotionalTone: previousAvatar.avatar_emotional_tone,
              avatarFamilySituation:
                previousAvatar.avatar_family_situation ?? "single",
              avatarFinancialBudget:
                previousAvatar.avatar_financial_budget ?? "medium",
              avatarGender: previousAvatar.avatar_gender,
              avatarInnerAmplifiers: previousAvatar.avatar_inner_amplifiers ?? [],
              avatarJobSituation:
                previousAvatar.avatar_job_situation ?? "employed_full_time",
              avatarLifeContext: previousAvatar.avatar_life_context,
              avatarMembershipContext: previousAvatar.avatar_membership_context,
              avatarName: previousAvatar.avatar_name,
              avatarObjections: previousAvatar.avatar_objections ?? [],
              avatarTimeBudget: previousAvatar.avatar_time_budget ?? "medium",
              createdAt: previousAvatar.created_at,
              id: previousAvatar.id,
              industryKey: previousAvatar.industry_key,
              openingMessage: previousAvatar.opening_message,
              organizationId: previousAvatar.organization_id,
              previousAvatarSnapshotId: previousAvatar.previous_avatar_snapshot_id,
              sessionId: previousAvatar.session_id,
              userId: previousAvatar.user_id,
            }
          : null,
      });

      const [
        { error: initialMessageError },
        { error: avatarSnapshotError },
      ] = await Promise.all([
        serviceRoleClient.from("chat_messages").insert({
          session_id: session.id,
          sender_type: "assistant",
          content: selection.avatar.openingMessage,
        }),
        serviceRoleClient.from("complaint_management_avatar_snapshots").insert({
          session_id: session.id,
          previous_avatar_snapshot_id: previousAvatar?.id ?? null,
          user_id: userId,
          organization_id: membership?.organization_id ?? null,
          industry_key: industrySettings.industryKey,
          avatar_name: selection.avatar.avatarName,
          avatar_gender: selection.avatar.avatarGender,
          avatar_age: selection.avatar.avatarAge,
          avatar_job_situation: selection.avatar.avatarJobSituation,
          avatar_family_situation: selection.avatar.avatarFamilySituation,
          avatar_time_budget: selection.avatar.avatarTimeBudget,
          avatar_financial_budget: selection.avatar.avatarFinancialBudget,
          avatar_disc_type: selection.avatar.avatarDiscType,
          avatar_difficulty: selection.avatar.avatarDifficulty,
          avatar_objections: selection.avatar.avatarObjections,
          avatar_channel: selection.avatar.avatarChannel,
          avatar_membership_context: selection.avatar.avatarMembershipContext,
          avatar_life_context: selection.avatar.avatarLifeContext,
          avatar_complaint_topic: selection.avatar.avatarComplaintTopic,
          avatar_complaint_context: selection.avatar.avatarComplaintContext,
          avatar_complaint_goal: selection.avatar.avatarComplaintGoal,
          avatar_complaint_type: selection.avatar.avatarComplaintType,
          avatar_persona_type: selection.avatar.avatarDiscType,
          avatar_complaint_history: selection.avatar.avatarComplaintHistory,
          avatar_inner_amplifiers: selection.avatar.avatarInnerAmplifiers,
          avatar_emotional_tone: selection.avatar.avatarEmotionalTone,
          avatar_complaint_intensity:
            selection.avatar.avatarDifficulty === "easy"
              ? "easy"
              : selection.avatar.avatarDifficulty === "medium"
                ? "realistisch"
                : "hart",
          opening_message: selection.avatar.openingMessage,
        }),
      ]);

      if (initialMessageError || avatarSnapshotError) {
        await serviceRoleClient.from("chat_sessions").delete().eq("id", session.id);

        return NextResponse.json(
          {
            error:
              initialMessageError?.message ??
              avatarSnapshotError?.message ??
              "Die complaint_management-Session konnte nicht initialisiert werden.",
          },
          { status: 500 }
        );
      }
    }

    if (sessionType === "situation_coaching" || sessionType === "full_chat") {
      const initialMessage = getWelcomeMessage({
        industryKey: industrySettings.industryKey,
        sessionTitle: sessionType === "full_chat" ? FULL_CHAT_TITLE : null,
        sessionType: "situation_coaching",
      });

      const { error: initialMessageError } = await serviceRoleClient
        .from("chat_messages")
        .insert({
          session_id: session.id,
          sender_type: "assistant",
          content: initialMessage,
        });

      if (initialMessageError) {
        await serviceRoleClient.from("chat_sessions").delete().eq("id", session.id);

        return NextResponse.json(
          { error: initialMessageError.message },
          { status: 500 }
        );
      }
    }

    const { error: activateSessionError } = await serviceRoleClient
      .from("chat_sessions")
      .update({ status: "active" })
      .eq("id", session.id)
      .eq("status", "draft");

    if (activateSessionError) {
      await logSessionStartEvent({
        message: "Session activation failed",
        metadata: {
          error: activateSessionError.message,
          sessionId: session.id,
          sessionType,
          userId,
        },
        severity: "error",
      });

      await serviceRoleClient.from("chat_sessions").delete().eq("id", session.id);

      return NextResponse.json(
        { error: activateSessionError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    const message = getErrorMessage(
      error,
      "Die Session konnte nicht erstellt werden."
    );

    await logSessionStartEvent({
      forceNotify: true,
      message: "Unhandled session start failure",
      metadata: {
        error: message,
      },
      severity: "critical",
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
