import {
  getRandomSessionDifficulty,
  type SessionDifficulty,
} from "@/lib/simulation-avatar";

export type { SessionDifficulty } from "@/lib/simulation-avatar";

export type AppointmentLeadSource =
  | "Webseite"
  | "Anzeige"
  | "Promo-Stand"
  | "Empfehlung";

export type ComplaintChannelOption =
  | "vor Ort"
  | "Telefon";

export const APPOINTMENT_LEAD_SOURCE_OPTIONS = [
  "Webseite",
  "Anzeige",
  "Promo-Stand",
  "Empfehlung",
] as const satisfies readonly AppointmentLeadSource[];

export const COMPLAINT_CHANNEL_OPTIONS = [
  "vor Ort",
  "Telefon",
] as const satisfies readonly ComplaintChannelOption[];

export function resolveAutomaticDifficulty(): SessionDifficulty {
  return getRandomSessionDifficulty();
}

export function isAppointmentLeadSource(
  value: unknown
): value is AppointmentLeadSource {
  return APPOINTMENT_LEAD_SOURCE_OPTIONS.includes(
    value as AppointmentLeadSource
  );
}

export function isComplaintChannelOption(
  value: unknown
): value is ComplaintChannelOption {
  return COMPLAINT_CHANNEL_OPTIONS.includes(value as ComplaintChannelOption);
}

export function mapDifficultyToComplaintIntensity(
  difficulty: SessionDifficulty
) {
  if (difficulty === "medium") {
    return "mittel" as const;
  }

  if (difficulty === "hard") {
    return "hart" as const;
  }

  if (difficulty === "almost_impossible") {
    return "fast unmoeglich" as const;
  }

  return "easy" as const;
}

export function formatDifficultyForPrompt(difficulty: SessionDifficulty) {
  return difficulty;
}
