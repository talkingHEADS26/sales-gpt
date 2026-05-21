import OpenAI from "openai";
import type {
  ChatCompletionAssistantMessageParam,
  ChatCompletionMessageParam,
  ChatCompletionSystemMessageParam,
  ChatCompletionUserMessageParam,
} from "openai/resources/chat/completions";
import { NextResponse } from "next/server";

import { type AppointmentAvatarSnapshot } from "@/lib/appointment-setting-avatar";
import { extractAppointmentSettingKpiUpdateFromAssistantMessage } from "@/lib/appointment-setting-kpi-parser";
import {
  extractComplaintManagementKpiUpdateFromAssistantMessage,
} from "@/lib/complaint-management-kpi-parser";
import {
  selectComplaintAvatar,
  type ComplaintAvatarSnapshot,
} from "@/lib/complaint-avatar";
import {
  isCompletedAppointmentSettingConversation,
  isCompletedComplaintManagementConversation,
  isCompletedFullSalesConversation,
} from "@/lib/chat-session";
import { detectSimulationBullshitBingo } from "@/lib/full-sales-bullshit-bingo";
import { buildFullSalesAvatarPrompt, type FullSalesAvatarSnapshot } from "@/lib/full-sales-avatar";
import { detectFullSalesObjectionRepetition } from "@/lib/full-sales-repetition";
import { getSystemPrompt } from "@/lib/chat-prompts";
import { extractKpiUpdateFromAssistantMessage } from "@/lib/full-sales-kpi-parser";
import { getOrganizationIndustrySettings } from "@/lib/industries";
import { isFailure as isPaidAppAuthFailure, requireAuthUser } from "@/lib/auth-server";
import { getErrorMessage, logSystemEvent } from "@/lib/system-monitoring";
import {
  type AppointmentLeadSource,
  type ComplaintChannelOption,
  type SessionDifficulty,
} from "@/lib/training-session-config";

type RequestBody = {
  message?: string;
  sessionId?: string;
};

type ChatSession = {
  appointment_lead_source: AppointmentLeadSource | null;
  complaint_channel: ComplaintChannelOption | null;
  id: string;
  organization_id: string | null;
  session_difficulty: SessionDifficulty | null;
  session_type:
    | "appointment_setting"
    | "complaint_management"
    | "full_sales"
    | "situation_coaching";
  status: string;
  title: string | null;
  user_id: string;
};

type ChatMessage = {
  content: string;
  sender_type: "assistant" | "system" | "user";
};

type AppointmentAvatarSnapshotRow = {
  avatar_age: number;
  avatar_difficulty: "almost_impossible" | "easy" | "hard" | "medium" | null;
  avatar_disc_type: "analytical" | "dominant" | "experimental" | "steady" | null;
  avatar_family_situation:
    | "divorced"
    | "family_with_children"
    | "married"
    | "relationship"
    | "single"
    | "single_parent"
    | "widowed"
    | null;
  avatar_financial_budget: "good" | "high" | "low" | "medium" | "very_low" | null;
  avatar_gender: "female" | "male";
  avatar_job_situation:
    | "employed_full_time"
    | "employed_part_time"
    | "entrepreneur"
    | "pupil"
    | "retired"
    | "self_employed"
    | "student"
    | "trainee"
    | "unemployed"
    | null;
  avatar_name: string;
  avatar_objections: string[] | null;
  avatar_time_budget: "flexible" | "limited" | "medium" | "very_limited" | null;
  created_at: string;
  id: string;
  industry_key: string;
  lead_context: string;
  lead_goal: string;
  lead_source: AppointmentLeadSource;
  lead_tone: string;
  opening_message: string;
  organization_id: string | null;
  previous_avatar_snapshot_id: string | null;
  session_id: string;
  user_id: string;
};

type FullSalesAvatarSnapshotRow = {
  avatar_age: number;
  avatar_difficulty: "almost_impossible" | "easy" | "hard" | "medium" | null;
  avatar_disc_type: "analytical" | "dominant" | "experimental" | "steady" | null;
  avatar_emotional_tone: string;
  avatar_family_situation:
    | "divorced"
    | "family_with_children"
    | "married"
    | "relationship"
    | "single"
    | "single_parent"
    | "widowed"
    | null;
  avatar_financial_budget: "good" | "high" | "low" | "medium" | "very_low" | null;
  avatar_gender: "male" | "female";
  avatar_goal: string;
  avatar_job_situation:
    | "employed_full_time"
    | "employed_part_time"
    | "entrepreneur"
    | "pupil"
    | "retired"
    | "self_employed"
    | "student"
    | "trainee"
    | "unemployed"
    | null;
  avatar_life_stage: string;
  avatar_name: string;
  avatar_objections: string[] | null;
  avatar_primary_problem: string;
  avatar_profession_or_context: string;
  avatar_secondary_context: string | null;
  avatar_time_budget: "flexible" | "limited" | "medium" | "very_limited" | null;
  created_at: string;
  id: string;
  industry_key: string;
  opening_message: string;
  organization_id: string | null;
  previous_avatar_snapshot_id: string | null;
  session_id: string;
  user_id: string;
};

type ComplaintAvatarSnapshotRow = {
  avatar_age: number;
  avatar_channel: "Empfang / Theke" | "Telefon" | "vor Ort";
  avatar_complaint_context: string;
  avatar_complaint_goal: string;
  avatar_complaint_history: string;
  avatar_complaint_intensity: "easy" | "hart" | "realistisch";
  avatar_complaint_topic: string;
  avatar_complaint_type: string;
  avatar_difficulty: "almost_impossible" | "easy" | "hard" | "medium" | null;
  avatar_disc_type: "analytical" | "dominant" | "experimental" | "steady" | null;
  avatar_emotional_tone: string;
  avatar_family_situation:
    | "divorced"
    | "family_with_children"
    | "married"
    | "relationship"
    | "single"
    | "single_parent"
    | "widowed"
    | null;
  avatar_financial_budget: "good" | "high" | "low" | "medium" | "very_low" | null;
  avatar_gender: "male" | "female";
  avatar_inner_amplifiers: string[] | null;
  avatar_job_situation:
    | "employed_full_time"
    | "employed_part_time"
    | "entrepreneur"
    | "pupil"
    | "retired"
    | "self_employed"
    | "student"
    | "trainee"
    | "unemployed"
    | null;
  avatar_life_context: string;
  avatar_membership_context: string;
  avatar_name: string;
  avatar_objections: string[] | null;
  avatar_persona_type: string;
  avatar_time_budget: "flexible" | "limited" | "medium" | "very_limited" | null;
  created_at: string;
  id: string;
  industry_key: string;
  opening_message: string;
  organization_id: string | null;
  previous_avatar_snapshot_id: string | null;
  session_id: string;
  user_id: string;
};

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

async function logChatEvent(params: {
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
    source: "api_chat",
  });
}

function hasAskedDifferentiationQuestion(messages: ChatMessage[]) {
  const differentiationQuestionPattern =
    /\bwas\s+macht\s+euch\s+(?:eigentlich\s+)?besonders\b|\bwarum\s+soll(?:te|)\s+ich\s+heute\s+ausgerechnet\s+bei\s+euch\b|\bwas\s+unterscheidet\s+euch\s+wirklich\s+von\s+anderen\s+studios\b/iu;

  return messages
    .filter((message) => message.sender_type === "assistant")
    .some((message) => differentiationQuestionPattern.test(message.content));
}

function mapAppointmentAvatarSnapshotRowToDomain(
  snapshot: AppointmentAvatarSnapshotRow
): AppointmentAvatarSnapshot {
  return {
    avatarAge: snapshot.avatar_age,
    avatarDifficulty: snapshot.avatar_difficulty ?? "medium",
    avatarDiscType: snapshot.avatar_disc_type ?? "analytical",
    avatarFamilySituation: snapshot.avatar_family_situation ?? "single",
    avatarFinancialBudget: snapshot.avatar_financial_budget ?? "medium",
    avatarGender: snapshot.avatar_gender,
    avatarJobSituation: snapshot.avatar_job_situation ?? "employed_full_time",
    avatarObjections: (snapshot.avatar_objections ?? []) as AppointmentAvatarSnapshot["avatarObjections"],
    avatarTimeBudget: snapshot.avatar_time_budget ?? "medium",
    createdAt: snapshot.created_at,
    id: snapshot.id,
    leadContext: snapshot.lead_context,
    leadGoal: snapshot.lead_goal,
    leadName: snapshot.avatar_name,
    leadSource: snapshot.lead_source,
    leadTone: snapshot.lead_tone,
    openingMessage: snapshot.opening_message,
    organizationId: snapshot.organization_id,
    previousAvatarSnapshotId: snapshot.previous_avatar_snapshot_id,
    sessionId: snapshot.session_id,
    userId: snapshot.user_id,
  };
}

function mapAvatarSnapshotRowToDomain(
  snapshot: FullSalesAvatarSnapshotRow
): FullSalesAvatarSnapshot {
  return {
    avatarAge: snapshot.avatar_age,
    avatarDifficulty: snapshot.avatar_difficulty ?? "medium",
    avatarDiscType: snapshot.avatar_disc_type ?? "analytical",
    avatarEmotionalTone: snapshot.avatar_emotional_tone,
    avatarFamilySituation: snapshot.avatar_family_situation ?? "single",
    avatarFinancialBudget: snapshot.avatar_financial_budget ?? "medium",
    avatarGender: snapshot.avatar_gender,
    avatarGoal: snapshot.avatar_goal,
    avatarJobSituation: snapshot.avatar_job_situation ?? "employed_full_time",
    avatarLifeStage: snapshot.avatar_life_stage,
    avatarName: snapshot.avatar_name,
    avatarObjections: (snapshot.avatar_objections ?? []) as FullSalesAvatarSnapshot["avatarObjections"],
    avatarPrimaryProblem: snapshot.avatar_primary_problem,
    avatarProfessionOrContext: snapshot.avatar_profession_or_context,
    avatarSecondaryContext: snapshot.avatar_secondary_context ?? "",
    avatarTimeBudget: snapshot.avatar_time_budget ?? "medium",
    createdAt: snapshot.created_at,
    id: snapshot.id,
    industryKey: snapshot.industry_key as FullSalesAvatarSnapshot["industryKey"],
    openingMessage: snapshot.opening_message,
    organizationId: snapshot.organization_id,
    previousAvatarSnapshotId: snapshot.previous_avatar_snapshot_id,
    sessionId: snapshot.session_id,
    userId: snapshot.user_id,
  };
}

function mapComplaintAvatarSnapshotRowToDomain(
  snapshot: ComplaintAvatarSnapshotRow
): ComplaintAvatarSnapshot {
  const normalizedChannel =
    snapshot.avatar_channel === "Empfang / Theke"
      ? "vor Ort"
      : snapshot.avatar_channel;

  return {
    avatarAge: snapshot.avatar_age,
    avatarChannel: normalizedChannel,
    avatarComplaintContext: snapshot.avatar_complaint_context,
    avatarComplaintGoal: snapshot.avatar_complaint_goal,
    avatarComplaintHistory: snapshot.avatar_complaint_history,
    avatarComplaintTopic: snapshot.avatar_complaint_topic,
    avatarComplaintType: snapshot.avatar_complaint_type,
    avatarDifficulty: snapshot.avatar_difficulty ?? "medium",
    avatarDiscType: snapshot.avatar_disc_type ?? "analytical",
    avatarEmotionalTone: snapshot.avatar_emotional_tone,
    avatarFamilySituation: snapshot.avatar_family_situation ?? "single",
    avatarFinancialBudget: snapshot.avatar_financial_budget ?? "medium",
    avatarGender: snapshot.avatar_gender,
    avatarInnerAmplifiers: snapshot.avatar_inner_amplifiers ?? [],
    avatarJobSituation: snapshot.avatar_job_situation ?? "employed_full_time",
    avatarLifeContext: snapshot.avatar_life_context,
    avatarMembershipContext: snapshot.avatar_membership_context,
    avatarName: snapshot.avatar_name,
    avatarObjections: (snapshot.avatar_objections ?? []) as ComplaintAvatarSnapshot["avatarObjections"],
    avatarTimeBudget: snapshot.avatar_time_budget ?? "medium",
    createdAt: snapshot.created_at,
    id: snapshot.id,
    industryKey: snapshot.industry_key as ComplaintAvatarSnapshot["industryKey"],
    openingMessage: snapshot.opening_message,
    organizationId: snapshot.organization_id,
    previousAvatarSnapshotId: snapshot.previous_avatar_snapshot_id,
    sessionId: snapshot.session_id,
    userId: snapshot.user_id,
  };
}

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY || !openai) {
      await logChatEvent({
        forceNotify: true,
        message: "OpenAI configuration missing in api_chat",
        severity: "critical",
      });

      return NextResponse.json(
        { error: "OPENAI_API_KEY ist nicht gesetzt." },
        { status: 500 }
      );
    }

    const { message, sessionId } = (await request.json()) as RequestBody;
    const trimmedMessage = message?.trim();

    if (!sessionId || !trimmedMessage) {
      return NextResponse.json(
        { error: "sessionId und message sind erforderlich." },
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

    const { supabase, userId } = authResult;

    const { data: session, error: sessionError } = await supabase
      .from("chat_sessions")
      .select(
        "id, user_id, organization_id, session_type, status, title, appointment_lead_source, complaint_channel, session_difficulty"
      )
      .eq("id", sessionId)
      .eq("user_id", userId)
      .maybeSingle<ChatSession>();

    if (sessionError) {
      await logChatEvent({
        message: "Chat session lookup failed",
        metadata: {
          error: sessionError.message,
          sessionId,
          userId,
        },
        severity: "error",
      });

      return NextResponse.json(
        { error: sessionError.message },
        { status: 500 }
      );
    }

    if (!session) {
      return NextResponse.json(
        { error: "Session nicht gefunden." },
        { status: 404 }
      );
    }

    const { franchiseVertical, industryKey } = await getOrganizationIndustrySettings(
      supabase,
      session.organization_id
    );

    let fullSalesAvatarContext: {
      currentAvatar: FullSalesAvatarSnapshot;
      franchiseVertical?: "restaurant" | "fashion" | "fitness" | "beauty" | "retail" | "services" | "other";
      industryKey?: FullSalesAvatarSnapshot["industryKey"];
      previousAvatar?: FullSalesAvatarSnapshot | null;
    } | null = null;
    let appointmentAvatarContext: {
      currentAvatar: AppointmentAvatarSnapshot;
      previousAvatar?: AppointmentAvatarSnapshot | null;
    } | null = null;
    let complaintAvatarContext: {
      currentAvatar: ComplaintAvatarSnapshot;
      previousAvatar?: ComplaintAvatarSnapshot | null;
    } | null = null;

    if (session.session_type === "appointment_setting") {
      const appointmentAvatarSelectClause =
        "id, session_id, previous_avatar_snapshot_id, user_id, organization_id, industry_key, avatar_name, avatar_gender, avatar_age, avatar_job_situation, avatar_family_situation, avatar_time_budget, avatar_financial_budget, avatar_disc_type, avatar_difficulty, avatar_objections, lead_source, lead_context, lead_goal, lead_tone, opening_message, created_at";
      const {
        data: currentAppointmentAvatarSnapshot,
        error: currentAppointmentAvatarSnapshotError,
      } = await supabase
        .from("appointment_setting_avatar_snapshots")
        .select(appointmentAvatarSelectClause)
        .eq("session_id", session.id)
        .maybeSingle<AppointmentAvatarSnapshotRow>();

      if (currentAppointmentAvatarSnapshotError) {
        return NextResponse.json(
          { error: currentAppointmentAvatarSnapshotError.message },
          { status: 500 }
        );
      }

      if (currentAppointmentAvatarSnapshot) {
        const mappedCurrentAvatar =
          mapAppointmentAvatarSnapshotRowToDomain(currentAppointmentAvatarSnapshot);
        let previousAvatar: AppointmentAvatarSnapshot | null = null;

        if (currentAppointmentAvatarSnapshot.previous_avatar_snapshot_id) {
          const {
            data: previousAppointmentAvatarSnapshot,
            error: previousAppointmentAvatarSnapshotError,
          } = await supabase
            .from("appointment_setting_avatar_snapshots")
            .select(appointmentAvatarSelectClause)
            .eq("id", currentAppointmentAvatarSnapshot.previous_avatar_snapshot_id)
            .maybeSingle<AppointmentAvatarSnapshotRow>();

          if (previousAppointmentAvatarSnapshotError) {
            return NextResponse.json(
              { error: previousAppointmentAvatarSnapshotError.message },
              { status: 500 }
            );
          }

          if (previousAppointmentAvatarSnapshot) {
            previousAvatar = mapAppointmentAvatarSnapshotRowToDomain(
              previousAppointmentAvatarSnapshot
            );
          }
        }

        appointmentAvatarContext = {
          currentAvatar: mappedCurrentAvatar,
          previousAvatar,
        };
      }
    }

    if (session.session_type === "full_sales") {
      const { data: currentAvatarSnapshot, error: currentAvatarSnapshotError } =
        await supabase
          .from("full_sales_avatar_snapshots")
          .select(
            "id, session_id, previous_avatar_snapshot_id, user_id, organization_id, industry_key, avatar_name, avatar_gender, avatar_age, avatar_job_situation, avatar_family_situation, avatar_time_budget, avatar_financial_budget, avatar_disc_type, avatar_difficulty, avatar_objections, avatar_life_stage, avatar_profession_or_context, avatar_primary_problem, avatar_secondary_context, avatar_goal, avatar_emotional_tone, opening_message, created_at"
          )
          .eq("session_id", session.id)
          .maybeSingle<FullSalesAvatarSnapshotRow>();

      if (currentAvatarSnapshotError) {
        return NextResponse.json(
          { error: currentAvatarSnapshotError.message },
          { status: 500 }
        );
      }

      if (currentAvatarSnapshot) {
        const mappedCurrentAvatar = mapAvatarSnapshotRowToDomain(currentAvatarSnapshot);
        let previousAvatar: FullSalesAvatarSnapshot | null = null;

        if (currentAvatarSnapshot.previous_avatar_snapshot_id) {
          const { data: previousAvatarSnapshot, error: previousAvatarSnapshotError } =
            await supabase
              .from("full_sales_avatar_snapshots")
              .select(
                "id, session_id, previous_avatar_snapshot_id, user_id, organization_id, industry_key, avatar_name, avatar_gender, avatar_age, avatar_job_situation, avatar_family_situation, avatar_time_budget, avatar_financial_budget, avatar_disc_type, avatar_difficulty, avatar_objections, avatar_life_stage, avatar_profession_or_context, avatar_primary_problem, avatar_secondary_context, avatar_goal, avatar_emotional_tone, opening_message, created_at"
              )
              .eq("id", currentAvatarSnapshot.previous_avatar_snapshot_id)
              .maybeSingle<FullSalesAvatarSnapshotRow>();

          if (previousAvatarSnapshotError) {
            return NextResponse.json(
              { error: previousAvatarSnapshotError.message },
              { status: 500 }
            );
          }

          if (previousAvatarSnapshot) {
            previousAvatar = mapAvatarSnapshotRowToDomain(previousAvatarSnapshot);
          }
        }

        fullSalesAvatarContext = {
          currentAvatar: mappedCurrentAvatar,
          franchiseVertical,
          industryKey: mappedCurrentAvatar.industryKey,
          previousAvatar,
        };
      }
    }

    if (session.session_type === "complaint_management") {
      const complaintSelectClause =
        "id, session_id, previous_avatar_snapshot_id, user_id, organization_id, industry_key, avatar_name, avatar_gender, avatar_age, avatar_job_situation, avatar_family_situation, avatar_time_budget, avatar_financial_budget, avatar_disc_type, avatar_difficulty, avatar_objections, avatar_channel, avatar_membership_context, avatar_life_context, avatar_complaint_topic, avatar_complaint_context, avatar_complaint_goal, avatar_complaint_type, avatar_persona_type, avatar_complaint_history, avatar_inner_amplifiers, avatar_emotional_tone, avatar_complaint_intensity, opening_message, created_at";
      const {
        data: currentComplaintAvatarSnapshot,
        error: currentComplaintAvatarSnapshotError,
      } = await supabase
        .from("complaint_management_avatar_snapshots")
        .select(complaintSelectClause)
        .eq("session_id", session.id)
        .maybeSingle<ComplaintAvatarSnapshotRow>();

      if (currentComplaintAvatarSnapshotError) {
        return NextResponse.json(
          { error: currentComplaintAvatarSnapshotError.message },
          { status: 500 }
        );
      }

      if (currentComplaintAvatarSnapshot) {
        const mappedCurrentAvatar =
          mapComplaintAvatarSnapshotRowToDomain(currentComplaintAvatarSnapshot);
        let previousAvatar: ComplaintAvatarSnapshot | null = null;

        if (currentComplaintAvatarSnapshot.previous_avatar_snapshot_id) {
          const {
            data: previousComplaintAvatarSnapshot,
            error: previousComplaintAvatarSnapshotError,
          } = await supabase
            .from("complaint_management_avatar_snapshots")
            .select(complaintSelectClause)
            .eq("id", currentComplaintAvatarSnapshot.previous_avatar_snapshot_id)
            .maybeSingle<ComplaintAvatarSnapshotRow>();

          if (previousComplaintAvatarSnapshotError) {
            return NextResponse.json(
              { error: previousComplaintAvatarSnapshotError.message },
              { status: 500 }
            );
          }

          if (previousComplaintAvatarSnapshot) {
            previousAvatar = mapComplaintAvatarSnapshotRowToDomain(
              previousComplaintAvatarSnapshot
            );
          }
        }

        complaintAvatarContext = {
          currentAvatar: mappedCurrentAvatar,
          previousAvatar,
        };
      }
    }

    const { data: historyMessages, error: historyError } = await supabase
      .from("chat_messages")
      .select("sender_type, content")
      .eq("session_id", session.id)
      .in("sender_type", ["user", "assistant"])
      .order("created_at", { ascending: true })
      .limit(20);

    if (historyError) {
      await logChatEvent({
        message: "Chat history lookup failed",
        metadata: {
          error: historyError.message,
          sessionId: session.id,
          userId,
        },
        severity: "error",
      });

      return NextResponse.json(
        { error: historyError.message },
        { status: 500 }
      );
    }

    let industryDbPrompt: string | null = null;
    if (session.session_type === "full_sales") {
      const { data: industryPromptRow } = await supabase
        .from("industry_prompts")
        .select("master_prompt")
        .eq("industry_key", industryKey)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      if (industryPromptRow?.master_prompt) {
        industryDbPrompt = industryPromptRow.master_prompt;
      }
    }

    let resolvedSystemPrompt: string;
    if (industryDbPrompt) {
      const parts: string[] = [industryDbPrompt];
      if (fullSalesAvatarContext) {
        parts.push(buildFullSalesAvatarPrompt(fullSalesAvatarContext));
      }
      resolvedSystemPrompt = parts.join("\n\n");
    } else {
      resolvedSystemPrompt = getSystemPrompt({
        appointmentAvatarContext,
        complaintAvatarContext,
        franchiseVertical,
        fullSalesAvatarContext,
        industryKey,
        sessionId: session.id,
        sessionTitle: session.title,
        sessionType: session.session_type,
      });
    }
    const simulationBullshitBingo =
      session.session_type === "full_sales" ||
      session.session_type === "appointment_setting" ||
      session.session_type === "complaint_management"
        ? detectSimulationBullshitBingo({
            message: trimmedMessage,
            scenario: session.session_type,
          })
        : null;
    const fullSalesObjectionRepetition =
      session.session_type === "full_sales"
        ? detectFullSalesObjectionRepetition({
            bullshitBingoDetected: simulationBullshitBingo?.detected ?? false,
            historyMessages: (historyMessages ?? []) as ChatMessage[],
            latestTrainerMessage: trimmedMessage,
          })
        : null;
    const mappedHistoryMessages = (historyMessages ?? []) as ChatMessage[];
    const fullSalesDifficulty =
      session.session_type === "full_sales"
        ? fullSalesAvatarContext?.currentAvatar.avatarDifficulty ??
          session.session_difficulty ??
          "medium"
        : null;
    const shouldForceDifferentiationQuestion =
      session.session_type === "full_sales" &&
      (fullSalesDifficulty === "medium" || fullSalesDifficulty === "hard") &&
      !hasAskedDifferentiationQuestion(mappedHistoryMessages);

    if (simulationBullshitBingo?.detected && simulationBullshitBingo.reactionHint) {
      resolvedSystemPrompt = `${resolvedSystemPrompt}\n\nBULLSHIT-BINGO-HINWEIS:\n${simulationBullshitBingo.reactionHint}`;
    }

    if (
      fullSalesObjectionRepetition?.reactionHint &&
      fullSalesObjectionRepetition.escalationLevel > 0
    ) {
      resolvedSystemPrompt = `${resolvedSystemPrompt}\n\nFULL-SALES-REPETITION-HINWEIS:\n${fullSalesObjectionRepetition.reactionHint}`;
    }

    if (shouldForceDifferentiationQuestion) {
      resolvedSystemPrompt = `${resolvedSystemPrompt}\n\nFULL-SALES-DIFFERENZIERUNG-HINWEIS:\nIn dieser Session (Difficulty ${fullSalesDifficulty}) muss genau eine Differenzierungsfrage im Kundenstil gestellt werden. Falls sie noch nicht gestellt wurde, stelle sie im passenden Moment in Modul 2 oder Modul 3 (nicht in Modul 1 oder 4), kurz und natuerlich. Geeignete Varianten: "Was macht euch eigentlich besonders?", "Warum sollte ich heute ausgerechnet bei euch Mitglied werden?" oder "Was unterscheidet euch wirklich von anderen Studios?"`;
    }

    const systemMessage: ChatCompletionSystemMessageParam = {
      role: "system",
      content: resolvedSystemPrompt,
    };

    const history: ChatCompletionMessageParam[] = mappedHistoryMessages.map((historyMessage) => {
      if (historyMessage.sender_type === "assistant") {
        const assistantMessage: ChatCompletionAssistantMessageParam = {
          role: "assistant",
          content: historyMessage.content,
        };

        return assistantMessage;
      }

      const userMessage: ChatCompletionUserMessageParam = {
        role: "user",
        content: historyMessage.content,
      };

      return userMessage;
    });

    const latestUserMessage: ChatCompletionUserMessageParam = {
      role: "user",
      content: trimmedMessage,
    };

    if (
      session.session_type === "complaint_management" &&
      !complaintAvatarContext &&
      session.complaint_channel
    ) {
        const complaintSelectClause =
          "id, session_id, previous_avatar_snapshot_id, user_id, organization_id, industry_key, avatar_name, avatar_gender, avatar_age, avatar_job_situation, avatar_family_situation, avatar_time_budget, avatar_financial_budget, avatar_disc_type, avatar_difficulty, avatar_objections, avatar_channel, avatar_membership_context, avatar_life_context, avatar_complaint_topic, avatar_complaint_context, avatar_complaint_goal, avatar_complaint_type, avatar_persona_type, avatar_complaint_history, avatar_inner_amplifiers, avatar_emotional_tone, avatar_complaint_intensity, opening_message, created_at";
        const {
          data: latestUserComplaintAvatarSnapshot,
          error: latestComplaintAvatarError,
        } =
          await supabase
            .from("complaint_management_avatar_snapshots")
            .select(complaintSelectClause)
            .eq("user_id", userId)
            .eq("industry_key", industryKey)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle<ComplaintAvatarSnapshotRow>();

        if (latestComplaintAvatarError) {
          return NextResponse.json(
            { error: latestComplaintAvatarError.message },
            { status: 500 }
          );
        }

        let latestComplaintAvatarSnapshot = latestUserComplaintAvatarSnapshot;

        if (!latestComplaintAvatarSnapshot && session.organization_id) {
          const {
            data: latestOrganizationComplaintAvatarSnapshot,
            error: latestOrganizationComplaintAvatarError,
          } = await supabase
            .from("complaint_management_avatar_snapshots")
            .select(complaintSelectClause)
            .eq("organization_id", session.organization_id)
            .eq("industry_key", industryKey)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle<ComplaintAvatarSnapshotRow>();

          if (latestOrganizationComplaintAvatarError) {
            return NextResponse.json(
              { error: latestOrganizationComplaintAvatarError.message },
              { status: 500 }
            );
          }

          latestComplaintAvatarSnapshot = latestOrganizationComplaintAvatarSnapshot;
        }

        const previousAvatar = latestComplaintAvatarSnapshot
          ? mapComplaintAvatarSnapshotRowToDomain(latestComplaintAvatarSnapshot)
          : null;
        const selection = selectComplaintAvatar({
          channel: session.complaint_channel,
          difficulty: session.session_difficulty ?? "medium",
          franchiseVertical,
          industryKey,
          previousAvatar,
        });

        const { data: insertedComplaintAvatarSnapshot, error: complaintAvatarInsertError } =
          await supabase
            .from("complaint_management_avatar_snapshots")
            .insert({
              session_id: session.id,
              previous_avatar_snapshot_id: previousAvatar?.id ?? null,
              user_id: userId,
              organization_id: session.organization_id,
              industry_key: industryKey,
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
            })
            .select(complaintSelectClause)
            .single<ComplaintAvatarSnapshotRow>();

        if (complaintAvatarInsertError) {
          return NextResponse.json(
            { error: complaintAvatarInsertError.message },
            { status: 500 }
          );
        }

        complaintAvatarContext = {
          currentAvatar:
            mapComplaintAvatarSnapshotRowToDomain(insertedComplaintAvatarSnapshot),
          previousAvatar,
        };

        resolvedSystemPrompt = getSystemPrompt({
          appointmentAvatarContext,
          complaintAvatarContext,
          franchiseVertical,
          fullSalesAvatarContext,
          industryKey,
          sessionId: session.id,
          sessionTitle: session.title,
          sessionType: session.session_type,
        });

        if (simulationBullshitBingo?.detected && simulationBullshitBingo.reactionHint) {
          resolvedSystemPrompt = `${resolvedSystemPrompt}\n\nBULLSHIT-BINGO-HINWEIS:\n${simulationBullshitBingo.reactionHint}`;
        }

        if (
          fullSalesObjectionRepetition?.reactionHint &&
          fullSalesObjectionRepetition.escalationLevel > 0
        ) {
          resolvedSystemPrompt = `${resolvedSystemPrompt}\n\nFULL-SALES-REPETITION-HINWEIS:\n${fullSalesObjectionRepetition.reactionHint}`;
        }

        systemMessage.content = resolvedSystemPrompt;
    }

    const messages: ChatCompletionMessageParam[] = [
      systemMessage,
      ...history,
      latestUserMessage,
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
    });

    const assistantMessage = response.choices[0]?.message?.content?.trim();

    if (!assistantMessage) {
      await logChatEvent({
        forceNotify: true,
        message: "OpenAI returned no assistant message",
        metadata: {
          sessionId: session.id,
          userId,
        },
        severity: "error",
      });

      return NextResponse.json(
        { error: "OpenAI hat keine Antwort zurueckgegeben." },
        { status: 502 }
      );
    }

    const { data: insertedMessage, error: insertError } = await supabase
      .from("chat_messages")
      .insert({
        session_id: session.id,
        sender_type: "assistant",
        content: assistantMessage,
      })
      .select("id, sender_type, content, created_at")
      .single();

    if (insertError) {
      await logChatEvent({
        message: "Assistant message insert failed",
        metadata: {
          error: insertError.message,
          sessionId: session.id,
          userId,
        },
        severity: "error",
      });

      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    if (
      isCompletedFullSalesConversation(session, assistantMessage) ||
      isCompletedAppointmentSettingConversation(session, assistantMessage) ||
      isCompletedComplaintManagementConversation(session, assistantMessage)
    ) {
      const { error: completionError } = await supabase
        .from("chat_sessions")
        .update({ status: "completed" })
        .eq("id", session.id)
        .eq("status", "active");

      if (completionError) {
        console.warn(
          `[chat-session] Completion status update failed: ${completionError.message}`
        );
      }
    }

    try {
      const appointmentSettingKpiUpdate =
        extractAppointmentSettingKpiUpdateFromAssistantMessage(assistantMessage, {
          sessionType: session.session_type,
        });

      if (appointmentSettingKpiUpdate) {
        const { error: appointmentSettingKpiError } = await supabase
          .from("appointment_setting_kpi_snapshots")
          .upsert(
            {
              appointment_probability:
                appointmentSettingKpiUpdate.appointment_probability ?? null,
              appointment_result:
                appointmentSettingKpiUpdate.appointment_result ?? null,
              benefit_score: appointmentSettingKpiUpdate.benefit_score ?? null,
              closing_score: appointmentSettingKpiUpdate.closing_score ?? null,
              feedback: appointmentSettingKpiUpdate.feedback ?? null,
              final_feedback:
                appointmentSettingKpiUpdate.final_feedback ?? null,
              improvements: appointmentSettingKpiUpdate.improvements ?? null,
              is_appointment:
                appointmentSettingKpiUpdate.is_appointment ?? null,
              need_score: appointmentSettingKpiUpdate.need_score ?? null,
              next_focus: appointmentSettingKpiUpdate.next_focus ?? null,
              objection_score:
                appointmentSettingKpiUpdate.objection_score ?? null,
              opening_score: appointmentSettingKpiUpdate.opening_score ?? null,
              permission_score:
                appointmentSettingKpiUpdate.permission_score ?? null,
              rationale: appointmentSettingKpiUpdate.rationale ?? null,
              session_id: session.id,
              strengths: appointmentSettingKpiUpdate.strengths ?? null,
              user_id: userId,
              organization_id: session.organization_id,
            },
            { onConflict: "session_id" }
          );

        if (appointmentSettingKpiError) {
          console.warn(
            `[appointment-setting-kpi] KPI snapshot upsert failed: ${appointmentSettingKpiError.message}`
          );
        }
      }

      const complaintManagementKpiUpdate =
        extractComplaintManagementKpiUpdateFromAssistantMessage(assistantMessage, {
          sessionType: session.session_type,
        });

      if (complaintManagementKpiUpdate) {
        const { error: complaintManagementKpiError } = await supabase
          .from("complaint_management_kpi_snapshots")
          .upsert(
            {
              complaint_result:
                complaintManagementKpiUpdate.complaint_result ?? null,
              complaint_understanding_score:
                complaintManagementKpiUpdate.complaint_understanding_score ?? null,
              customer_happy:
                complaintManagementKpiUpdate.customer_happy ?? null,
              empathy_deescalation_score:
                complaintManagementKpiUpdate.empathy_deescalation_score ?? null,
              feedback: complaintManagementKpiUpdate.feedback ?? null,
              final_feedback:
                complaintManagementKpiUpdate.final_feedback ?? null,
              improvements: complaintManagementKpiUpdate.improvements ?? null,
              is_customer_happy:
                complaintManagementKpiUpdate.is_customer_happy ?? null,
              is_resolved: complaintManagementKpiUpdate.is_resolved ?? null,
              next_focus: complaintManagementKpiUpdate.next_focus ?? null,
              opening_score: complaintManagementKpiUpdate.opening_score ?? null,
              organization_id: session.organization_id,
              rationale: complaintManagementKpiUpdate.rationale ?? null,
              resolution_clarity_score:
                complaintManagementKpiUpdate.resolution_clarity_score ?? null,
              resolution_orientation_score:
                complaintManagementKpiUpdate.resolution_orientation_score ?? null,
              resolution_probability:
                complaintManagementKpiUpdate.resolution_probability ?? null,
              responsibility_clarity_score:
                complaintManagementKpiUpdate.responsibility_clarity_score ?? null,
              session_id: session.id,
              strengths: complaintManagementKpiUpdate.strengths ?? null,
              user_id: userId,
            },
            { onConflict: "session_id" }
          );

        if (complaintManagementKpiError) {
          console.warn(
            `[complaint-management-kpi] KPI snapshot upsert failed: ${complaintManagementKpiError.message}`
          );
        }
      }

      const kpiUpdate = extractKpiUpdateFromAssistantMessage(assistantMessage, {
        sessionTitle: session.title,
        sessionType: session.session_type,
      });

      if (kpiUpdate) {
        const { error: kpiError } = await supabase
          .from("full_sales_kpi_snapshots")
          .upsert(
            {
              closing_probability_score:
                kpiUpdate.closing_probability_score ?? null,
              customer_understanding_score:
                kpiUpdate.customer_understanding_score ?? null,
              emotionality_score: kpiUpdate.emotionality_score ?? null,
              feedback: kpiUpdate.feedback ?? null,
              final_feedback: kpiUpdate.final_feedback ?? null,
              final_score: kpiUpdate.finalScore ?? null,
              improvements: kpiUpdate.improvements ?? null,
              module_1_score: kpiUpdate.module1Score ?? null,
              module_2_score: kpiUpdate.module2Score ?? null,
              module_3_score: kpiUpdate.module3Score ?? null,
              needs_analysis_score: kpiUpdate.needs_analysis_score ?? null,
              next_focus: kpiUpdate.next_focus ?? null,
              objection_handling_score:
                kpiUpdate.objection_handling_score ?? null,
              presentation_score: kpiUpdate.presentation_score ?? null,
              is_sale: kpiUpdate.is_sale ?? null,
              sale_result: kpiUpdate.sale_result ?? null,
              session_id: session.id,
              strengths: kpiUpdate.strengths ?? null,
              user_id: userId,
              organization_id: session.organization_id,
            },
            { onConflict: "session_id" }
          );

        if (kpiError) {
          console.warn(`[full-sales-kpi] KPI snapshot upsert failed: ${kpiError.message}`);
        }
      }
    } catch (kpiError) {
      console.warn(
        `[full-sales-kpi] KPI extraction failed: ${
          kpiError instanceof Error ? kpiError.message : "Unknown error"
        }`
      );
    }

    return NextResponse.json({
      message: insertedMessage.content,
      messageId: insertedMessage.id,
      chatMessage: insertedMessage,
    });
  } catch (error) {
    const message = getErrorMessage(
      error,
      "Die AI-Antwort ist fehlgeschlagen."
    );

    await logChatEvent({
      forceNotify: true,
      message: "Unhandled chat route failure",
      metadata: {
        error: message,
      },
      severity: "critical",
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
