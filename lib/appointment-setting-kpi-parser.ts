import {
  buildStructuredSessionFeedback,
  extractBulletList,
  extractSection,
  type StructuredSessionFeedback,
} from "@/lib/session-feedback";

type AppointmentSettingSessionFlavor = {
  sessionType:
    | "appointment_setting"
    | "complaint_management"
    | "full_sales"
    | "situation_coaching";
};

export type AppointmentSettingKpiUpdate = {
  appointment_probability?: number;
  appointment_result?: "appointment" | "no_appointment";
  benefit_score?: number;
  closing_score?: number;
  feedback?: StructuredSessionFeedback;
  final_feedback?: string;
  improvements?: string[];
  is_appointment?: boolean;
  need_score?: number;
  next_focus?: string;
  objection_score?: number;
  opening_score?: number;
  permission_score?: number;
  rationale?: string;
  strengths?: string[];
};

function parseTenPointScore(rawValue: string) {
  const normalizedValue = Number.parseFloat(rawValue.replace(",", "."));

  if (Number.isNaN(normalizedValue) || normalizedValue < 0 || normalizedValue > 10) {
    return null;
  }

  return normalizedValue;
}

function parsePercentValue(rawValue: string) {
  const normalizedValue = Number.parseFloat(rawValue.replace(",", "."));

  if (Number.isNaN(normalizedValue) || normalizedValue < 0 || normalizedValue > 100) {
    return null;
  }

  return normalizedValue;
}

function extractTenPointScore(text: string, labelPattern: string) {
  const scoreMatch = text.match(
    new RegExp(
      `${labelPattern}\\s*:\\s*(\\d{1,2}(?:[.,]\\d{1,2})?)\\s*/\\s*10`,
      "iu"
    )
  );

  if (!scoreMatch) {
    return null;
  }

  return parseTenPointScore(scoreMatch[1]);
}

export function extractAppointmentSettingKpiUpdateFromAssistantMessage(
  assistantMessage: string,
  session: AppointmentSettingSessionFlavor
): AppointmentSettingKpiUpdate | null {
  if (session.sessionType !== "appointment_setting") {
    return null;
  }

  const openingScore = extractTenPointScore(
    assistantMessage,
    "Gespr(?:ae|ä)chser(?:oe|ö)ffnung"
  );
  const permissionScore = extractTenPointScore(assistantMessage, "Kontext / Permission");
  const needScore = extractTenPointScore(
    assistantMessage,
    "Bedarf / Interesse erkannt"
  );
  const benefitScore = extractTenPointScore(
    assistantMessage,
    "Nutzen des Termins erkl(?:ae|ä)rt"
  );
  const objectionScore = extractTenPointScore(assistantMessage, "Einwandbehandlung");
  const closingScore = extractTenPointScore(
    assistantMessage,
    "Verbindlichkeit im Abschluss"
  );

  const probabilityMatch = assistantMessage.match(
    /terminwahrscheinlichkeit\s*:\s*(\d{1,3}(?:[.,]\d{1,2})?)\s*[%％]/iu
  );
  const appointmentProbability = probabilityMatch
    ? parsePercentValue(probabilityMatch[1])
    : null;
  const appointmentResultMatch = assistantMessage.match(
    /appointment_result\s*:\s*(appointment|no_appointment)\b/iu
  );
  const readableAppointmentResultMatch = assistantMessage.match(
    /ergebnis\s*:\s*(termin erfolgreich vereinbart|kein termin vereinbart)\b/iu
  );
  const appointmentResult = appointmentResultMatch
    ? (appointmentResultMatch[1] as "appointment" | "no_appointment")
    : readableAppointmentResultMatch
      ? readableAppointmentResultMatch[1].toLowerCase().includes("erfolgreich")
        ? "appointment"
        : "no_appointment"
    : null;

  const hasStructuredOutput = [
    openingScore,
    permissionScore,
    needScore,
    benefitScore,
    objectionScore,
    closingScore,
    appointmentProbability,
    appointmentResult,
  ].some((value) => value !== null);

  if (!hasStructuredOutput) {
    return null;
  }

  const rationale = extractSection(assistantMessage, "Begr(?:ue|ü)ndung", [
    "Kurzfazit",
  ]);
  const shortSummary = extractSection(assistantMessage, "Kurzfazit", [
    "Was war stark",
    "Was sollte verbessert werden",
    "Konkreter Fokus f(?:ue|ü)r das n(?:ae|ä)chste Training",
    "Outcome",
  ]);
  const strengthsSection = extractSection(assistantMessage, "Was war stark", [
    "Was sollte verbessert werden",
    "Konkreter Fokus f(?:ue|ü)r das n(?:ae|ä)chste Training",
  ]);
  const improvementsSection = extractSection(
    assistantMessage,
    "Was sollte verbessert werden",
    ["Konkreter Fokus f(?:ue|ü)r das n(?:ae|ä)chste Training"]
  );
  const nextFocus = extractSection(
    assistantMessage,
    "Konkreter Fokus f(?:ue|ü)r das n(?:ae|ä)chste Training",
    ["Outcome"]
  );
  const feedback = buildStructuredSessionFeedback({
    fallbackGeneralRecommendations: nextFocus ? [nextFocus] : [],
    fallbackNegativeBullets: extractBulletList(improvementsSection),
    fallbackNegativeSummary: shortSummary,
    fallbackOutcome:
      appointmentResult === "appointment"
        ? "appointment_booked"
        : appointmentResult === "no_appointment"
          ? "no_appointment"
          : null,
    fallbackPositiveBullets: extractBulletList(strengthsSection),
    fallbackPositiveSummary: rationale || shortSummary,
    text: assistantMessage,
  });

  return {
    appointment_probability: appointmentProbability ?? undefined,
    appointment_result: appointmentResult ?? undefined,
    benefit_score: benefitScore ?? undefined,
    closing_score: closingScore ?? undefined,
    feedback: feedback ?? undefined,
    final_feedback:
      feedback?.negative.summary ||
      feedback?.positive.summary ||
      shortSummary ||
      undefined,
    improvements:
      feedback?.negative.bullets.length
        ? feedback.negative.bullets
        : extractBulletList(improvementsSection),
    is_appointment:
      appointmentResult === null ? undefined : appointmentResult === "appointment",
    need_score: needScore ?? undefined,
    next_focus:
      feedback?.recommendations.specific[0] ??
      feedback?.recommendations.general[0] ??
      nextFocus ??
      undefined,
    objection_score: objectionScore ?? undefined,
    opening_score: openingScore ?? undefined,
    permission_score: permissionScore ?? undefined,
    rationale: rationale || undefined,
    strengths:
      feedback?.positive.bullets.length
        ? feedback.positive.bullets
        : extractBulletList(strengthsSection),
  };
}
