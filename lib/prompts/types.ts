import type { IndustryKey } from "@/lib/industries";
import type { FullSalesAvatarCandidate } from "@/lib/full-sales-avatar";

export type PromptFlow =
  | "appointment_setting"
  | "complaint_management"
  | "free_chat"
  | "full_sales"
  | "situation_coaching";

export type IndustryPromptConfig = {
  blocks: {
    appointmentSetting: string;
    complaintManagement: string;
    freeChat: string;
    fullSales: string;
    shared: string;
    situationCoaching: string;
  };
  industryKey: IndustryKey;
  openings: {
    appointmentSetting: string;
    complaintManagement: string;
    freeChat: string;
    fullSales: readonly FullSalesAvatarCandidate[];
    situationCoaching: string;
  };
};
