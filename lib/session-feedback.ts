export type StructuredSessionFeedback = {
  outcome: string;
  positive: {
    bullets: string[];
    summary: string;
  };
  negative: {
    bullets: string[];
    summary: string;
  };
  recommendations: {
    specific: string[];
    general: string[];
  };
};

function normalizeWhitespace(value: string) {
  return value.replace(/\r/g, "").trim();
}

export function extractSection(
  text: string,
  headingPattern: string,
  nextHeadingPatterns: string[]
) {
  const nextPattern =
    nextHeadingPatterns.length > 0
      ? `(?=\\n(?:${nextHeadingPatterns.join("|")})\\s*:)`
      : "$";
  const sectionMatch = text.match(
    new RegExp(`${headingPattern}\\s*:\\s*\\n?([\\s\\S]*?)${nextPattern}`, "iu")
  );

  if (!sectionMatch) {
    return "";
  }

  return normalizeWhitespace(sectionMatch[1]);
}

export function extractBulletList(sectionText: string) {
  return sectionText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.replace(/^[-•]\s*/, "").trim())
    .filter((line) => line.length > 0);
}

export function extractOutcome(text: string) {
  const outcomeMatch = text.match(/outcome\s*:\s*([a-z_]+)\b/iu);

  return outcomeMatch ? outcomeMatch[1].toLowerCase() : null;
}

export function buildStructuredSessionFeedback(params: {
  fallbackGeneralRecommendations?: string[];
  fallbackNegativeBullets?: string[];
  fallbackNegativeSummary?: string;
  fallbackOutcome?: string | null;
  fallbackPositiveBullets?: string[];
  fallbackPositiveSummary?: string;
  fallbackSpecificRecommendations?: string[];
  text: string;
}): StructuredSessionFeedback | null {
  const {
    fallbackGeneralRecommendations = [],
    fallbackNegativeBullets = [],
    fallbackNegativeSummary = "",
    fallbackOutcome = null,
    fallbackPositiveBullets = [],
    fallbackPositiveSummary = "",
    fallbackSpecificRecommendations = [],
    text,
  } = params;

  const outcome = extractOutcome(text) ?? fallbackOutcome;
  const positiveSummary =
    extractSection(text, "Positive Summary", [
      "Was war positiv",
      "Negative Summary",
      "Was ist nicht gut gelaufen",
      "Spezifische Empfehlungen",
      "Allgemeine Empfehlungen",
    ]) || fallbackPositiveSummary;
  const parsedPositiveBullets = extractBulletList(
    extractSection(text, "Was war positiv", [
      "Negative Summary",
      "Was ist nicht gut gelaufen",
      "Spezifische Empfehlungen",
      "Allgemeine Empfehlungen",
    ])
  );
  const positiveBullets =
    parsedPositiveBullets.length > 0 ? parsedPositiveBullets : fallbackPositiveBullets;
  const negativeSummary =
    extractSection(text, "Negative Summary", [
      "Was ist nicht gut gelaufen",
      "Spezifische Empfehlungen",
      "Allgemeine Empfehlungen",
    ]) || fallbackNegativeSummary;
  const parsedNegativeBullets = extractBulletList(
    extractSection(text, "Was ist nicht gut gelaufen", [
      "Spezifische Empfehlungen",
      "Allgemeine Empfehlungen",
    ])
  );
  const negativeBullets =
    parsedNegativeBullets.length > 0 ? parsedNegativeBullets : fallbackNegativeBullets;
  const parsedSpecificRecommendations = extractBulletList(
    extractSection(text, "Spezifische Empfehlungen", [
      "Allgemeine Empfehlungen",
    ])
  );
  const specificRecommendations =
    parsedSpecificRecommendations.length > 0
      ? parsedSpecificRecommendations
      : fallbackSpecificRecommendations;
  const parsedGeneralRecommendations = extractBulletList(
    extractSection(text, "Allgemeine Empfehlungen", [])
  );
  const generalRecommendations =
    parsedGeneralRecommendations.length > 0
      ? parsedGeneralRecommendations
      : fallbackGeneralRecommendations;

  const hasEnoughContent =
    Boolean(outcome) &&
    (positiveSummary.length > 0 ||
      positiveBullets.length > 0 ||
      negativeSummary.length > 0 ||
      negativeBullets.length > 0 ||
      specificRecommendations.length > 0 ||
      generalRecommendations.length > 0);

  if (!hasEnoughContent || !outcome) {
    return null;
  }

  return {
    outcome,
    positive: {
      bullets: positiveBullets.slice(0, 5),
      summary: positiveSummary,
    },
    negative: {
      bullets: negativeBullets.slice(0, 5),
      summary: negativeSummary,
    },
    recommendations: {
      specific: specificRecommendations.slice(0, 5),
      general: generalRecommendations.slice(0, 5),
    },
  };
}

export function parseStructuredSessionFeedback(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<StructuredSessionFeedback>;

  if (
    typeof candidate.outcome !== "string" ||
    !candidate.positive ||
    !candidate.negative ||
    !candidate.recommendations
  ) {
    return null;
  }

  return {
    outcome: candidate.outcome,
    positive: {
      bullets: Array.isArray(candidate.positive.bullets)
        ? candidate.positive.bullets.filter(
            (entry): entry is string => typeof entry === "string"
          )
        : [],
      summary:
        typeof candidate.positive.summary === "string"
          ? candidate.positive.summary
          : "",
    },
    negative: {
      bullets: Array.isArray(candidate.negative.bullets)
        ? candidate.negative.bullets.filter(
            (entry): entry is string => typeof entry === "string"
          )
        : [],
      summary:
        typeof candidate.negative.summary === "string"
          ? candidate.negative.summary
          : "",
    },
    recommendations: {
      specific: Array.isArray(candidate.recommendations.specific)
        ? candidate.recommendations.specific.filter(
            (entry): entry is string => typeof entry === "string"
          )
        : [],
      general: Array.isArray(candidate.recommendations.general)
        ? candidate.recommendations.general.filter(
            (entry): entry is string => typeof entry === "string"
          )
        : [],
    },
  } satisfies StructuredSessionFeedback;
}
