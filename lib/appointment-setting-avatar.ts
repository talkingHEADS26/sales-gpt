import type { AppointmentLeadSource } from "@/lib/training-session-config";
import type { FranchiseVerticalKey, IndustryKey } from "@/lib/industries";
import {
  calculateSimulationAvatarDifference,
  describeDifferenceDimensions,
  formatDiscType,
  formatFamilySituation,
  formatFinancialBudget,
  formatJobSituation,
  formatObjectionType,
  formatTimeBudget,
  getDifficultyPromptGuidance,
  getDiscPromptGuidance,
  getProfileSummaryLines,
  maybeUseAlternativeName,
  pickAvatarName,
  selectDiverseSimulationAvatarProfile,
  type SessionDifficulty,
  type SimulationAvatarDifference,
  type SimulationAvatarProfile,
} from "@/lib/simulation-avatar";

export type AppointmentAvatar = SimulationAvatarProfile & {
  leadContext: string;
  leadGoal: string;
  leadName: string;
  leadSource: AppointmentLeadSource;
  leadTone: string;
  openingMessage: string;
};

export type AppointmentAvatarSnapshot = AppointmentAvatar & {
  createdAt: string;
  id: string;
  organizationId: string | null;
  previousAvatarSnapshotId: string | null;
  sessionId: string;
  userId: string;
};

export type AppointmentAvatarPromptContext = {
  currentAvatar: AppointmentAvatar | AppointmentAvatarSnapshot;
  previousAvatar?: AppointmentAvatar | AppointmentAvatarSnapshot | null;
};

type AppointmentSeed = {
  leadContext: string;
  leadGoal: string;
  leadSource: AppointmentLeadSource;
};

type AppointmentAvatarSelection = {
  avatar: AppointmentAvatar;
  comparison: SimulationAvatarDifference | null;
};

const DEFAULT_APPOINTMENT_SEEDS: readonly AppointmentSeed[] = [
  {
    leadSource: "Webseite",
    leadContext:
      "hat sich über die Website eingetragen, weil das Thema Gesundheit und Alltagsenergie gerade wieder mehr Druck macht",
    leadGoal:
      "will herausfinden, ob ein Termin wirklich hilfreich ist oder nur der Einstieg in eine Verkaufsschleife",
  },
  {
    leadSource: "Anzeige",
    leadContext:
      "kam über eine Anzeige auf das Angebot und filtert gerade streng, was echte Substanz hat und was nur Marketing ist",
    leadGoal:
      "will schnell erkennen, ob sich ein Termin lohnt und ob der Nutzen für die eigene Situation konkret ist",
  },
  {
    leadSource: "Promo-Stand",
    leadContext:
      "hat die Nummer eher spontan am Promo-Stand dagelassen und erinnert sich nur teilweise an das ursprüngliche Gespräch",
    leadGoal:
      "will verstehen, warum sich ein Termin jetzt konkret lohnt und ob das in die eigene Woche passt",
  },
  {
    leadSource: "Empfehlung",
    leadContext:
      "kam über eine Empfehlung, will aber trotzdem selbst prüfen, ob der Termin wirklich individuell passt",
    leadGoal:
      "will keine Standardberatung, sondern einen nachvollziehbaren Grund, warum das für die eigene Lage sinnvoll ist",
  },
];

const FINANCE_APPOINTMENT_SEEDS: readonly AppointmentSeed[] = [
  {
    leadSource: "Webseite",
    leadContext:
      "hat sich über die Webseite eingetragen, weil Absicherung und Altersvorsorge aktuell zu lange aufgeschoben wurden",
    leadGoal:
      "will in einem Termin klar priorisieren, welche Risiken zuerst geschlossen werden sollten",
  },
  {
    leadSource: "Anzeige",
    leadContext:
      "kam über eine Anzeige und ist skeptisch, ob die Beratung konkret oder nur verkaufsgetrieben ist",
    leadGoal:
      "will schnell prüfen, ob der Termin nachvollziehbaren Mehrwert für die eigene Finanzsituation bietet",
  },
  {
    leadSource: "Promo-Stand",
    leadContext:
      "hat die Kontaktdaten am Stand hinterlassen, ist aber unsicher, ob das Thema jetzt wirklich dringend ist",
    leadGoal:
      "will verstehen, warum ein Gespräch jetzt sinnvoll ist und welche konkreten Themen vorbereitet werden sollten",
  },
  {
    leadSource: "Empfehlung",
    leadContext:
      "kam über Empfehlung, möchte aber unabhängig prüfen, ob Beratung und Vorgehen transparent und passend sind",
    leadGoal:
      "will einen Termin nur dann zusagen, wenn die Beratung strukturiert, verständlich und ohne Druck wirkt",
  },
];

function getAppointmentSeedsForIndustry(industryKey: IndustryKey) {
  if (industryKey === "finance") {
    return FINANCE_APPOINTMENT_SEEDS;
  }

  return DEFAULT_APPOINTMENT_SEEDS;
}

function getFranchiseAppointmentSeeds(vertical: FranchiseVerticalKey): readonly AppointmentSeed[] {
  switch (vertical) {
    case "restaurant":
      return [
        {
          leadSource: "Webseite",
          leadContext:
            "interessiert sich für ein Gastro-Franchise, ist aber unsicher bei Personalkosten und Standortfrequenz",
          leadGoal:
            "will vor einem Termin verstehen, wie realistisch Marge und Personalplanung im Alltag sind",
        },
      ];
    case "fashion":
      return [
        {
          leadSource: "Anzeige",
          leadContext:
            "denkt über ein Fashion-Franchise nach, zweifelt aber an Saisonrisiken und Warenbindung",
          leadGoal:
            "will prüfen, ob der Termin klare Antworten zu Sortiment, Rotation und Kapitalbindung liefert",
        },
      ];
    case "fitness":
      return [
        {
          leadSource: "Empfehlung",
          leadContext:
            "interessiert sich für ein Gym-Franchise und prüft Mitgliederaufbau sowie operative Belastung",
          leadGoal:
            "will im Termin belastbar verstehen, wie schnell ein Standort auf stabile Auslastung kommt",
        },
      ];
    default:
      return [];
  }
}

function getRandomItem<T>(items: readonly T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function buildLeadTone(profile: SimulationAvatarProfile) {
  const parts = [
    profile.avatarDifficulty === "easy"
      ? "grundsätzlich offen"
      : profile.avatarDifficulty === "medium"
        ? "vorsichtig interessiert"
        : profile.avatarDifficulty === "hard"
          ? "skeptisch und prüfend"
          : "extrem schwer zu binden",
    profile.avatarDiscType === "dominant"
      ? "direkt"
      : profile.avatarDiscType === "analytical"
        ? "sachlich"
        : profile.avatarDiscType === "steady"
          ? "zurückhaltend"
          : "sprunghaft",
  ];

  if (
    profile.avatarTimeBudget === "very_limited" ||
    profile.avatarTimeBudget === "limited"
  ) {
    parts.push("zeitlich knapp");
  }

  return parts.join(", ");
}

function buildOpeningMessage(params: {
  leadName: string;
  profile: SimulationAvatarProfile;
}) {
  const { leadName, profile } = params;

  if (profile.avatarDifficulty === "easy") {
    return `Hallo, hier ist ${leadName}. Ich hatte mich eingetragen und wollte kurz verstehen, worum es bei dem Termin genau geht.`;
  }

  if (profile.avatarDifficulty === "medium") {
    return `Ja, hallo, ${leadName} hier. Ich hatte mich mal eingetragen, bin aber noch nicht sicher, ob so ein Termin für mich gerade wirklich Sinn macht.`;
  }

  if (profile.avatarDifficulty === "hard") {
    return `${leadName} hier. Ich habe nicht viel Zeit, also bitte direkt: Worum geht es genau und warum sollte ich dafür jetzt einen Termin machen?`;
  }

  return `${leadName} hier. Ich sage direkt dazu: Ich bin bei sowas eher raus. Wenn das nur der nächste Standard-Pitch ist, können wir es auch kurz machen.`;
}

function buildAppointmentAvatar(params: {
  difficulty: SessionDifficulty;
  franchiseVertical?: FranchiseVerticalKey;
  industryKey: IndustryKey;
  leadSource: AppointmentLeadSource;
  previousAvatar?: AppointmentAvatarSnapshot | null;
}): AppointmentAvatarSelection {
  const industrySeeds = getAppointmentSeedsForIndustry(params.industryKey);
  const verticalSeeds =
    params.industryKey === "franchise"
      ? getFranchiseAppointmentSeeds(params.franchiseVertical ?? "other")
      : [];
  const seed = getRandomItem(
    [...verticalSeeds, ...industrySeeds].filter(
      (entry) => entry.leadSource === params.leadSource
    )
  );
  const selection = selectDiverseSimulationAvatarProfile({
    module: "appointment_setting",
    previousAvatar: params.previousAvatar ?? null,
    preferredDifficulty: params.difficulty,
  });
  const leadName = maybeUseAlternativeName(
    selection.profile.avatarGender,
    pickAvatarName(selection.profile.avatarGender)
  );

  return {
    avatar: {
      ...selection.profile,
      leadContext: seed.leadContext,
      leadGoal: seed.leadGoal,
      leadName,
      leadSource: params.leadSource,
      leadTone: buildLeadTone(selection.profile),
      openingMessage: buildOpeningMessage({
        leadName,
        profile: selection.profile,
      }),
    },
    comparison: selection.comparison,
  };
}

export function selectAppointmentAvatar(params: {
  difficulty: SessionDifficulty;
  franchiseVertical?: FranchiseVerticalKey;
  industryKey: IndustryKey;
  leadSource: AppointmentLeadSource;
  previousAvatar?: AppointmentAvatarSnapshot | null;
}) {
  return buildAppointmentAvatar(params);
}

function formatAvatarSummaryLines(
  avatar: AppointmentAvatar | AppointmentAvatarSnapshot
) {
  return [
    `- Name: ${avatar.leadName}`,
    getProfileSummaryLines(avatar),
    `- Leadquelle: ${avatar.leadSource}`,
    `- Ausgangslage: ${avatar.leadContext}`,
    `- Ziel des Leads: ${avatar.leadGoal}`,
    `- Ton im Gespräch: ${avatar.leadTone}`,
  ].join("\n");
}

export function buildAppointmentAvatarPrompt(
  context?: AppointmentAvatarPromptContext | null
) {
  if (!context) {
    return "";
  }

  const currentAvatar = context.currentAvatar;
  const blocks = [
    `AKTIVE LEAD-VORGABE FÜR DIESE SESSION:
Bleibe durchgehend bei diesem Lead-Kontext. Erfinde keinen anderen Einstieg, keine andere Ausgangslage und keinen anderen Grundkontakt.

${formatAvatarSummaryLines(currentAvatar)}

- Berufssituation prägt die Alltagshürden: ${formatJobSituation(
      currentAvatar.avatarJobSituation
    )}
- Familiensituation prägt Verbindlichkeit und Prioritäten: ${formatFamilySituation(
      currentAvatar.avatarFamilySituation
    )}
- Zeitbudget: ${formatTimeBudget(currentAvatar.avatarTimeBudget)}
- Finanzieller Spielraum: ${formatFinancialBudget(currentAvatar.avatarFinancialBudget)}
- Disc-Typ: ${formatDiscType(currentAvatar.avatarDiscType)} (${getDiscPromptGuidance(
      currentAvatar.avatarDiscType
    )})
- Difficulty: ${currentAvatar.avatarDifficulty} (${getDifficultyPromptGuidance(
      currentAvatar.avatarDifficulty
    )})
- Typische Einwände: ${currentAvatar.avatarObjections
      .map((entry) => formatObjectionType(entry))
      .join(", ")}

Die Difficulty muss sich real zeigen in Offenheit, Geduld, Härte der Einwände, Bullshit-Bingo-Empfindlichkeit und Terminwahrscheinlichkeit.
Der Disc-Typ muss das Verhalten spürbar prägen, nicht nur als Metadaten bestehen.`,
  ];

  if (context.previousAvatar) {
    const difference = calculateSimulationAvatarDifference(
      context.previousAvatar,
      currentAvatar
    );

    blocks.push(`AVATAR-MEMORY ZUR ABGRENZUNG:
Der letzte Lead-Avatar war:

${formatAvatarSummaryLines(context.previousAvatar)}

Der neue Avatar wurde bewusst deutlich anders gebaut.
- Zielwert ist eine spürbare Abweichung von rund 70 Prozent.
- Bereits bewusst veränderte Profil-Dimensionen: ${describeDifferenceDimensions(
        difference
      )}.
- Wiederhole nicht dieselbe Grundfigur mit nur kosmetischen Änderungen.`);
  }

  return blocks.join("\n\n");
}
