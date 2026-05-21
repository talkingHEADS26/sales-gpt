import {
  buildStructuredSessionFeedback,
  extractBulletList,
  extractSection,
  type StructuredSessionFeedback,
} from "@/lib/session-feedback";

type SessionFlavor = {
  sessionTitle: string | null;
  sessionType:
    | "appointment_setting"
    | "complaint_management"
    | "full_sales"
    | "situation_coaching";
};

export type FullSalesKpiUpdate = {
  closing_probability_score?: number;
  customer_understanding_score?: number;
  emotionality_score?: number;
  feedback?: StructuredSessionFeedback;
  finalScore?: number;
  final_feedback?: string;
  improvements?: string[];
  is_sale?: boolean;
  module1Score?: number;
  module2Score?: number;
  module3Score?: number;
  needs_analysis_score?: number;
  next_focus?: string;
  objection_handling_score?: number;
  presentation_score?: number;
  sale_result?: "no_sale" | "sale";
  strengths?: string[];
};

const FULL_CHAT_TITLE = "__full_chat__";

function parsePercentValue(rawValue: string) {
  const normalizedValue = Number.parseFloat(rawValue.replace(",", "."));

  if (Number.isNaN(normalizedValue) || normalizedValue < 0 || normalizedValue > 100) {
    return null;
  }

  return normalizedValue;
}

function parseTenPointScore(rawValue: string) {
  const normalizedValue = Number.parseFloat(rawValue.replace(",", "."));

  if (Number.isNaN(normalizedValue) || normalizedValue < 0 || normalizedValue > 10) {
    return null;
  }

  return normalizedValue;
}

function convertTenPointScoreToPercent(score: number | null) {
  if (score === null) {
    return undefined;
  }

  return Number((score * 10).toFixed(2));
}

function extractClosingProbabilityPercent(text: string) {
  const scoreMatch = text.match(
    /abschlusswahrscheinlichkeit\s*:\s*(\d{1,3}(?:[.,]\d{1,2})?)\s*[%％]/iu
  );

  if (!scoreMatch) {
    return null;
  }

  return parsePercentValue(scoreMatch[1]);
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

function extractSaleResult(text: string) {
  const saleResultMatch = text.match(/sale_result\s*:\s*(sale|no_sale)\b/iu);

  if (saleResultMatch) {
    return saleResultMatch[1] as "no_sale" | "sale";
  }

  const readableResultMatch = text.match(
    /ergebnis\s*:\s*(verkauf erfolgreich abgeschlossen|kein abschluss erzielt)\b/iu
  );

  if (!readableResultMatch) {
    return null;
  }

  return readableResultMatch[1].toLowerCase().includes("erfolgreich")
    ? "sale"
    : "no_sale";
}

function detectModuleFromFullChatOutput(text: string) {
  const normalizedText = text.toLowerCase();

  if (
    normalizedText.includes("präsentation weitermachen") ||
    normalizedText.includes("praesentation weitermachen")
  ) {
    return 1;
  }

  if (normalizedText.includes("einwandbehandlung weitermachen")) {
    return 2;
  }

  if (
    normalizedText.includes("weitere einwände trainieren") ||
    normalizedText.includes("weitere einwaende trainieren") ||
    normalizedText.includes("zurück zur modulauswahl") ||
    normalizedText.includes("zurueck zur modulauswahl")
  ) {
    return 3;
  }

  return null;
}

function extractStructuredFullSalesFeedback(text: string): FullSalesKpiUpdate | null {
  const needsAnalysisScore = extractTenPointScore(text, "Bedarfsermittlung");
  const presentationScore = extractTenPointScore(text, "Pr(?:ae|ä)sentation");
  const objectionHandlingScore = extractTenPointScore(text, "Einwandbehandlung");
  const emotionalityScore = extractTenPointScore(text, "Emotionalit(?:aet|ät)");
  const customerUnderstandingScore = extractTenPointScore(
    text,
    "Kundenverst(?:aendnis|ändnis)"
  );
  const closingProbabilityScore = extractTenPointScore(
    text,
    "Abschlusswahrscheinlichkeit"
  );
  const saleResult = extractSaleResult(text);

  const hasStructuredScores = [
    needsAnalysisScore,
    presentationScore,
    objectionHandlingScore,
    emotionalityScore,
    customerUnderstandingScore,
    closingProbabilityScore,
    saleResult,
  ].some((score) => score !== null);

  if (!hasStructuredScores) {
    return null;
  }

  const shortSummary = extractSection(text, "Kurzfazit", [
    "Was war stark",
    "Was sollte verbessert werden",
    "Konkreter Fokus f(?:ue|ü)r das n(?:ae|ä)chste Training",
    "Outcome",
  ]);
  const strengthsSection = extractSection(text, "Was war stark", [
    "Was sollte verbessert werden",
    "Konkreter Fokus f(?:ue|ü)r das n(?:ae|ä)chste Training",
  ]);
  const improvementsSection = extractSection(text, "Was sollte verbessert werden", [
    "Konkreter Fokus f(?:ue|ü)r das n(?:ae|ä)chste Training",
  ]);
  const nextFocus = extractSection(
    text,
    "Konkreter Fokus f(?:ue|ü)r das n(?:ae|ä)chste Training",
    ["Outcome"]
  );
  const feedback = buildStructuredSessionFeedback({
    fallbackGeneralRecommendations: nextFocus ? [nextFocus] : [],
    fallbackNegativeBullets: extractBulletList(improvementsSection),
    fallbackNegativeSummary: shortSummary,
    fallbackOutcome:
      saleResult === "sale" ? "closed" : saleResult === "no_sale" ? "not_closed" : null,
    fallbackPositiveBullets: extractBulletList(strengthsSection),
    fallbackPositiveSummary: shortSummary,
    text,
  });

  return {
    closing_probability_score: closingProbabilityScore ?? undefined,
    customer_understanding_score: customerUnderstandingScore ?? undefined,
    emotionality_score: emotionalityScore ?? undefined,
    feedback: feedback ?? undefined,
    finalScore: convertTenPointScoreToPercent(closingProbabilityScore),
    final_feedback:
      feedback?.negative.summary ||
      feedback?.positive.summary ||
      shortSummary ||
      undefined,
    improvements:
      feedback?.negative.bullets.length
        ? feedback.negative.bullets
        : extractBulletList(improvementsSection),
    module1Score: convertTenPointScoreToPercent(needsAnalysisScore),
    module2Score: convertTenPointScoreToPercent(presentationScore),
    module3Score: convertTenPointScoreToPercent(objectionHandlingScore),
    needs_analysis_score: needsAnalysisScore ?? undefined,
    next_focus:
      feedback?.recommendations.specific[0] ??
      feedback?.recommendations.general[0] ??
      nextFocus ??
      undefined,
    objection_handling_score: objectionHandlingScore ?? undefined,
    presentation_score: presentationScore ?? undefined,
    is_sale: saleResult === null ? undefined : saleResult === "sale",
    sale_result: saleResult ?? undefined,
    strengths:
      feedback?.positive.bullets.length
        ? feedback.positive.bullets
        : extractBulletList(strengthsSection),
  };
}

export function extractKpiUpdateFromAssistantMessage(
  assistantMessage: string,
  session: SessionFlavor
): FullSalesKpiUpdate | null {
  if (session.sessionTitle === FULL_CHAT_TITLE) {
    const closingProbability = extractClosingProbabilityPercent(assistantMessage);

    if (closingProbability === null) {
      return null;
    }

    const moduleNumber = detectModuleFromFullChatOutput(assistantMessage);

    if (moduleNumber === 1) {
      return {
        module1Score: closingProbability,
      };
    }

    if (moduleNumber === 2) {
      return {
        module2Score: closingProbability,
      };
    }

    if (moduleNumber === 3) {
      return {
        finalScore: closingProbability,
        module3Score: closingProbability,
      };
    }

    return null;
  }

  if (session.sessionType !== "full_sales") {
    return null;
  }

  const structuredKpiUpdate = extractStructuredFullSalesFeedback(assistantMessage);

  if (structuredKpiUpdate) {
    return structuredKpiUpdate;
  }

  const legacyClosingProbability = extractClosingProbabilityPercent(assistantMessage);

  if (legacyClosingProbability === null) {
    return null;
  }

  const saleResult = extractSaleResult(assistantMessage);

  return {
    finalScore: legacyClosingProbability,
    is_sale: saleResult === null ? undefined : saleResult === "sale",
    sale_result: saleResult ?? undefined,
  };
}
