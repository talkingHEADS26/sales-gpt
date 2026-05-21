export const FULL_CHAT_TITLE = "__full_chat__";

export type StoredSessionType =
  | "appointment_setting"
  | "complaint_management"
  | "full_sales"
  | "situation_coaching";
export type ResolvedSessionFlow = "appointment_setting" | "free_chat" | StoredSessionType;

type ChatSessionLike = {
  session_type: StoredSessionType;
  status: string;
  title: string | null;
};

export function isFullChatTitle(title: string | null | undefined) {
  return title === FULL_CHAT_TITLE;
}

export function isResumableSessionStatus(status: string) {
  return status !== "completed" && status !== "archived";
}

export function isResumableFullChatSession(session: ChatSessionLike) {
  return (
    session.session_type === "situation_coaching" &&
    isFullChatTitle(session.title) &&
    isResumableSessionStatus(session.status)
  );
}

export function isCompletedFullSalesConversation(
  session: Pick<ChatSessionLike, "session_type" | "title">,
  assistantMessage: string
) {
  if (session.session_type !== "full_sales" || isFullChatTitle(session.title)) {
    return false;
  }

  return assistantMessage.includes("Abschlusswahrscheinlichkeit:");
}

export function isCompletedAppointmentSettingConversation(
  session: Pick<ChatSessionLike, "session_type">,
  assistantMessage: string
) {
  if (session.session_type !== "appointment_setting") {
    return false;
  }

  return (
    assistantMessage.includes("APPOINTMENT_RESULT:") ||
    assistantMessage.includes("Ergebnis: Termin erfolgreich vereinbart") ||
    assistantMessage.includes("Ergebnis: Kein Termin vereinbart")
  );
}

export function isCompletedComplaintManagementConversation(
  session: Pick<ChatSessionLike, "session_type">,
  assistantMessage: string
) {
  if (session.session_type !== "complaint_management") {
    return false;
  }

  return (
    (assistantMessage.includes("COMPLAINT_RESULT:") &&
      assistantMessage.includes("CUSTOMER_HAPPY:")) ||
    ((assistantMessage.includes("Ergebnis: Beschwerde erfolgreich gelöst") ||
      assistantMessage.includes("Ergebnis: Beschwerde nicht gelöst")) &&
      (assistantMessage.includes("Kundenzufriedenheit: Kunde am Ende zufrieden") ||
        assistantMessage.includes(
          "Kundenzufriedenheit: Kunde am Ende nicht zufrieden"
        )))
  );
}

export function resolveSessionFlow(
  sessionType: StoredSessionType,
  title?: string | null
): ResolvedSessionFlow {
  if (isFullChatTitle(title)) {
    return "free_chat";
  }

  return sessionType;
}
