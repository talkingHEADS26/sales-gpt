type BullshitBingoDetectionResult = {
  detected: boolean;
  matchedPhrases: string[];
  reactionHint: string | null;
};

export type BullshitBingoScenario =
  | "full_sales"
  | "appointment_setting"
  | "complaint_management";

type PhrasePattern = {
  canonicalPhrase: string;
  pattern: RegExp;
};

const BULLSHIT_BINGO_PATTERNS: PhrasePattern[] = [
  {
    canonicalPhrase: "geschultes Personal",
    pattern: /\bgeschult(?:e|em|en|es)?\s+personal\b/,
  },
  {
    canonicalPhrase: "individueller Trainingsplan",
    pattern:
      /\bindividuell(?:er|en|em|es)?\s+trainingsplan\b|\btrainingsplan\b.*\bindividuell(?:er|en|em|es)?\b/,
  },
  {
    canonicalPhrase: "kostenloser Trainingsplan",
    pattern:
      /\bkostenlos(?:er|en|em|es)?\s+trainingsplan\b|\btrainingsplan\b.*\bkostenlos(?:er|en|em|es)?\b/,
  },
  {
    canonicalPhrase: "wir gehen individuell auf deine Bedürfnisse ein",
    pattern:
      /\bwir\s+gehen\s+(?:ganz\s+|komplett\s+)?individuell\s+auf\s+(?:deine|ihre)\s+beduerfnisse\s+ein\b/,
  },
  {
    canonicalPhrase: "wir gehen auf deine Wünsche ein",
    pattern:
      /\bwir\s+gehen\s+(?:ganz\s+|komplett\s+)?auf\s+(?:deine|ihre)\s+wuensche\s+ein\b/,
  },
  {
    canonicalPhrase: "ganz individuell",
    pattern: /\b(?:ganz|komplett)\s+individuell\b/,
  },
  {
    canonicalPhrase: "100 Prozent individuell",
    pattern: /\b100\s*(?:prozent|%)\s+individuell\b/,
  },
  {
    canonicalPhrase: "wenn du heute unterschreibst",
    pattern:
      /\bwenn\s+(?:du|sie)\s+heute\s+unterschreib(?:st|en)\b/,
  },
  {
    canonicalPhrase: "12 Monate gratis",
    pattern: /\b(?:12|x|\d+)\s+monate\s+gratis\b/,
  },
  {
    canonicalPhrase: "gratis Monate",
    pattern: /\bgratis\s+monate\b/,
  },
  {
    canonicalPhrase: "kostenlos trainieren",
    pattern: /\bkostenlos\s+trainier(?:en|st|t)\b/,
  },
  {
    canonicalPhrase: "Sonderangebot nur heute",
    pattern: /\bsonderangebot\s+nur\s+heute\b/,
  },
  {
    canonicalPhrase: "moderne Geräte",
    pattern: /\bmodern(?:e|en|em|es)?\s+geraet(?:e|en)?\b/,
  },
  {
    canonicalPhrase: "familiäre Atmosphäre",
    pattern:
      /\bfamiliaer(?:e|en|em|es)?\s+atmosphaere\b|\bfamiliaer(?:e|en|em|es)?\s+umgebung\b/,
  },
  {
    canonicalPhrase: "qualifizierte Trainer",
    pattern:
      /\bqualifiziert(?:e|en|em|es)?\s+trainer(?:innen)?\b|\berfahren(?:e|en|em|es)?\s+trainer(?:innen)?\b/,
  },
  {
    canonicalPhrase: "wir sind anders",
    pattern:
      /\bwir\s+sind\s+(?:einfach\s+)?anders\b|\bunterscheid(?:et|en)\s+uns\b/,
  },
];

const SKEPTICAL_REACTIONS_BY_SCENARIO: Record<
  BullshitBingoScenario,
  readonly string[]
> = {
  appointment_setting: [
    "Das klingt gerade ziemlich nach Standardtext.",
    "Okay, aber warum sollte ich dafür jetzt wirklich einen Termin machen?",
    "So ähnlich wurde ich schon mal angerufen.",
    "Was ist daran für mich konkret anders als bei allen anderen Calls?",
    "Nur mit so einer Standardaussage bin ich noch nicht bei einem Termin.",
  ],
  complaint_management: [
    "Ich brauche gerade keine Floskel, sondern eine klare Lösung.",
    "Das klingt nett, beantwortet mein Problem aber noch nicht.",
    "Solche Standardantworten habe ich vorher auch schon bekommen.",
    "Was heißt das jetzt konkret für meinen Fall?",
    "Damit ist mein Anliegen noch nicht wirklich geklärt.",
  ],
  full_sales: [
    "Das sagen irgendwie alle.",
    "Okay, aber was ist daran jetzt wirklich besonders?",
    "Was heißt denn bei euch konkret individuell?",
    "Einen Trainingsplan kriegt man doch heute fast überall, oder?",
    "Und was ist jetzt der Unterschied zu anderen Studios?",
    "So ein Angebot habe ich woanders auch schon gehört.",
    "Nur wegen gratis Monaten würde ich jetzt noch nicht unterschreiben.",
    "Klingt nett, aber was bringt mir das konkret?",
    "Das habe ich jetzt schon öfter gehört.",
    "Letzte Woche hat mir ein anderes Studio fast das Gleiche gesagt.",
  ],
};

function normalizeForPhraseDetection(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9%]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildStableReactionExamples(
  scenario: BullshitBingoScenario,
  normalizedMessage: string,
  matchedPhraseCount: number
) {
  const reactions = SKEPTICAL_REACTIONS_BY_SCENARIO[scenario];
  const seedSource = `${normalizedMessage}:${matchedPhraseCount}`;
  let hash = 0;

  for (let index = 0; index < seedSource.length; index += 1) {
    hash = (hash * 31 + seedSource.charCodeAt(index)) >>> 0;
  }

  const firstIndex = hash % reactions.length;
  const secondIndex = (firstIndex + matchedPhraseCount + 3) % reactions.length;

  if (firstIndex === secondIndex) {
    return [reactions[firstIndex]];
  }

  return [reactions[firstIndex], reactions[secondIndex]];
}

function buildScenarioHint(
  scenario: BullshitBingoScenario,
  matchedPhrases: string[]
): string {
  if (scenario === "appointment_setting") {
    return matchedPhrases.length > 1
      ? "Der Berater hat mehrere generische Telefonphrasen oder austauschbare Lockformulierungen benutzt."
      : "Der Berater hat gerade eine generische Telefonphrase oder austauschbare Lockformulierung benutzt.";
  }

  if (scenario === "complaint_management") {
    return matchedPhrases.length > 1
      ? "Der Ansprechpartner hat mehrere generische Standardformulierungen benutzt, statt auf das konkrete Anliegen einzugehen."
      : "Der Ansprechpartner hat gerade eine generische Standardformulierung benutzt, statt konkret auf das Anliegen einzugehen.";
  }

  return matchedPhrases.length > 1
    ? "Der Berater hat mehrere generische Standardphrasen oder Lockangebote verwendet."
    : "Der Berater hat gerade eine generische Standardphrase oder ein austauschbares Lockangebot verwendet.";
}

export function detectSimulationBullshitBingo(params: {
  message: string;
  scenario: BullshitBingoScenario;
}): BullshitBingoDetectionResult {
  const { message, scenario } = params;
  const normalizedMessage = normalizeForPhraseDetection(message);

  if (!normalizedMessage) {
    return {
      detected: false,
      matchedPhrases: [],
      reactionHint: null,
    };
  }

  const matchedPhrases = BULLSHIT_BINGO_PATTERNS.filter(({ pattern }) =>
    pattern.test(normalizedMessage)
  ).map(({ canonicalPhrase }) => canonicalPhrase);

  if (matchedPhrases.length === 0) {
    return {
      detected: false,
      matchedPhrases: [],
      reactionHint: null,
    };
  }

  const reactionExamples = buildStableReactionExamples(
    scenario,
    normalizedMessage,
    matchedPhrases.length
  );

  return {
    detected: true,
    matchedPhrases,
    reactionHint: [
      buildScenarioHint(scenario, matchedPhrases),
      "Reagiere als realistischer Kunde nicht beeindruckt und gib keine positive Verstärkung auf diese Aussage.",
      "Antworte stattdessen leicht skeptisch, relativierend oder mit einer konkreten Nachfrage.",
      `Halte den Skepsis-Moment subtil und natürlich. Gute Richtungen wären zum Beispiel: "${reactionExamples[0]}"${
        reactionExamples[1] ? ` oder "${reactionExamples[1]}"` : ""
      }.`,
      `Interne Treffer: ${matchedPhrases.join(", ")}.`,
    ].join(" "),
  };
}

export function detectFullSalesBullshitBingo(
  message: string
): BullshitBingoDetectionResult {
  return detectSimulationBullshitBingo({
    message,
    scenario: "full_sales",
  });
}

export { BULLSHIT_BINGO_PATTERNS };
