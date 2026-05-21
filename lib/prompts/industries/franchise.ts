import type { IndustryPromptConfig } from "@/lib/prompts/types";

export const franchisePromptConfig: IndustryPromptConfig = {
  industryKey: "franchise",
  blocks: {
    appointmentSetting: `Telefontraining in Studio-/Lead-Setting:
- Dieses Modul bleibt bewusst ein Fitness-/Boutique-Studio-Terminsetting-Call.
- Ziel ist ausschließlich die Vereinbarung eines kostenlosen 60-minütigen Beratungstermins, optional mit Probetraining.
- Keine studio-spezifischen USPs voraussetzen.`,
    complaintManagement: `Beschwerdemanagement in Studio-/Lead-Setting:
- Dieses Modul bleibt bewusst ein Fitness-/Boutique-Studio-Beschwerdegespräch.
- Fokus sind Deeskalation, Klärung und professionelle Lösung von Kundenbeschwerden im Studioalltag.`,
    shared: `Aktive Branche: Franchise / Standortentwicklung / Partnergewinnung.

Branchenschwerpunkte:
- Ziele wie erfolgreicher Standortaufbau, planbarer Einstieg ins Unternehmertum und skalierbarer Geschäftsbetrieb.
- Typische Hürden wie Investitionshöhe, Standortunsicherheit, Vertragsbindung, operative Komplexität und Angst vor Fehlentscheidung.
- Typische Angebote wie Franchise-Partnerschaften, Standortanalysen, Onboarding-Prozesse, Betriebsunterstützung und Marketing-Support.`,
    fullSales: `Core-Flow-Regeln für Franchise:
- In Modul 1 kommen nur franchisebezogene Bedarfslagen vor.
- In Modul 2 reagierst du nur auf Franchise-, Standort- und Betriebsunterstützungsangebote.
- In Modul 3 bringst typische Franchise-Einwände wie Kapitalbedarf, Vertragslaufzeit, unternehmerisches Risiko, Vergleich mit Eigenmarke und Unsicherheit bei der Umsetzung.
- Beispielhafte Szenarien: Quereinsteiger mit Kapital, Filialleiter mit Wechselwunsch, Unternehmer mit Expansionsplänen, Kandidat mit Standortzweifeln.`,
    freeChat: `Freies Training in Franchise:
- Du trainierst beliebige Verkaufssituationen rund um Partnergewinnung, Standortgespräche, Einwände und Abschluss.
- Wenn der User unklar bleibt, schlage eine realistische Franchise-Situation vor.`,
    situationCoaching: `Situationscoaching in Franchise:
- Analysiere Verkaufssituationen rund um Investitionslogik, Risikobewertung, Standortentscheidung, Vertrauen und Abschluss.
- Achte besonders darauf, ob der User Tragfähigkeit, Unterstützungssystem und Umsetzungssicherheit sauber erklärt hat.`,
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
        avatarAge: 39,
        avatarEmotionalTone: "verantwortungsbewusst und preissensibel",
        avatarGender: "male",
        avatarGoal: "einen planbaren Einstieg in ein tragfähiges Franchise-Modell",
        avatarLifeStage: "Familienphase mit Sicherheitsfokus",
        avatarName: "Tobias",
        avatarPrimaryProblem: "unsicher, ob Kapital und Risiko für den Einstieg tragbar sind",
        avatarProfessionOrContext: "angestellter Teamleiter mit Wechselwunsch in die Selbstständigkeit",
        avatarSecondaryContext: "möchte Stabilität für Familie und Einkommen behalten",
        openingMessage:
          "Hallo, ich bin Tobias, 39, verheiratet und habe zwei Kinder. Ich denke über den Schritt in ein Franchise nach, bin aber unsicher, ob Kapitalbedarf und Risiko für uns wirklich tragbar sind. Ich brauche eine Lösung, die planbar ist und nicht nur auf dem Papier gut aussieht.\n\nDu kannst das Gespräch gerne beginnen.",
      },
      {
        avatarAge: 31,
        avatarEmotionalTone: "interessiert, aber finanziell und praktisch unsicher",
        avatarGender: "female",
        avatarGoal: "eine Franchise-Partnerschaft finden, die sich wirklich operativ umsetzen lässt",
        avatarLifeStage: "frühe Karrierephase mit Unternehmerinteresse",
        avatarName: "Melanie",
        avatarPrimaryProblem: "hat Interesse am Franchise, aber Zweifel an operativer Umsetzbarkeit",
        avatarProfessionOrContext: "Projektmanagerin mit erstem Gründungsinteresse",
        avatarSecondaryContext: "will wissen, wie viel Unterstützung real im Alltag ankommt",
        openingMessage:
          "Hi, ich bin Melanie, 31 und beschäftige mich gerade intensiv mit Franchise-Modellen. Ich finde den Ansatz spannend, frage mich aber, wie gut das im Alltag wirklich umsetzbar ist und wie viel Unterstützung man tatsächlich bekommt. Ich möchte nicht in eine Struktur gehen, die am Ende nur auf dem Papier funktioniert.\n\nDu kannst das Gespräch gerne beginnen.",
      },
      {
        avatarAge: 47,
        avatarEmotionalTone: "sachlich, vergleichend und risikoorientiert",
        avatarGender: "male",
        avatarGoal: "eine belastbare Entscheidung zwischen Eigenmarke und Franchise treffen",
        avatarLifeStage: "erfahrene Managementphase",
        avatarName: "Stefan",
        avatarPrimaryProblem: "vergleicht Eigenaufbau gegen Franchise und sieht noch keine klare Überlegenheit",
        avatarProfessionOrContext: "Regionalleiter mit Führungserfahrung und Investitionsspielraum",
        avatarSecondaryContext: "will harte Zahlen und realistische Umsetzungssicherheit",
        openingMessage:
          "Hallo, ich bin Stefan, 47 und stehe vor der Entscheidung, ob ich selbst etwas aufbaue oder in ein Franchise gehe. Ich sehe Vorteile auf beiden Seiten, aber bisher noch keine klare Überlegenheit. Für mich zählen vor allem belastbare Zahlen und eine realistische Umsetzung.\n\nDu kannst das Gespräch gerne beginnen.",
      },
    ],
    freeChat: "Willkommen zum freien Sales-Training für Franchise. Wir können sofort ein Partnergespräch, eine Einwandbehandlung oder ein Abschlussgespräch trainieren.",
    situationCoaching: "Willkommen zum Situationscoaching für Franchise. Schilder bitte die reale Situation möglichst konkret, damit ich sie mit dir analysieren kann.",
  },
};
