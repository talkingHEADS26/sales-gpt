import {
  buildStructuredSessionFeedback,
  extractBulletList,
  extractSection,
  type StructuredSessionFeedback,
} from "@/lib/session-feedback";

type ComplaintManagementSessionFlavor = {
  sessionType:
    | "appointment_setting"
    | "complaint_management"
    | "full_sales"
    | "situation_coaching";
};

export type ComplaintManagementKpiUpdate = {
  complaint_result?: "resolved" | "unresolved";
  complaint_understanding_score?: number;
  customer_happy?: "no" | "yes";
  empathy_deescalation_score?: number;
  feedback?: StructuredSessionFeedback;
  final_feedback?: string;
  improvements?: string[];
  is_customer_happy?: boolean;
  is_resolved?: boolean;
  next_focus?: string;
  opening_score?: number;
  rationale?: string;
  resolution_probability?: number;
  resolution_clarity_score?: number;
  resolution_orientation_score?: number;
  responsibility_clarity_score?: number;
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

export function extractComplaintManagementKpiUpdateFromAssistantMessage(
  assistantMessage: string,
  session: ComplaintManagementSessionFlavor
): ComplaintManagementKpiUpdate | null {
  if (session.sessionType !== "complaint_management") {
    return null;
  }

  const openingScore = extractTenPointScore(
    assistantMessage,
    "Gespr(?:ae|ä)chser(?:oe|ö)ffnung"
  );
  const empathyScore = extractTenPointScore(
    assistantMessage,
    "Empathie\\s*/\\s*Deeskalation"
  );
  const understandingScore = extractTenPointScore(
    assistantMessage,
    "Beschwerdeverst(?:ae|ä)ndnis"
  );
  const responsibilityScore = extractTenPointScore(
    assistantMessage,
    "Verantwortung\\s*/\\s*Klarheit"
  );
  const solutionScore = extractTenPointScore(
    assistantMessage,
    "L(?:oe|ö)sungsorientierung"
  );
  const closingScore = extractTenPointScore(
    assistantMessage,
    "Verbindlichkeit im Abschluss"
  );
  const probabilityMatch = assistantMessage.match(
    /beschwerdel(?:oe|ö)sungswahrscheinlichkeit\s*:\s*(\d{1,3}(?:[.,]\d{1,2})?)\s*[%％]/iu
  );
  const resolutionProbability = probabilityMatch
    ? parsePercentValue(probabilityMatch[1])
    : null;
  const complaintResultMatch = assistantMessage.match(
    /complaint_result\s*:\s*(resolved|unresolved)\b/iu
  );
  const customerHappyMatch = assistantMessage.match(
    /customer_happy\s*:\s*(yes|no)\b/iu
  );
  const readableComplaintResultMatch = assistantMessage.match(
    /ergebnis\s*:\s*(beschwerde erfolgreich gel(?:oe|ö)st|beschwerde nicht gel(?:oe|ö)st)\b/iu
  );
  const readableCustomerHappyMatch = assistantMessage.match(
    /kundenzufriedenheit\s*:\s*(kunde am ende zufrieden|kunde am ende nicht zufrieden)\b/iu
  );

  const complaintResult = complaintResultMatch
    ? (complaintResultMatch[1].toLowerCase() as "resolved" | "unresolved")
    : readableComplaintResultMatch
      ? readableComplaintResultMatch[1].toLowerCase().includes("nicht")
        ? "unresolved"
        : "resolved"
    : null;
  const customerHappy = customerHappyMatch
    ? (customerHappyMatch[1].toLowerCase() as "yes" | "no")
    : readableCustomerHappyMatch
      ? readableCustomerHappyMatch[1].toLowerCase().includes("nicht")
        ? "no"
        : "yes"
    : null;

  const hasStructuredOutput = [
    openingScore,
    empathyScore,
    understandingScore,
    responsibilityScore,
    solutionScore,
    closingScore,
    resolutionProbability,
    complaintResult,
    customerHappy,
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
      complaintResult === "resolved"
        ? "resolved"
        : complaintResult === "unresolved"
          ? "not_resolved"
          : null,
    fallbackPositiveBullets: extractBulletList(strengthsSection),
    fallbackPositiveSummary: rationale || shortSummary,
    text: assistantMessage,
  });

  return {
    complaint_result: complaintResult ?? undefined,
    complaint_understanding_score: understandingScore ?? undefined,
    customer_happy: customerHappy ?? undefined,
    empathy_deescalation_score: empathyScore ?? undefined,
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
    is_customer_happy:
      customerHappy === null ? undefined : customerHappy === "yes",
    is_resolved:
      complaintResult === null ? undefined : complaintResult === "resolved",
    next_focus:
      feedback?.recommendations.specific[0] ??
      feedback?.recommendations.general[0] ??
      nextFocus ??
      undefined,
    opening_score: openingScore ?? undefined,
    rationale: rationale || undefined,
    resolution_probability: resolutionProbability ?? undefined,
    resolution_clarity_score: closingScore ?? undefined,
    resolution_orientation_score: solutionScore ?? undefined,
    responsibility_clarity_score: responsibilityScore ?? undefined,
    strengths:
      feedback?.positive.bullets.length
        ? feedback.positive.bullets
        : extractBulletList(strengthsSection),
  };
}
