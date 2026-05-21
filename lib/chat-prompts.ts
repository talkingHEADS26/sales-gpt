import type { AppointmentAvatarPromptContext } from "@/lib/appointment-setting-avatar";
import { buildAppointmentAvatarPrompt } from "@/lib/appointment-setting-avatar";
import type { FranchiseVerticalKey, IndustryKey } from "@/lib/industries";
import type { ComplaintAvatarPromptContext } from "@/lib/complaint-avatar";
import { buildComplaintAvatarPrompt } from "@/lib/complaint-avatar";
import type { FullSalesAvatarPromptContext } from "@/lib/full-sales-avatar";
import { buildFullSalesAvatarPrompt } from "@/lib/full-sales-avatar";
import { resolveSessionFlow, type StoredSessionType } from "@/lib/chat-session";
import { BASE_APPOINTMENT_SETTING_PROMPT } from "@/lib/prompts/base/appointment-setting";
import { BASE_COMPLAINT_MANAGEMENT_PROMPT } from "@/lib/prompts/base/complaint-management";
import { BASE_FREE_CHAT_PROMPT } from "@/lib/prompts/base/free-chat";
import { BASE_FULL_SALES_PROMPT } from "@/lib/prompts/base/full-sales";
import { BASE_SHARED_PROMPT } from "@/lib/prompts/base/shared";
import { BASE_SITUATION_COACHING_PROMPT } from "@/lib/prompts/base/situation-coaching";
import { getIndustryPromptConfig } from "@/lib/prompts/industries";

type GetSystemPromptParams = {
  appointmentAvatarContext?: AppointmentAvatarPromptContext | null;
  complaintAvatarContext?: ComplaintAvatarPromptContext | null;
  fullSalesAvatarContext?: FullSalesAvatarPromptContext | null;
  franchiseVertical: FranchiseVerticalKey;
  industryKey: IndustryKey;
  sessionId?: string;
  sessionTitle?: string | null;
  sessionType: StoredSessionType;
};

function getIndustryAppointmentContextLabel(industryKey: IndustryKey) {
  switch (industryKey) {
    case "energy":
      return "Energieberatung / Energievertrieb";
    case "finance":
      return "Finanzberatung / Vorsorge / Absicherung";
    case "franchise":
      return "Franchise-Beratung / Partnergewinnung";
    case "fitness":
    default:
      return "Fitness / Boutique Studio";
  }
}

function getFranchiseVerticalOverlay(vertical: FranchiseVerticalKey) {
  switch (vertical) {
    case "restaurant":
      return "Franchise-Subbranche: Restaurant/Gastronomie. Fokus auf Wareneinsatz, Personal, Schichtfähigkeit, Standortfrequenz, Hygiene-/Prozessstandards und Margenstabilität.";
    case "fashion":
      return "Franchise-Subbranche: Bekleidung/Fashion. Fokus auf Sortimentssteuerung, Saisonabhängigkeit, Retourenquote, Flächenproduktivität und Warenrotation.";
    case "fitness":
      return "Franchise-Subbranche: Gym/Fitness. Fokus auf Mitgliedergewinnung/-bindung, Auslastung, Trainerqualität, Preis-/Leistungsempfinden und Churn.";
    case "beauty":
      return "Franchise-Subbranche: Beauty. Fokus auf Terminquote, Auslastung, Wiederbuchung, Servicequalität und Personalqualifikation.";
    case "retail":
      return "Franchise-Subbranche: Retail/Handel. Fokus auf Frequenz, Conversion, Warenverfügbarkeit, Retouren, Flächenrentabilität.";
    case "services":
      return "Franchise-Subbranche: Dienstleistung. Fokus auf Terminpipeline, Service-Qualität, Kapazitätsplanung, Wiederkaufrate und Bewertungsmanagement.";
    case "other":
    default:
      return "Franchise-Subbranche: Sonstiges. Fokus auf belastbare Standortlogik, operative Umsetzbarkeit, Kostenstruktur und skalierbare Prozesse.";
  }
}

function normalizeAppointmentSettingBlockForIndustry(
  block: string,
  industryKey: IndustryKey
) {
  if (industryKey === "fitness") {
    return block;
  }

  const contextLabel = getIndustryAppointmentContextLabel(industryKey);

  return block
    .replace(
      /Telefontraining in Studio-\/Lead-Setting:/giu,
      `Telefontraining in ${contextLabel}:`
    )
    .replace(
      /Dieses Modul bleibt bewusst ein Fitness-\/Boutique-Studio-Terminsetting-Call\./giu,
      "Dieses Modul bleibt bewusst ein branchenspezifischer Terminsetting-Call."
    )
    .replace(
      /optional mit Probetraining/giu,
      "optional mit branchenspezifischem Erstgespräch"
    )
    .replace(
      /Keine studio-spezifischen USPs voraussetzen\./giu,
      "Keine studio-spezifischen oder branchenfremden USPs voraussetzen."
    );
}

function normalizeComplaintManagementBlockForIndustry(
  block: string,
  industryKey: IndustryKey
) {
  if (industryKey === "fitness") {
    return block;
  }

  const contextLabel = getIndustryAppointmentContextLabel(industryKey);

  return block
    .replace(
      /Beschwerdemanagement in Studio-\/Lead-Setting:/giu,
      `Beschwerdemanagement in ${contextLabel}:`
    )
    .replace(
      /Dieses Modul bleibt bewusst ein Fitness-\/Boutique-Studio-Beschwerdegespräch\./giu,
      "Dieses Modul bleibt bewusst ein branchenspezifisches Beschwerdegespräch."
    )
    .replace(/im Studioalltag/giu, "im jeweiligen Branchenalltag");
}

export function getSystemPrompt({
  appointmentAvatarContext,
  complaintAvatarContext,
  fullSalesAvatarContext,
  franchiseVertical,
  industryKey,
  sessionTitle,
  sessionType,
}: GetSystemPromptParams) {
  const flow = resolveSessionFlow(sessionType, sessionTitle);
  const industryConfig = getIndustryPromptConfig(industryKey);

  const promptParts = [BASE_SHARED_PROMPT, industryConfig.blocks.shared];
  if (industryKey === "franchise") {
    promptParts.push(getFranchiseVerticalOverlay(franchiseVertical));
  }

  switch (flow) {
    case "appointment_setting":
      promptParts.push(
        BASE_APPOINTMENT_SETTING_PROMPT,
        normalizeAppointmentSettingBlockForIndustry(
          industryConfig.blocks.appointmentSetting,
          industryKey
        )
      );
      if (appointmentAvatarContext) {
        promptParts.push(buildAppointmentAvatarPrompt(appointmentAvatarContext));
      }
      break;
    case "complaint_management":
      promptParts.push(
        BASE_COMPLAINT_MANAGEMENT_PROMPT,
        normalizeComplaintManagementBlockForIndustry(
          industryConfig.blocks.complaintManagement,
          industryKey
        )
      );
      if (complaintAvatarContext) {
        promptParts.push(buildComplaintAvatarPrompt(complaintAvatarContext));
      }
      break;
    case "free_chat":
      promptParts.push(BASE_FREE_CHAT_PROMPT, industryConfig.blocks.freeChat);
      break;
    case "full_sales":
      promptParts.push(BASE_FULL_SALES_PROMPT, industryConfig.blocks.fullSales);
      if (fullSalesAvatarContext) {
        promptParts.push(buildFullSalesAvatarPrompt(fullSalesAvatarContext));
      }
      break;
    case "situation_coaching":
    default:
      promptParts.push(
        BASE_SITUATION_COACHING_PROMPT,
        industryConfig.blocks.situationCoaching
      );
      break;
  }

  return promptParts.join("\n\n");
}
