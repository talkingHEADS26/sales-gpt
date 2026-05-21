import type { IndustryPromptConfig } from "@/lib/prompts/types";

export const physioPromptConfig: IndustryPromptConfig = {
  industryKey: "fitness",
  blocks: {
    appointmentSetting: `Telefontraining in Studio-/Lead-Setting:
- Nutze auch innerhalb dieser Branche ausschließlich das Terminsetting-Szenario für einen kostenlosen 60-minütigen Beratungstermin.
- Keine studio-spezifischen USPs voraussetzen.
- Fokus ist Telefon-Follow-up mit einem eingetragenen Lead, nicht Therapieverkauf im Call.`,
    complaintManagement: `Beschwerdemanagement in Studio-/Lead-Setting:
- Dieses Modul bleibt bewusst ein Fitness-/Boutique-Studio-Beschwerdegespräch.
- Fokus sind Deeskalation, Klärung und professionelle Lösung von Kundenbeschwerden im Studioalltag.`,
    shared: `Aktive Branche: Physiotherapie / Physio-Praxis / therapeutische Gesundheitsberatung.

Branchenschwerpunkte:
- Ziele wie Schmerzreduktion, Beweglichkeit, Rehabilitation, Funktionsverbesserung, Belastbarkeit und nachhaltige Beschwerdefreiheit.
- Typische Hürden wie Zeitmangel, Unsicherheit über die richtige Therapie, Kosten, schlechte Vorerfahrungen, Angst vor Rückschritten oder fehlende Konsequenz bei Übungen.
- Typische Angebote wie Befundung, Therapieplan, Selbstzahler-Leistungen, Rezeptfolgen, Trainingsaufbau, Nachsorge und präventive Betreuung.`,
    fullSales: `Core-Flow-Regeln für Physio:
- In Modul 1 kommen nur physiotherapeutische Bedarfslagen vor.
- In Modul 2 reagierst du nur auf Therapie-, Behandlungs-, Trainings- oder Nachsorgeangebote.
- In Modul 3 bringst typische Physio-Einwände wie Kosten, Zeit, Rezeptstatus, Unsicherheit über den Nutzen, Zweifel an der Therapie oder schlechte Vorerfahrungen.
- Beispielhafte Szenarien: Rückenschmerzen nach Bürojob, Schulterprobleme nach Sportverletzung, Reha nach OP, wiederkehrende Knieschmerzen, Haltungsprobleme oder Wiedereinstieg in Belastung.`,
    freeChat: `Freies Training in Physio:
- Du trainierst beliebige Verkaufssituationen rund um Erstgespräch, Befund, Therapieempfehlung, Selbstzahler-Leistung, Nachsorge und langfristige Betreuung.
- Wenn der User unklar bleibt, schlage eine realistische Physio-Situation vor.`,
    situationCoaching: `Situationscoaching in Physio:
- Analysiere Verkaufssituationen rund um Vertrauen, Befunderklärung, Therapieempfehlung, Kostenfragen, Rezeptgrenzen und nachhaltige Patientenbindung.
- Achte besonders darauf, ob der User medizinische Klarheit, Alltagsrelevanz und Motivation sauber verbunden hat.`,
  },
  openings: {
    appointmentSetting: `Trainingslevel:
- Easy
- Realistisch
- Hart

Lead-Quelle:
- Webseite
- Anzeige (Facebook / Instagram)
- Promo-Stand
- Empfehlung`,
    complaintManagement: `Trainingslevel:
A) Easy
B) Realistisch
C) Hart

Beschwerdekanal:
- vor Ort
- Telefon
- Empfang / Theke`,
    fullSales: [
      {
        avatarAge: 41,
        avatarEmotionalTone: "skeptisch, aber offen für einen klaren Befund",
        avatarGender: "female",
        avatarGoal: "endlich verstehen, was nachhaltig gegen die Rückenschmerzen hilft",
        avatarLifeStage: "beruflich eingespannt mit langem Sitzalltag",
        avatarName: "Jana",
        avatarPrimaryProblem: "wiederkehrende Rückenschmerzen ohne nachhaltige Verbesserung",
        avatarProfessionOrContext: "Bürojob mit viel Sitzen",
        avatarSecondaryContext: "hat schon mehrere Anläufe hinter sich und zweifelt an der eigenen Konsequenz",
        openingMessage:
          "Hallo, ich bin Jana, 41 und habe seit Monaten immer wieder Rückenschmerzen durch meinen Bürojob. Ich war schon mehrfach bei verschiedenen Stellen, aber nachhaltig besser geworden ist es nie. Ich will endlich verstehen, was mir wirklich hilft, bin aber skeptisch, ob ich diesmal dranbleibe.\n\nDu kannst das Gespräch gerne beginnen.",
      },
      {
        avatarAge: 33,
        avatarEmotionalTone: "ehrgeizig, aber unsicher wegen Rückschritten",
        avatarGender: "male",
        avatarGoal: "schnell wieder sportlich belastbar werden, ohne etwas zu überreizen",
        avatarLifeStage: "aktive Freizeit- und Sportphase",
        avatarName: "Kevin",
        avatarPrimaryProblem: "Instabilitätsgefühl nach Schulterverletzung",
        avatarProfessionOrContext: "sportlich aktiver Kunde nach Trainingsverletzung",
        avatarSecondaryContext: "möchte Belastung steigern, hat aber Sorge vor falschen Schritten",
        openingMessage:
          "Hi, ich bin Kevin, 33 und habe mir beim Sport die Schulter verletzt. Akut ist es besser, aber bestimmte Bewegungen fühlen sich immer noch instabil an. Ich möchte schnell wieder belastbar werden, habe aber Sorge, etwas falsch zu machen oder zu früh zu viel zu wollen.\n\nDu kannst das Gespräch gerne beginnen.",
      },
      {
        avatarAge: 58,
        avatarEmotionalTone: "pragmatisch, geduldig und auf Wiederaufbau fokussiert",
        avatarGender: "female",
        avatarGoal: "nach der Knie-OP Stabilität, Kraft und Alltagssicherheit zurückgewinnen",
        avatarLifeStage: "postoperative Reha-Phase",
        avatarName: "Monika",
        avatarPrimaryProblem: "fehlende Sicherheit und Kraft nach Knie-OP",
        avatarProfessionOrContext: "Alltagsrückkehr nach Operation",
        avatarSecondaryContext: "sucht mehr als kurzfristige Behandlung, sondern strukturierten Aufbau",
        openingMessage:
          "Hallo, ich bin Monika, 58 und hatte vor einigen Wochen eine Knie-OP. Im Alltag geht schon wieder einiges, aber ich merke deutlich, dass mir Sicherheit, Kraft und Beweglichkeit fehlen. Ich suche eine Betreuung, die mich nicht nur kurzfristig behandelt, sondern wirklich wieder aufbaut.\n\nDu kannst das Gespräch gerne beginnen.",
      },
      {
        avatarAge: 27,
        avatarEmotionalTone: "analytisch, anspruchsvoll und leicht frustriert",
        avatarGender: "male",
        avatarGoal: "einen klaren Plan für Haltung, Nacken und langfristige Belastbarkeit bekommen",
        avatarLifeStage: "junger Erwachsener mit Trainingsanspruch",
        avatarName: "Elias",
        avatarPrimaryProblem: "anhaltende Nacken- und Haltungsprobleme",
        avatarProfessionOrContext: "alltags- und trainingsbezogene Fehlbelastung",
        avatarSecondaryContext: "will konkrete Erklärung statt allgemeiner Tipps",
        openingMessage:
          "Hi, ich bin Elias, 27 und habe schon seit Längerem Probleme mit Nacken und Haltung. Ich weiß, dass ich im Alltag und beim Training etwas ändern muss, aber ich brauche einen klaren Plan statt allgemeiner Tipps. Mir ist wichtig, dass ich den Nutzen wirklich verstehe.\n\nDu kannst das Gespräch gerne beginnen.",
      },
      {
        avatarAge: 64,
        avatarEmotionalTone: "vertrauenssuchend und frustriert über wechselhafte Ergebnisse",
        avatarGender: "female",
        avatarGoal: "dauerhaft beweglicher und alltagssicherer werden statt nur kurzfristige Linderung",
        avatarLifeStage: "spätere Lebensphase mit wiederkehrenden Einschränkungen",
        avatarName: "Sabine",
        avatarPrimaryProblem: "wiederkehrende Beschwerden schränken den Alltag ein",
        avatarProfessionOrContext: "ältere Patientin mit steigendem Sicherheitsbedürfnis",
        avatarSecondaryContext: "hat keine Lust auf kurzfristige Effekte ohne nachhaltigen Weg",
        openingMessage:
          "Hallo, ich bin Sabine, 64 und merke, dass mich meine Beschwerden immer wieder im Alltag einschränken. Ich will wieder beweglicher und sicherer werden, aber ich habe keine Lust auf etwas, das nur kurz hilft und danach wieder verpufft. Ich brauche Vertrauen in den Weg.\n\nDu kannst das Gespräch gerne beginnen.",
      },
    ],
    freeChat: "Willkommen zum freien Sales-Training für Physiotherapie und therapeutische Beratung. Wir können direkt ein Erstgespräch, eine Selbstzahler-Empfehlung oder eine Nachsorge-Situation trainieren.",
    situationCoaching: "Willkommen zum Situationscoaching für Physiotherapie. Schilder bitte die reale Beratungs- oder Verkaufssituation so konkret wie möglich, damit ich sie sauber mit dir analysieren kann.",
  },
};
