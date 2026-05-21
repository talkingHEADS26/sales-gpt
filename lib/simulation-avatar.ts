export type SessionDifficulty =
  | "easy"
  | "medium"
  | "hard"
  | "almost_impossible";

export type SimulationAvatarGender = "male" | "female";

export type SimulationJobSituation =
  | "student"
  | "pupil"
  | "trainee"
  | "employed_full_time"
  | "employed_part_time"
  | "self_employed"
  | "entrepreneur"
  | "unemployed"
  | "retired";

export type SimulationFamilySituation =
  | "single"
  | "relationship"
  | "married"
  | "family_with_children"
  | "single_parent"
  | "divorced"
  | "widowed";

export type SimulationTimeBudget =
  | "very_limited"
  | "limited"
  | "medium"
  | "flexible";

export type SimulationFinancialBudget =
  | "very_low"
  | "low"
  | "medium"
  | "good"
  | "high";

export type SimulationDiscType =
  | "dominant"
  | "analytical"
  | "steady"
  | "experimental";

export type SimulationObjectionType =
  | "price"
  | "time"
  | "uncertainty"
  | "health_concerns"
  | "bad_past_experience"
  | "fear_of_commitment"
  | "skepticism_about_support"
  | "low_trust"
  | "partner_approval"
  | "motivation_doubts"
  | "need_to_think";

export type SimulationModule =
  | "appointment_setting"
  | "complaint_management"
  | "full_sales";

export type SimulationAvatarProfile = {
  avatarAge: number;
  avatarDifficulty: SessionDifficulty;
  avatarDiscType: SimulationDiscType;
  avatarFamilySituation: SimulationFamilySituation;
  avatarFinancialBudget: SimulationFinancialBudget;
  avatarGender: SimulationAvatarGender;
  avatarJobSituation: SimulationJobSituation;
  avatarObjections: SimulationObjectionType[];
  avatarTimeBudget: SimulationTimeBudget;
};

type DifferenceDimension =
  | "age_group"
  | "difficulty"
  | "disc_type"
  | "family_situation"
  | "financial_budget"
  | "gender"
  | "job_situation"
  | "objections"
  | "time_budget";

export type SimulationAvatarDifference = {
  differenceRatio: number;
  differingDimensions: DifferenceDimension[];
  meetsIdealThreshold: boolean;
  meetsMinimumThreshold: boolean;
};

const MALE_NAMES = [
  "Daniel",
  "Tobias",
  "Jan",
  "Mehmet",
  "Oliver",
  "Lukas",
  "Stefan",
  "Marvin",
  "Robert",
  "Sascha",
] as const;

const FEMALE_NAMES = [
  "Anna",
  "Julia",
  "Sarah",
  "Laura",
  "Nadine",
  "Kathrin",
  "Svenja",
  "Miriam",
  "Alina",
  "Sabine",
] as const;

const JOB_SITUATION_OPTIONS: readonly SimulationJobSituation[] = [
  "student",
  "pupil",
  "trainee",
  "employed_full_time",
  "employed_part_time",
  "self_employed",
  "entrepreneur",
  "unemployed",
  "retired",
];

const DIFFICULTY_OPTIONS: readonly SessionDifficulty[] = [
  "easy",
  "medium",
  "hard",
  "almost_impossible",
];

const DISC_TYPE_OPTIONS: readonly SimulationDiscType[] = [
  "dominant",
  "analytical",
  "steady",
  "experimental",
];

const DIFFERENCE_DIMENSIONS: readonly DifferenceDimension[] = [
  "gender",
  "age_group",
  "job_situation",
  "family_situation",
  "time_budget",
  "financial_budget",
  "disc_type",
  "difficulty",
  "objections",
];

function getRandomItem<T>(items: readonly T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomBoolean(probability = 0.5) {
  return Math.random() < probability;
}

function normalizeJoinedList(values: string[]) {
  return [...values].sort().join("|");
}

function resolveAgeRangeForJob(jobSituation: SimulationJobSituation) {
  switch (jobSituation) {
    case "pupil":
      return { min: 20, max: 22 };
    case "trainee":
      return { min: 20, max: 28 };
    case "student":
      return { min: 20, max: 32 };
    case "retired":
      return { min: 60, max: 80 };
    default:
      return { min: 24, max: 68 };
  }
}

function deriveFamilySituation(
  jobSituation: SimulationJobSituation,
  age: number
): SimulationFamilySituation {
  if (jobSituation === "pupil") {
    return getRandomItem(["single", "relationship"] as const);
  }

  if (jobSituation === "retired") {
    return getRandomItem(["married", "widowed", "divorced"] as const);
  }

  if (age <= 24) {
    return getRandomItem(["single", "relationship"] as const);
  }

  if (age <= 34) {
    return getRandomItem(
      ["single", "relationship", "married", "single_parent"] as const
    );
  }

  if (age <= 49) {
    return getRandomItem(
      [
        "relationship",
        "married",
        "family_with_children",
        "single_parent",
        "divorced",
      ] as const
    );
  }

  return getRandomItem(
    ["married", "family_with_children", "divorced", "widowed"] as const
  );
}

function deriveTimeBudget(params: {
  age: number;
  familySituation: SimulationFamilySituation;
  jobSituation: SimulationJobSituation;
}) {
  const { age, familySituation, jobSituation } = params;
  let score = 0;

  if (jobSituation === "employed_full_time" || jobSituation === "self_employed") {
    score += 2;
  }

  if (jobSituation === "entrepreneur") {
    score += 3;
  }

  if (jobSituation === "employed_part_time" || jobSituation === "trainee") {
    score += 1;
  }

  if (jobSituation === "unemployed" || jobSituation === "retired") {
    score -= 1;
  }

  if (
    familySituation === "family_with_children" ||
    familySituation === "single_parent"
  ) {
    score += 2;
  }

  if (familySituation === "married" || familySituation === "relationship") {
    score += 1;
  }

  if (age >= 65) {
    score -= 1;
  }

  if (score >= 5) {
    return "very_limited";
  }

  if (score >= 3) {
    return "limited";
  }

  if (score >= 1) {
    return "medium";
  }

  return "flexible";
}

function deriveFinancialBudget(params: {
  age: number;
  jobSituation: SimulationJobSituation;
}): SimulationFinancialBudget {
  const { age, jobSituation } = params;

  switch (jobSituation) {
    case "pupil":
      return "very_low";
    case "student":
    case "trainee":
      return getRandomItem(["very_low", "low", "medium"] as const);
    case "unemployed":
      return getRandomItem(["very_low", "low"] as const);
    case "employed_part_time":
      return getRandomItem(["low", "medium", "good"] as const);
    case "employed_full_time":
      return getRandomItem(age >= 40 ? ["medium", "good", "high"] : ["medium", "good"]);
    case "self_employed":
      return getRandomItem(["low", "medium", "good", "high"] as const);
    case "entrepreneur":
      return getRandomItem(["medium", "good", "high"] as const);
    case "retired":
      return getRandomItem(["low", "medium", "good"] as const);
    default:
      return "medium";
  }
}

function scoreObjectionFit(params: {
  difficulty: SessionDifficulty;
  discType: SimulationDiscType;
  familySituation: SimulationFamilySituation;
  financialBudget: SimulationFinancialBudget;
  jobSituation: SimulationJobSituation;
  module: SimulationModule;
  objection: SimulationObjectionType;
  timeBudget: SimulationTimeBudget;
}) {
  const {
    difficulty,
    discType,
    familySituation,
    financialBudget,
    jobSituation,
    module,
    objection,
    timeBudget,
  } = params;

  let score = 0;

  if (objection === "time" && (timeBudget === "very_limited" || timeBudget === "limited")) {
    score += 4;
  }

  if (
    objection === "price" &&
    (financialBudget === "very_low" || financialBudget === "low")
  ) {
    score += 4;
  }

  if (
    objection === "partner_approval" &&
    ["relationship", "married", "family_with_children"].includes(familySituation)
  ) {
    score += 3;
  }

  if (objection === "motivation_doubts" && discType === "steady") {
    score += 3;
  }

  if (objection === "need_to_think" && discType === "analytical") {
    score += 3;
  }

  if (objection === "low_trust" && discType === "analytical") {
    score += 3;
  }

  if (objection === "skepticism_about_support" && discType === "dominant") {
    score += 3;
  }

  if (objection === "fear_of_commitment" && discType === "experimental") {
    score += 2;
  }

  if (objection === "uncertainty" && discType === "steady") {
    score += 2;
  }

  if (objection === "health_concerns" && (jobSituation === "retired" || jobSituation === "unemployed")) {
    score += 2;
  }

  if (objection === "bad_past_experience" && difficulty !== "easy") {
    score += 2;
  }

  if (difficulty === "hard" || difficulty === "almost_impossible") {
    if (objection === "low_trust" || objection === "bad_past_experience") {
      score += 2;
    }
  }

  if (difficulty === "almost_impossible") {
    if (objection === "need_to_think" || objection === "fear_of_commitment") {
      score += 2;
    }
  }

  if (module === "complaint_management") {
    if (objection === "low_trust" || objection === "bad_past_experience") {
      score += 2;
    }
  }

  if (module === "appointment_setting") {
    if (objection === "need_to_think" || objection === "time") {
      score += 2;
    }
  }

  return score + Math.random();
}

function deriveObjections(params: {
  difficulty: SessionDifficulty;
  discType: SimulationDiscType;
  familySituation: SimulationFamilySituation;
  financialBudget: SimulationFinancialBudget;
  jobSituation: SimulationJobSituation;
  module: SimulationModule;
  timeBudget: SimulationTimeBudget;
}) {
  const objectionPool: SimulationObjectionType[] = [
    "price",
    "time",
    "uncertainty",
    "health_concerns",
    "bad_past_experience",
    "fear_of_commitment",
    "skepticism_about_support",
    "low_trust",
    "partner_approval",
    "motivation_doubts",
    "need_to_think",
  ];

  return objectionPool
    .map((objection) => ({
      objection,
      score: scoreObjectionFit({ ...params, objection }),
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, params.difficulty === "almost_impossible" ? 4 : 3)
    .map((entry) => entry.objection);
}

function createRandomProfile(
  module: SimulationModule,
  preferredDifficulty?: SessionDifficulty
): SimulationAvatarProfile {
  const avatarGender = getRandomItem(["male", "female"] as const);
  const avatarJobSituation = getRandomItem(JOB_SITUATION_OPTIONS);
  const ageRange = resolveAgeRangeForJob(avatarJobSituation);
  const avatarAge = getRandomInt(ageRange.min, ageRange.max);
  const avatarFamilySituation = deriveFamilySituation(avatarJobSituation, avatarAge);
  const avatarTimeBudget = deriveTimeBudget({
    age: avatarAge,
    familySituation: avatarFamilySituation,
    jobSituation: avatarJobSituation,
  });
  const avatarFinancialBudget = deriveFinancialBudget({
    age: avatarAge,
    jobSituation: avatarJobSituation,
  });
  const avatarDiscType = getRandomItem(DISC_TYPE_OPTIONS);
  const avatarDifficulty = preferredDifficulty ?? getRandomItem(DIFFICULTY_OPTIONS);

  return {
    avatarAge,
    avatarDifficulty,
    avatarDiscType,
    avatarFamilySituation,
    avatarFinancialBudget,
    avatarGender,
    avatarJobSituation,
    avatarObjections: deriveObjections({
      difficulty: avatarDifficulty,
      discType: avatarDiscType,
      familySituation: avatarFamilySituation,
      financialBudget: avatarFinancialBudget,
      jobSituation: avatarJobSituation,
      module,
      timeBudget: avatarTimeBudget,
    }),
    avatarTimeBudget,
  };
}

function resolveAgeGroup(age: number) {
  if (age < 30) {
    return "under_30";
  }

  if (age < 45) {
    return "30_to_44";
  }

  if (age < 60) {
    return "45_to_59";
  }

  return "60_plus";
}

export function calculateSimulationAvatarDifference(
  previousAvatar: SimulationAvatarProfile,
  nextAvatar: SimulationAvatarProfile
): SimulationAvatarDifference {
  const differingDimensions = DIFFERENCE_DIMENSIONS.filter((dimension) => {
    switch (dimension) {
      case "gender":
        return previousAvatar.avatarGender !== nextAvatar.avatarGender;
      case "age_group":
        return resolveAgeGroup(previousAvatar.avatarAge) !== resolveAgeGroup(nextAvatar.avatarAge);
      case "job_situation":
        return previousAvatar.avatarJobSituation !== nextAvatar.avatarJobSituation;
      case "family_situation":
        return previousAvatar.avatarFamilySituation !== nextAvatar.avatarFamilySituation;
      case "time_budget":
        return previousAvatar.avatarTimeBudget !== nextAvatar.avatarTimeBudget;
      case "financial_budget":
        return previousAvatar.avatarFinancialBudget !== nextAvatar.avatarFinancialBudget;
      case "disc_type":
        return previousAvatar.avatarDiscType !== nextAvatar.avatarDiscType;
      case "difficulty":
        return previousAvatar.avatarDifficulty !== nextAvatar.avatarDifficulty;
      case "objections":
        return (
          normalizeJoinedList(previousAvatar.avatarObjections) !==
          normalizeJoinedList(nextAvatar.avatarObjections)
        );
      default:
        return false;
    }
  });

  const differenceRatio = differingDimensions.length / DIFFERENCE_DIMENSIONS.length;

  return {
    differenceRatio,
    differingDimensions,
    meetsIdealThreshold: differenceRatio >= 0.7 && differingDimensions.length >= 6,
    meetsMinimumThreshold: differenceRatio >= 0.56 && differingDimensions.length >= 5,
  };
}

export function selectDiverseSimulationAvatarProfile(params: {
  module: SimulationModule;
  previousAvatar?: SimulationAvatarProfile | null;
  preferredDifficulty?: SessionDifficulty;
}) {
  const { module, preferredDifficulty, previousAvatar } = params;

  if (!previousAvatar) {
    const profile = createRandomProfile(module, preferredDifficulty);

    return {
      comparison: null,
      profile,
    };
  }

  const attempts = Array.from({ length: 32 }, () => {
    const profile = createRandomProfile(module, preferredDifficulty);

    return {
      comparison: calculateSimulationAvatarDifference(previousAvatar, profile),
      profile,
    };
  }).sort((left, right) => {
    if (
      left.comparison.differingDimensions.length !==
      right.comparison.differingDimensions.length
    ) {
      return (
        right.comparison.differingDimensions.length -
        left.comparison.differingDimensions.length
      );
    }

    return right.comparison.differenceRatio - left.comparison.differenceRatio;
  });

  return (
    attempts.find((attempt) => attempt.comparison.meetsIdealThreshold) ??
    attempts.find((attempt) => attempt.comparison.meetsMinimumThreshold) ??
    attempts[0]
  );
}

export function pickAvatarName(gender: SimulationAvatarGender) {
  return gender === "male" ? getRandomItem(MALE_NAMES) : getRandomItem(FEMALE_NAMES);
}

export function formatJobSituation(value: SimulationJobSituation) {
  switch (value) {
    case "student":
      return "Student";
    case "pupil":
      return "Schüler";
    case "trainee":
      return "Azubi";
    case "employed_full_time":
      return "Vollzeit angestellt";
    case "employed_part_time":
      return "Teilzeit angestellt";
    case "self_employed":
      return "selbstständig";
    case "entrepreneur":
      return "Unternehmer";
    case "unemployed":
      return "arbeitssuchend";
    case "retired":
      return "im Ruhestand";
    default:
      return value;
  }
}

export function formatFamilySituation(value: SimulationFamilySituation) {
  switch (value) {
    case "single":
      return "Single";
    case "relationship":
      return "in Beziehung";
    case "married":
      return "verheiratet";
    case "family_with_children":
      return "Familie mit Kindern";
    case "single_parent":
      return "alleinerziehend";
    case "divorced":
      return "geschieden";
    case "widowed":
      return "verwitwet";
    default:
      return value;
  }
}

export function formatTimeBudget(value: SimulationTimeBudget) {
  switch (value) {
    case "very_limited":
      return "sehr wenig Zeit";
    case "limited":
      return "eher wenig Zeit";
    case "medium":
      return "mittleres Zeitbudget";
    case "flexible":
      return "zeitlich flexibel";
    default:
      return value;
  }
}

export function formatFinancialBudget(value: SimulationFinancialBudget) {
  switch (value) {
    case "very_low":
      return "sehr knapp";
    case "low":
      return "knapp";
    case "medium":
      return "mittel";
    case "good":
      return "gut";
    case "high":
      return "hoch";
    default:
      return value;
  }
}

export function formatDiscType(value: SimulationDiscType) {
  switch (value) {
    case "dominant":
      return "dominant";
    case "analytical":
      return "analytisch";
    case "steady":
      return "steady";
    case "experimental":
      return "experimental";
    default:
      return value;
  }
}

export function formatObjectionType(value: SimulationObjectionType) {
  switch (value) {
    case "price":
      return "Preis";
    case "time":
      return "Zeit";
    case "uncertainty":
      return "Unsicherheit";
    case "health_concerns":
      return "gesundheitliche Bedenken";
    case "bad_past_experience":
      return "schlechte Vorerfahrung";
    case "fear_of_commitment":
      return "Angst vor Bindung";
    case "skepticism_about_support":
      return "Zweifel an Betreuung";
    case "low_trust":
      return "geringes Vertrauen";
    case "partner_approval":
      return "Abstimmung mit Partner";
    case "motivation_doubts":
      return "Zweifel an Motivation";
    case "need_to_think":
      return "will noch nachdenken";
    default:
      return value;
  }
}

export function getDifficultyPromptGuidance(value: SessionDifficulty) {
  switch (value) {
    case "easy":
      return "grundsätzlich offen, gut ansprechbar, mit normaler Geduld und eher lösbaren Einwänden";
    case "medium":
      return "interessiert, aber mit mehreren echten Einwänden, spürbarer Vorsicht und normaler Abschlusshemmung";
    case "hard":
      return "deutlich skeptisch, ungeduldiger, widerständiger und sensibel für Floskeln oder schwache Führung";
    case "almost_impossible":
      return "sehr schwerer Fall mit geringer Geduld, hoher Abbruchneigung und nur kleiner Wahrscheinlichkeit auf klares Gewinnen";
    default:
      return value;
  }
}

export function getDiscPromptGuidance(value: SimulationDiscType) {
  switch (value) {
    case "dominant":
      return "straight, fordernd, direkt, forsch, ego-typisch und besserwisserisch";
    case "analytical":
      return "skeptisch, vorsichtig, faktenbasiert und prüfend";
    case "steady":
      return "unsicher, empfindlich, vorsichtig und schnell angefasst";
    case "experimental":
      return "schnell begeistert, offen für Neues, neugierig, aber sprunghaft";
    default:
      return value;
  }
}

export function getRandomSessionDifficulty() {
  return getRandomItem(DIFFICULTY_OPTIONS);
}

export function getProfileSummaryLines(profile: SimulationAvatarProfile) {
  return [
    `- Geschlecht: ${profile.avatarGender}`,
    `- Alter: ${profile.avatarAge}`,
    `- Berufssituation: ${formatJobSituation(profile.avatarJobSituation)}`,
    `- Familiensituation: ${formatFamilySituation(profile.avatarFamilySituation)}`,
    `- Zeitbudget: ${formatTimeBudget(profile.avatarTimeBudget)}`,
    `- Finanzieller Spielraum: ${formatFinancialBudget(profile.avatarFinancialBudget)}`,
    `- Disc-Typ: ${formatDiscType(profile.avatarDiscType)}`,
    `- Difficulty: ${profile.avatarDifficulty}`,
    `- Typische Einwände: ${profile.avatarObjections
      .map((entry) => formatObjectionType(entry))
      .join(", ")}`,
  ].join("\n");
}

export function describeDifferenceDimensions(
  difference: SimulationAvatarDifference | null
) {
  if (!difference || difference.differingDimensions.length === 0) {
    return "keine";
  }

  return difference.differingDimensions.join(", ");
}

export function maybeUseAlternativeName(gender: SimulationAvatarGender, currentName: string) {
  const pool = gender === "male" ? MALE_NAMES : FEMALE_NAMES;
  const alternatives = pool.filter((name) => name !== currentName);

  if (alternatives.length === 0) {
    return currentName;
  }

  return getRandomBoolean(0.7) ? getRandomItem(alternatives) : currentName;
}
