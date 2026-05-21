import { NextResponse } from "next/server";

import { isFailure as isPaidAppAuthFailure, requireAuthUser } from "@/lib/auth-server";
import {
  FULL_CHAT_TITLE,
  isResumableFullChatSession,
} from "@/lib/chat-session";

type ChatSessionRecord = {
  id: string;
  session_type:
    | "appointment_setting"
    | "complaint_management"
    | "full_sales"
    | "situation_coaching";
  status: string;
  title: string | null;
  updated_at: string;
};

export async function GET(request: Request) {
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

  const [
    { data: coreFlowSessions, error: coreFlowSessionsError },
    { data: fullChatSessions, error: fullChatSessionsError },
  ] = await Promise.all([
    supabase
      .from("chat_sessions")
      .select("id, session_type, status, title, updated_at")
      .eq("user_id", userId)
      .eq("session_type", "full_sales")
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("chat_sessions")
      .select("id, session_type, status, title, updated_at")
      .eq("user_id", userId)
      .eq("session_type", "situation_coaching")
      .eq("title", FULL_CHAT_TITLE)
      .neq("status", "completed")
      .neq("status", "archived")
      .order("updated_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  if (coreFlowSessionsError) {
    return NextResponse.json(
      { error: coreFlowSessionsError.message },
      { status: 500 }
    );
  }

  if (fullChatSessionsError) {
    return NextResponse.json(
      { error: fullChatSessionsError.message },
      { status: 500 }
    );
  }

  const resumableFullChatSession = ((fullChatSessions ?? []) as ChatSessionRecord[]).find(
    (session) => isResumableFullChatSession(session)
  );
  const latestCoreFlowSession = ((coreFlowSessions ?? []) as ChatSessionRecord[])[0];

  return NextResponse.json({
    coreFlowSessionId: latestCoreFlowSession?.id ?? null,
    coreFlowUpdatedAt: latestCoreFlowSession?.updated_at ?? null,
    fullChatSessionId: resumableFullChatSession?.id ?? null,
    fullChatUpdatedAt: resumableFullChatSession?.updated_at ?? null,
  });
}
