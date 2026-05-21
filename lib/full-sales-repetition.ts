type ChatMessageLike = {
  content: string;
  sender_type: "assistant" | "system" | "user";
};

export type FullSalesObjectionCategory = "motivation_uncertainty";

export type FullSalesRepetitionDetectionResult = {
  objectionCategory: FullSalesObjectionCategory;
  repetitionCount: number;
  escalationLevel: 0 | 1 | 2 | 3 | 4;
  reactionHint: string | null;
};

type ObjectionPatternGroup = {
  category: FullSalesObjectionCategory;
  patterns: RegExp[];
};

const MAX_RECENT_ASSISTANT_MESSAGES = 6;

const MOTIVATION_UNCERTAINTY_PATTERNS: RegExp[] = [
  /\bich\s+weiss\s+nicht,\s*ob\s+ich\s+das\s+durchhalte\b/u,
  /\bich\s+bin\s+unsicher\b/u,
  /\bich\s+habe\s+angst,\s*dass\s+ich\s+scheitere\b/u,
  /\bich\s+brauche\s+unterstuetzung\b/u,
  /\bich\s+will\s+nicht\s+wieder\s+enttaeuscht\s+werden\b/u,
  /\bich\s+weiss\s+nicht,\s*ob\s+ich\s+motiviert\s+bleibe\b/u,
  /\bich\s+habe\s+sorge,\s*dass\s+ich\s+es\s+nicht\s+konsequent\s+umsetze\b/u,
  /\bich\s+bin\s+nicht\s+ueberzeugt\b/u,
  /\bich\s+weiss\s+nicht,\s*ob\s+ich\s+bereit\s+bin\b/u,
  /\bich\s+weiss\s+nicht,\s*ob\s+ich\s+das\s+wirklich\s+durchziehe\b/u,
  /\bich\s+weiss\s+nicht,\s*ob\s+ich\s+dranbleibe\b/u,
  /\bich\s+bin\s+mir\s+nicht\s+sicher,\s*ob\s+ich\s+das\s+schaffe\b/u,
  /\bich\s+habe\s+angst,\s*dass\s+ich\s+es\s+wieder\s+abbr(?:eche|echen)\b/u,
  /\bich\s+habe\s+zweifel,\s*ob\s+ich\s+das\s+durchziehe\b/u,
  /\bich\s+bin\s+ehrlich\s+gesagt\s+noch\s+nicht\s+ueberzeugt\b/u,
];

const OBJECTION_PATTERN_GROUPS: ObjectionPatternGroup[] = [
  {
    category: "motivation_uncertainty",
    patterns: MOTIVATION_UNCERTAINTY_PATTERNS,
  },
];

const GENERIC_TRAINER_PATTERNS: RegExp[] = [
  /\bdu\s+schaffst\s+das\s+schon\b/u,
  /\bkein\s+problem\b/u,
  /\bmach\s+dir\s+keine\s+sorgen\b/u,
  /\bdas\s+kriegen\s+wir\s+hin\b/u,
  /\bvertrau\s+mir\b/u,
  /\bdu\s+musst\s+einfach\b/u,
  /\balle?\s+schaffen\s+das\b/u,
  /\bdafuer\s+sind\s+wir\s+da\b/u,
];

const CONCRETE_TRAINER_MARKERS = [
  "ablauf",
  "alltag",
  "beispiel",
  "begleiten",
  "gemeinsam",
  "genau",
  "konkret",
  "plan",
  "routine",
  "schritt",
  "schritte",
  "umsetzen",
  "unterstuetzung",
];

function normalizeForHeuristics(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9?]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function detectObjectionCategory(message: string) {
  const normalizedMessage = normalizeForHeuristics(message);

  if (!normalizedMessage) {
    return null;
  }

  for (const group of OBJECTION_PATTERN_GROUPS) {
    if (group.patterns.some((pattern) => pattern.test(normalizedMessage))) {
      return group.category;
    }
  }

  return null;
}

function assessTrainerResolutionQuality(
  trainerMessage: string,
  bullshitBingoDetected: boolean
) {
  const normalizedMessage = normalizeForHeuristics(trainerMessage);

  if (!normalizedMessage) {
    return "weak";
  }

  if (
    bullshitBingoDetected ||
    GENERIC_TRAINER_PATTERNS.some((pattern) => pattern.test(normalizedMessage))
  ) {
    return "weak";
  }

  const markerCount = CONCRETE_TRAINER_MARKERS.filter((marker) =>
    normalizedMessage.includes(marker)
  ).length;
  const hasNumber = /\b\d+\b/u.test(normalizedMessage);
  const hasQuestion = normalizedMessage.includes("?");
  const isLongEnough = normalizedMessage.length >= 140;

  if (
    markerCount >= 3 ||
    (markerCount >= 2 && (hasQuestion || hasNumber)) ||
    (isLongEnough && markerCount >= 2)
  ) {
    return "strong";
  }

  if (markerCount >= 1 || (isLongEnough && hasQuestion) || hasNumber) {
    return "mixed";
  }

  return "weak";
}

function buildReactionHint(
  escalationLevel: 1 | 2 | 3 | 4,
  repetitionCount: number,
  bullshitBingoDetected: boolean
) {
  const combinedFrictionHint = bullshitBingoDetected
    ? "Zusätzlich hat der Trainer gerade generisch oder austauschbar geklungen, deshalb kippt die Stimmung etwas schneller."
    : "";

  switch (escalationLevel) {
    case 1:
      return [
        `Der Kunde hat den Kerneinwand bereits ${repetitionCount}x geäußert und bleibt offen, aber skeptisch.`,
        "Bleibe in Rolle und antworte natürlich mit vorsichtiger Unsicherheit statt mit neuer Offenheit.",
        'Gute Richtung: \"Ich verstehe, was du meinst, aber ich bin da noch nicht ganz sicher.\"',
        combinedFrictionHint,
      ]
        .filter(Boolean)
        .join(" ");
    case 2:
      return [
        `Der gleiche Kerneinwand kam bereits ${repetitionCount}x auf und der Kunde merkt ein Wiederholungsgefühl.`,
        "Reagiere spürbar skeptischer und lass anklingen, dass sich das Gespräch etwas im Kreis dreht, ohne den Trainer direkt zu bewerten.",
        'Gute Richtung: \"Ich habe das Gefühl, wir drehen uns gerade etwas im Kreis.\"',
        combinedFrictionHint,
      ]
        .filter(Boolean)
        .join(" ");
    case 3:
      return [
        `Der gleiche Kerneinwand kam bereits ${repetitionCount}x auf und wurde gefühlt noch nicht aufgelöst.`,
        "Antworte deutlich distanzierter, höflich und zurückhaltend überzeugt.",
        'Gute Richtung: \"Ich verstehe es, aber ich bin ehrlich gesagt noch nicht überzeugt.\"',
        combinedFrictionHint,
      ]
        .filter(Boolean)
        .join(" ");
    case 4:
      return [
        `Der gleiche Kerneinwand kam bereits ${repetitionCount}x auf und der Kunde ist gesprächsmüde.`,
        "Lenke natürlich in Richtung Gesprächsende oder höflichen Abbruch, ohne abrupt unnatürlich zu wirken.",
        'Gute Richtung: \"Danke dir, aber ich würde es an der Stelle erstmal dabei belassen.\"',
        combinedFrictionHint,
      ]
        .filter(Boolean)
        .join(" ");
    default:
      return null;
  }
}

export function detectFullSalesObjectionRepetition({
  bullshitBingoDetected = false,
  historyMessages,
  latestTrainerMessage,
}: {
  bullshitBingoDetected?: boolean;
  historyMessages: ChatMessageLike[];
  latestTrainerMessage: string;
}): FullSalesRepetitionDetectionResult | null {
  const recentAssistantMessages = historyMessages
    .filter((message) => message.sender_type === "assistant")
    .slice(-MAX_RECENT_ASSISTANT_MESSAGES);

  if (recentAssistantMessages.length === 0) {
    return null;
  }

  const categoryMatches = recentAssistantMessages
    .map((message) => detectObjectionCategory(message.content))
    .filter((category): category is FullSalesObjectionCategory => category !== null);

  if (categoryMatches.length === 0) {
    return null;
  }

  const dominantCategory = categoryMatches[categoryMatches.length - 1];
  const repetitionCount = categoryMatches.filter(
    (category) => category === dominantCategory
  ).length;

  if (repetitionCount === 0) {
    return null;
  }

  let escalationLevel = Math.min(repetitionCount, 4) as 1 | 2 | 3 | 4;
  const resolutionQuality = assessTrainerResolutionQuality(
    latestTrainerMessage,
    bullshitBingoDetected
  );

  if (resolutionQuality === "strong") {
    escalationLevel = Math.max(1, escalationLevel - 2) as 1 | 2 | 3 | 4;
  } else if (resolutionQuality === "mixed") {
    escalationLevel = Math.max(1, escalationLevel - 1) as 1 | 2 | 3 | 4;
  }

  if (bullshitBingoDetected && repetitionCount >= 2) {
    escalationLevel = Math.min(4, escalationLevel + 1) as 1 | 2 | 3 | 4;
  }

  return {
    objectionCategory: dominantCategory,
    repetitionCount,
    escalationLevel,
    reactionHint: buildReactionHint(
      escalationLevel,
      repetitionCount,
      bullshitBingoDetected
    ),
  };
}
