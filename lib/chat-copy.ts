import type { IndustryKey } from "@/lib/industries";
import { DEFAULT_INDUSTRY_KEY } from "@/lib/industries";
import type { FullSalesAvatarCandidate } from "@/lib/full-sales-avatar";
import {
  resolveSessionFlow,
  type StoredSessionType,
} from "@/lib/chat-session";
import { getIndustryPromptConfig } from "@/lib/prompts/industries";

function getRandomItem<T>(items: readonly T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

export function getSessionModeLabel(
  sessionType: StoredSessionType,
  title?: string | null
) {
  const flow = resolveSessionFlow(sessionType, title);

  switch (flow) {
    case "appointment_setting":
      return "Telefontraining / Terminsetting";
    case "complaint_management":
      return "Beschwerdemanager";
    case "free_chat":
      return "Full Chat";
    case "full_sales":
      return "Komplettes Verkaufsgespräch";
    case "situation_coaching":
      return "Situationscoaching";
    default:
      return sessionType;
  }
}

export function formatConversationStatus(status: string) {
  if (status === "active") {
    return "Aktiv";
  }

  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

type GetWelcomeMessageParams = {
  fullSalesAvatar?: FullSalesAvatarCandidate;
  industryKey?: IndustryKey;
  sessionTitle?: string | null;
  sessionType: StoredSessionType;
};

export function getWelcomeMessage({
  fullSalesAvatar,
  industryKey = DEFAULT_INDUSTRY_KEY,
  sessionTitle,
  sessionType,
}: GetWelcomeMessageParams) {
  const flow = resolveSessionFlow(sessionType, sessionTitle);
  const industryConfig = getIndustryPromptConfig(industryKey);

  switch (flow) {
    case "appointment_setting":
      return "Hallo, ich hatte mich vor kurzem eingetragen und wollte kurz verstehen, worum es bei dem Termin genau geht.";
    case "complaint_management":
      return "Guten Tag. Ich habe ein Anliegen, das ich jetzt gern einmal sauber klären möchte.";
    case "free_chat":
      return industryConfig.openings.freeChat;
    case "full_sales":
      return fullSalesAvatar?.openingMessage ??
        getRandomItem(industryConfig.openings.fullSales).openingMessage;
    case "situation_coaching":
      return industryConfig.openings.situationCoaching;
    default:
      return "";
  }
}
