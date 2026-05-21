import type { FranchiseVerticalKey, IndustryKey } from "@/lib/industries";
import type { ComplaintChannelOption } from "@/lib/training-session-config";
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

export type ComplaintAvatarCore = SimulationAvatarProfile & {
  avatarChannel: ComplaintChannelOption;
  avatarComplaintContext: string;
  avatarComplaintGoal: string;
  avatarComplaintHistory: string;
  avatarComplaintTopic: string;
  avatarComplaintType: string;
  avatarEmotionalTone: string;
  avatarInnerAmplifiers: string[];
  avatarLifeContext: string;
  avatarMembershipContext: string;
  avatarName: string;
};

export type ComplaintAvatarCandidate = ComplaintAvatarCore & {
  openingMessage: string;
};

export type ComplaintAvatarSnapshot = ComplaintAvatarCore & {
  createdAt: string;
  id: string;
  industryKey: IndustryKey;
  openingMessage: string;
  organizationId: string | null;
  previousAvatarSnapshotId: string | null;
  sessionId: string;
  userId: string;
};

export type ComplaintAvatarPromptContext = {
  currentAvatar: ComplaintAvatarCandidate | ComplaintAvatarSnapshot;
  previousAvatar?: ComplaintAvatarCandidate | ComplaintAvatarSnapshot | null;
};

type ComplaintSeed = {
  avatarComplaintContext: string;
  avatarComplaintGoal: string;
  avatarComplaintHistory: string;
  avatarComplaintTopic: string;
  avatarComplaintType: string;
  avatarInnerAmplifiers: string[];
  avatarLifeContext: string;
  avatarMembershipContext: string;
};

type ComplaintAvatarSelection = {
  avatar: ComplaintAvatarCandidate;
  comparison: SimulationAvatarDifference | null;
};

const DEFAULT_COMPLAINT_SEEDS: readonly ComplaintSeed[] = [
  {
    avatarComplaintContext:
      "der Monatsbeitrag wurde doppelt abgebucht und seitdem kam keine klare Rückmeldung",
    avatarComplaintGoal:
      "eine verbindliche Korrektur und das Gefühl, dass jemand das Thema wirklich übernimmt",
    avatarComplaintHistory:
      "hat bereits nachgehakt und nur ausweichende Standardantworten bekommen",
    avatarComplaintTopic: "Doppelte Abbuchung",
    avatarComplaintType: "organisatorische Enttäuschung",
    avatarInnerAmplifiers: [
      "fühlt sich mit Standardantworten abgespeist",
      "hat kaum Zeit für weiteren Orga-Aufwand",
    ],
    avatarLifeContext: "balanciert Beruf und privaten Alltag mit wenig Puffer",
    avatarMembershipContext:
      "ist eigentlich regelmäßig im Studio und erwartet saubere Prozesse",
  },
  {
    avatarComplaintContext:
      "mehrere Geräte sind seit Tagen außer Betrieb und stören die Trainingsroutine massiv",
    avatarComplaintGoal:
      "eine belastbare Aussage, wann sich wirklich etwas ändert",
    avatarComplaintHistory:
      "hat schon mehrfach gehört, dass sich jemand kümmert, ohne sichtbare Wirkung",
    avatarComplaintTopic: "Kaputte Geräte",
    avatarComplaintType: "leistungsbezogene Frustration",
    avatarInnerAmplifiers: [
      "zahlt vollen Beitrag für eingeschränkte Leistung",
      "trainiert mit engem Zeitfenster und klarer Routine",
    ],
    avatarLifeContext: "strukturiert den Alltag eng um fixe Trainingseinheiten herum",
    avatarMembershipContext:
      "nutzt vor allem die Fläche und bewertet das Studio stark über Verlässlichkeit",
  },
  {
    avatarComplaintContext:
      "es gab widerspruechliche Aussagen zu Vertrag und Zusatzkosten",
    avatarComplaintGoal:
      "klare Verantwortung und eine faire Klärung statt weiterer Ausreden",
    avatarComplaintHistory:
      "hat schon beim Abschluss nach Transparenz gefragt und fühlt sich jetzt getäuscht",
    avatarComplaintTopic: "Unklare Vertragskosten",
    avatarComplaintType: "Vertrauensbruch",
    avatarInnerAmplifiers: [
      "ist bei Geldthemen besonders sensibel",
      "hat schlechte Erfahrungen mit früheren Studios",
    ],
    avatarLifeContext: "muss finanzielle Entscheidungen gerade besonders sauber abwägen",
    avatarMembershipContext:
      "ist noch nicht lange dabei und prüft, ob das Studio überhaupt passt",
  },
  {
    avatarComplaintContext:
      "mehrfach versprochene Rückrufe sind ausgeblieben und jede Person sagt etwas anderes",
    avatarComplaintGoal:
      "eine verbindliche Entscheidung statt weiterer Vertröstung",
    avatarComplaintHistory:
      "hat schon mehrere Kontakte hinter sich, ohne dass jemand sichtbar Ownership übernommen hat",
    avatarComplaintTopic: "Rückruf nie erfolgt",
    avatarComplaintType: "Kommunikationschaos",
    avatarInnerAmplifiers: [
      "fühlt sich herumgeschoben",
      "hat für solche Prozesse kaum Geduld",
    ],
    avatarLifeContext: "hat einen dichten Alltag und wenig Toleranz für Organisationsfehler",
    avatarMembershipContext:
      "war eigentlich loyal, denkt inzwischen aber über einen Absprung nach",
  },
];

type EnergyComplaintSeedInput = {
  avatarComplaintContext: string;
  avatarComplaintTopic: string;
  avatarComplaintType: string;
};

const ENERGY_COMPLAINT_SEED_INPUTS: readonly EnergyComplaintSeedInput[] = [
  { avatarComplaintTopic: "Stromrechnung trotz PV deutlich höher als erwartet", avatarComplaintContext: "die Stromrechnung liegt trotz PV-Anlage deutlich über den prognostizierten Werten", avatarComplaintType: "Wirtschaftlichkeitsenttäuschung" },
  { avatarComplaintTopic: "Wärmepumpe verbraucht im Winter extrem viel Strom", avatarComplaintContext: "die Wärmepumpe zieht im Winter deutlich mehr Strom als in der Beratung dargestellt", avatarComplaintType: "Betriebskosten-Schock" },
  { avatarComplaintTopic: "Speicher lädt oder entlädt nicht richtig", avatarComplaintContext: "der Speicher lädt und entlädt nicht zuverlässig und die Eigenverbrauchsquote bricht ein", avatarComplaintType: "Systemfunktion gestört" },
  { avatarComplaintTopic: "PV-App zeigt falsche oder unverständliche Daten an", avatarComplaintContext: "die App zeigt unklare oder widersprüchliche Werte und niemand erklärt die Daten verständlich", avatarComplaintType: "Transparenzproblem" },
  { avatarComplaintTopic: "Anlage produziert weniger Strom als versprochen", avatarComplaintContext: "die Anlage liefert seit Monaten spürbar weniger Ertrag als in der Verkaufspräsentation genannt", avatarComplaintType: "Leistungsabweichung" },
  { avatarComplaintTopic: "Wechselrichter fällt regelmäßig aus", avatarComplaintContext: "der Wechselrichter fällt wiederholt aus und verursacht Ertragsverluste", avatarComplaintType: "Technikausfall" },
  { avatarComplaintTopic: "Wärmepumpe ist viel zu laut", avatarComplaintContext: "die Wärmepumpe ist im Betrieb deutlich lauter als zugesagt und stört den Alltag", avatarComplaintType: "Komfortverlust" },
  { avatarComplaintTopic: "Förderungen wurden falsch beantragt oder nicht ausgezahlt", avatarComplaintContext: "bei der Förderung wurden Angaben falsch eingereicht oder Zahlungen bleiben aus", avatarComplaintType: "Förderabwicklung fehlerhaft" },
  { avatarComplaintTopic: "Kommunikation mit dem Installateur bricht nach Verkauf ab", avatarComplaintContext: "nach dem Abschluss ist der Installateur kaum erreichbar und Rückmeldungen bleiben aus", avatarComplaintType: "Serviceabriss" },
  { avatarComplaintTopic: "Wallbox lädt das Auto nicht zuverlässig", avatarComplaintContext: "die Wallbox lädt das Fahrzeug unregelmäßig oder bricht den Ladevorgang ab", avatarComplaintType: "Nutzungsstörung" },
  { avatarComplaintTopic: "Energiespeicher verliert auffällig schnell Kapazität", avatarComplaintContext: "die nutzbare Speicherkapazität sinkt schneller als erwartet", avatarComplaintType: "Alterungs-/Qualitätsproblem" },
  { avatarComplaintTopic: "Heizung wird im Haus nicht richtig warm", avatarComplaintContext: "trotz laufender Anlage werden zentrale Bereiche des Hauses nicht richtig warm", avatarComplaintType: "Versorgungslücke" },
  { avatarComplaintTopic: "Räume haben unterschiedliche Temperaturen", avatarComplaintContext: "die Temperaturverteilung im Haus ist seit der Umrüstung stark unausgeglichen", avatarComplaintType: "Regelungsproblem" },
  { avatarComplaintTopic: "Warmwasser reicht plötzlich nicht mehr aus", avatarComplaintContext: "seit der Umstellung reicht das Warmwasser im Alltag nicht mehr aus", avatarComplaintType: "Komforteinschränkung" },
  { avatarComplaintTopic: "Schimmel oder Feuchtigkeit nach Umrüstung", avatarComplaintContext: "nach der Umrüstung treten Feuchtigkeit und erste Schimmelstellen auf", avatarComplaintType: "Folgeschadenrisiko" },
  { avatarComplaintTopic: "Dach wurde bei der PV-Montage beschädigt", avatarComplaintContext: "bei der PV-Montage sind am Dach Schäden entstanden, die nicht sauber geklärt wurden", avatarComplaintType: "Montageschaden" },
  { avatarComplaintTopic: "Stromausfall trotz installiertem Speicher", avatarComplaintContext: "bei Stromausfall übernimmt der Speicher die Versorgung nicht wie zugesagt", avatarComplaintType: "Ausfallsicherheitsproblem" },
  { avatarComplaintTopic: "Anlage funktioniert nicht im Notstrombetrieb", avatarComplaintContext: "der Notstrombetrieb funktioniert im Ernstfall nicht zuverlässig", avatarComplaintType: "Resilienzversagen" },
  { avatarComplaintTopic: "Smart-Home-/App-Steuerung funktioniert nicht stabil", avatarComplaintContext: "die Steuerung per App/Smart Home ist instabil und Befehle greifen unzuverlässig", avatarComplaintType: "Automationsproblem" },
  { avatarComplaintTopic: "Lange Wartezeiten bei Service oder Reparaturen", avatarComplaintContext: "Service- und Reparaturtermine dauern zu lange und Probleme bleiben offen", avatarComplaintType: "Serviceverzug" },
  { avatarComplaintTopic: "Keine Transparenz über tatsächliche Einsparungen", avatarComplaintContext: "es gibt keine nachvollziehbare Auswertung zu realen Einsparungen", avatarComplaintType: "Controlling-Lücke" },
  { avatarComplaintTopic: "Hohe Nachzahlungen durch falsche Planung der Wärmepumpe", avatarComplaintContext: "durch fehlerhafte Planung entstehen hohe Nachzahlungen bei Strom und Betrieb", avatarComplaintType: "Planungsfehler" },
  { avatarComplaintTopic: "Netzbetreiber-Probleme oder Einspeisung blockiert", avatarComplaintContext: "die Einspeisung ist durch Netzbetreiber-Themen blockiert und niemand steuert aktiv dagegen", avatarComplaintType: "Schnittstellenproblem" },
  { avatarComplaintTopic: "Fehlermeldungen in der App ohne Erklärung", avatarComplaintContext: "die App meldet regelmäßig Fehlercodes, die niemand verständlich erklärt", avatarComplaintType: "Support-/Dokulücke" },
  { avatarComplaintTopic: "Anlage wurde falsch dimensioniert (zu klein/zu groß)", avatarComplaintContext: "die Anlage ist nicht passend dimensioniert und verfehlt den tatsächlichen Bedarf", avatarComplaintType: "Auslegungsfehler" },
  { avatarComplaintTopic: "Hohe Finanzierungskosten trotz versprochener Ersparnis", avatarComplaintContext: "die Finanzierungskosten fressen die versprochenen Einsparungen weitgehend auf", avatarComplaintType: "Wirtschaftlichkeitsbruch" },
  { avatarComplaintTopic: "Kombination aus PV, Speicher und Wärmepumpe arbeitet nicht sauber zusammen", avatarComplaintContext: "PV, Speicher und Wärmepumpe laufen nicht sauber im Verbund und erzeugen Ineffizienz", avatarComplaintType: "Systemintegration fehlerhaft" },
  { avatarComplaintTopic: "Handwerker hinterlassen Baustelle oder Schäden", avatarComplaintContext: "nach der Installation bleiben Baustellenmängel oder Schäden offen", avatarComplaintType: "Ausführungsqualität unzureichend" },
  { avatarComplaintTopic: "Ertragseinbruch durch Verschattung wurde vorher nicht erwähnt", avatarComplaintContext: "spürbare Verschattung senkt den Ertrag deutlich, obwohl das im Vorfeld nicht transparent war", avatarComplaintType: "Beratungs-/Planungslücke" },
  { avatarComplaintTopic: "Gewerbebetrieb hat Lastspitzen trotz Energiesystem nicht im Griff", avatarComplaintContext: "im Gewerbebetrieb bleiben Lastspitzen trotz Systeminvestition hoch", avatarComplaintType: "Lastmanagementversagen" },
  { avatarComplaintTopic: "Produktionsausfälle durch Stromprobleme", avatarComplaintContext: "Stromprobleme führen im Betrieb zu Produktionsunterbrechungen", avatarComplaintType: "Betriebsunterbrechung" },
  { avatarComplaintTopic: "Lastmanagement der Wallboxen funktioniert nicht", avatarComplaintContext: "das Lastmanagement der Wallboxen verteilt Leistung nicht stabil", avatarComplaintType: "Ladeinfrastrukturproblem" },
  { avatarComplaintTopic: "Zu geringe Leistung für Maschinen/Fuhrpark", avatarComplaintContext: "die verfügbare Leistung reicht für Maschinen oder Fuhrpark nicht aus", avatarComplaintType: "Leistungsunterdimensionierung" },
  { avatarComplaintTopic: "Peak-Shaving funktioniert nicht wie verkauft", avatarComplaintContext: "Peak-Shaving liefert nicht die dargestellten Effekte auf Lastspitzen", avatarComplaintType: "Leistungsversprechen verfehlt" },
  { avatarComplaintTopic: "Energiekosten sinken kaum trotz hoher Investition", avatarComplaintContext: "die Energiekosten sinken trotz hoher Investition nur minimal", avatarComplaintType: "ROI-Enttäuschung" },
  { avatarComplaintTopic: "Fehlende Fernwartung oder Monitoring", avatarComplaintContext: "Fernwartung und Monitoring sind nicht zuverlässig verfügbar", avatarComplaintType: "Betriebsführungsdefizit" },
  { avatarComplaintTopic: "Brandschutz-/Versicherungsprobleme nach Installation", avatarComplaintContext: "nach Installation gibt es offene Brandschutz- oder Versicherungsauflagen", avatarComplaintType: "Compliance-Risiko" },
  { avatarComplaintTopic: "Zu lange Amortisationszeit im Vergleich zur Verkaufspräsentation", avatarComplaintContext: "die realistische Amortisationszeit liegt deutlich über der Verkaufsaussage", avatarComplaintType: "Kalkulationsabweichung" },
  { avatarComplaintTopic: "Speicher überhitzt im Technikraum", avatarComplaintContext: "der Speicher zeigt kritische Temperaturen im Technikraum", avatarComplaintType: "Betriebssicherheitsrisiko" },
  { avatarComplaintTopic: "Komplizierte Bedienung für Mitarbeiter oder Hausverwaltung", avatarComplaintContext: "die Bedienung ist für Mitarbeiter oder Hausverwaltung zu komplex und fehleranfällig", avatarComplaintType: "Usability-/Schulungsproblem" },
];

const ENERGY_COMPLAINT_SEEDS: readonly ComplaintSeed[] = ENERGY_COMPLAINT_SEED_INPUTS.map(
  (seed) => ({
    ...seed,
    avatarComplaintGoal:
      "eine verbindliche, terminsichere Lösung mit klarer Verantwortung und transparenter Nachverfolgung",
    avatarComplaintHistory:
      "hat bereits mehrfach nachgehakt, aber nur Teilantworten oder wechselnde Zuständigkeiten erhalten",
    avatarInnerAmplifiers: [
      "fühlt sich nach der Investition mit dem Problem allein gelassen",
      "zweifelt an den ursprünglichen Leistungs- und Einsparzusagen",
    ],
    avatarLifeContext:
      "steht unter hohem Entscheidungsdruck zwischen Kosten, Betriebssicherheit und Alltagstauglichkeit",
    avatarMembershipContext:
      "ist Bestandskunde und erwartet professionellen Service über den Verkauf hinaus",
  })
);

type FinanceComplaintSeedInput = {
  avatarComplaintContext: string;
  avatarComplaintTopic: string;
  avatarComplaintType: string;
};

const FINANCE_COMPLAINT_SEED_INPUTS: readonly FinanceComplaintSeedInput[] = [
  {
    avatarComplaintTopic: "Versicherungsbeitrag plötzlich deutlich erhöht",
    avatarComplaintContext:
      "der Versicherungsbeitrag wurde ohne nachvollziehbare Begründung massiv erhöht",
    avatarComplaintType: "Beitrags- und Transparenzproblem",
  },
  {
    avatarComplaintTopic: "Schadensfall nur teilweise übernommen",
    avatarComplaintContext:
      "im Schadensfall wurde nur ein Teil der erwarteten Leistung übernommen",
    avatarComplaintType: "Leistungsabweichung",
  },
  {
    avatarComplaintTopic: "Lange Wartezeit bis zur Auszahlung",
    avatarComplaintContext:
      "die Auszahlung im Leistungsfall verzögert sich stark ohne klare Terminangabe",
    avatarComplaintType: "Serviceverzug",
  },
  {
    avatarComplaintTopic: "Berater hat wichtige Kosten verschwiegen",
    avatarComplaintContext:
      "relevante Kosten wurden im Verkaufsgespräch nicht transparent dargestellt",
    avatarComplaintType: "Vertrauensbruch",
  },
  {
    avatarComplaintTopic: "Kreditrate steigt unerwartet durch Zinsanpassung",
    avatarComplaintContext:
      "die monatliche Kreditrate steigt deutlich stärker als zuvor dargestellt",
    avatarComplaintType: "Finanzierungsrisiko",
  },
  {
    avatarComplaintTopic: "Schlechte Erreichbarkeit nach Vertragsabschluss",
    avatarComplaintContext:
      "nach Vertragsabschluss sind Ansprechpartner kaum erreichbar und Rückmeldungen fehlen",
    avatarComplaintType: "Betreuungsdefizit",
  },
  {
    avatarComplaintTopic: "Leistungen entsprechen nicht dem Verkaufsgespräch",
    avatarComplaintContext:
      "die tatsächlichen Leistungen weichen klar von den Verkaufszusagen ab",
    avatarComplaintType: "Leistungsversprechen verfehlt",
  },
  {
    avatarComplaintTopic: "Zu hohe Abschluss- oder Bearbeitungsgebühren",
    avatarComplaintContext:
      "die berechneten Abschluss- oder Bearbeitungsgebühren sind unerwartet hoch",
    avatarComplaintType: "Gebührenproblem",
  },
  {
    avatarComplaintTopic: "Kündigung oder Tarifwechsel extrem kompliziert",
    avatarComplaintContext:
      "Kündigung und Tarifwechsel sind unnötig kompliziert und intransparent",
    avatarComplaintType: "Prozesshürde",
  },
  {
    avatarComplaintTopic: "Versicherung lehnt Schaden wegen Kleingedrucktem ab",
    avatarComplaintContext:
      "ein Schaden wird aufgrund schwer nachvollziehbarer Klauseln abgelehnt",
    avatarComplaintType: "Klauselkonflikt",
  },
  {
    avatarComplaintTopic: "Doppelversicherungen verkauft",
    avatarComplaintContext:
      "es wurden überlappende Versicherungen verkauft, die keinen Zusatznutzen bringen",
    avatarComplaintType: "Over-Selling",
  },
  {
    avatarComplaintTopic: "Falsche oder unvollständige Bedarfsanalyse",
    avatarComplaintContext:
      "die Bedarfsanalyse war unvollständig und führte zu unpassenden Produkten",
    avatarComplaintType: "Beratungsfehler",
  },
  {
    avatarComplaintTopic: "Zu teurer Strom- oder Gastarif vermittelt",
    avatarComplaintContext:
      "der vermittelte Strom- oder Gastarif ist deutlich teurer als vergleichbare Optionen",
    avatarComplaintType: "Tariffehlberatung",
  },
  {
    avatarComplaintTopic: "Bonuszahlungen aus Stromvertrag nie erhalten",
    avatarComplaintContext:
      "zugesagte Bonuszahlungen aus dem Stromvertrag wurden nicht ausgezahlt",
    avatarComplaintType: "Bonuskonflikt",
  },
  {
    avatarComplaintTopic: "PKV-Beiträge steigen jedes Jahr massiv",
    avatarComplaintContext:
      "die PKV-Beiträge steigen jährlich stark ohne tragfähige Entlastungsstrategie",
    avatarComplaintType: "Langfristkostenproblem",
  },
  {
    avatarComplaintTopic: "Zahnzusatzversicherung zahlt viel weniger als erwartet",
    avatarComplaintContext:
      "die Zahnzusatzversicherung übernimmt deutlich weniger als im Verkauf suggeriert",
    avatarComplaintType: "Leistungsenttäuschung",
  },
  {
    avatarComplaintTopic: "Restschuldversicherung unnötig mitverkauft",
    avatarComplaintContext:
      "eine Restschuldversicherung wurde ohne klaren Bedarf mitverkauft",
    avatarComplaintType: "Bedarfsferner Zusatzverkauf",
  },
  {
    avatarComplaintTopic: "Finanzierung enthält versteckte Zusatzkosten",
    avatarComplaintContext:
      "in der Finanzierung tauchen versteckte Nebenkosten auf, die vorher nicht klar waren",
    avatarComplaintType: "Kostentransparenzproblem",
  },
  {
    avatarComplaintTopic: "Leasingvertrag deutlich teurer als angekündigt",
    avatarComplaintContext:
      "der Leasingvertrag ist insgesamt deutlich teurer als im Beratungsgespräch angekündigt",
    avatarComplaintType: "Kalkulationsabweichung",
  },
  {
    avatarComplaintTopic: "Vertragsunterlagen schwer verständlich oder irreführend",
    avatarComplaintContext:
      "die Vertragsunterlagen sind schwer verständlich und teilweise irreführend formuliert",
    avatarComplaintType: "Dokumentationsproblem",
  },
  {
    avatarComplaintTopic: "Im Schadensfall fühlt sich niemand zuständig",
    avatarComplaintContext:
      "im Schadensfall übernimmt niemand klar die Verantwortung für den Fall",
    avatarComplaintType: "Zuständigkeitschaos",
  },
  {
    avatarComplaintTopic: "Hohe Selbstbeteiligung wurde vorher nicht erklärt",
    avatarComplaintContext:
      "die hohe Selbstbeteiligung wurde vor Vertragsabschluss nicht transparent erklärt",
    avatarComplaintType: "Aufklärungsdefizit",
  },
  {
    avatarComplaintTopic: "Falsche Laufzeit oder Tilgung empfohlen",
    avatarComplaintContext:
      "die empfohlene Laufzeit oder Tilgungsstruktur passt nicht zur finanziellen Realität",
    avatarComplaintType: "Finanzierungsfehlpassung",
  },
  {
    avatarComplaintTopic: "Schlechte Beratung zur Altersvorsorge",
    avatarComplaintContext:
      "die Altersvorsorgeberatung war oberflächlich und nicht auf die Ziele abgestimmt",
    avatarComplaintType: "Strategiemangel",
  },
  {
    avatarComplaintTopic: "Hohe Vorfälligkeitsentschädigung beim Kredit",
    avatarComplaintContext:
      "die Vorfälligkeitsentschädigung beim Kredit wurde nicht verständlich vorab erklärt",
    avatarComplaintType: "Konditionsproblem",
  },
  {
    avatarComplaintTopic: "Leistungen der Berufsunfähigkeitsversicherung greifen nicht",
    avatarComplaintContext:
      "im Leistungsfall der BU greifen zugesagte Leistungen nicht wie erwartet",
    avatarComplaintType: "Leistungslücke",
  },
  {
    avatarComplaintTopic: "Tarif passt nicht zur Lebenssituation des Kunden",
    avatarComplaintContext:
      "der gewählte Tarif passt nicht zur aktuellen Lebens- und Einkommenssituation",
    avatarComplaintType: "Tariffehlpassung",
  },
  {
    avatarComplaintTopic: "Nach Vertragsabschluss kaum Betreuung oder Service",
    avatarComplaintContext:
      "nach Abschluss fehlt eine verlässliche Betreuung bei Rückfragen und Anpassungen",
    avatarComplaintType: "After-Sales-Defizit",
  },
  {
    avatarComplaintTopic: "Vergleichsangebote wurden bewusst nicht gezeigt",
    avatarComplaintContext:
      "relevante Vergleichsangebote wurden im Beratungsprozess nicht transparent offengelegt",
    avatarComplaintType: "Intransparente Beratung",
  },
  {
    avatarComplaintTopic: "Kunde zahlt seit Jahren zu viel ohne Optimierung",
    avatarComplaintContext:
      "bestehende Verträge wurden lange nicht optimiert und verursachen laufend Mehrkosten",
    avatarComplaintType: "Optimierungsversäumnis",
  },
  {
    avatarComplaintTopic: "Versicherung kündigt nach Schadensfall den Vertrag",
    avatarComplaintContext:
      "nach einem Schadensfall wurde der Vertrag überraschend gekündigt",
    avatarComplaintType: "Vertragsstabilitätsproblem",
  },
  {
    avatarComplaintTopic: "Stromanbieter lockt mit Billigpreis und erhöht später massiv",
    avatarComplaintContext:
      "ein vermeintlicher Billigtarif wurde nach kurzer Zeit stark verteuert",
    avatarComplaintType: "Preislockproblem",
  },
  {
    avatarComplaintTopic: "Kredit unnötig teuer trotz besserer Alternativen",
    avatarComplaintContext:
      "der abgeschlossene Kredit ist unnötig teuer, obwohl bessere Alternativen verfügbar waren",
    avatarComplaintType: "Beratungsvorteil nicht genutzt",
  },
  {
    avatarComplaintTopic: "Finanzberater verkauft provisionsgetrieben statt bedarfsorientiert",
    avatarComplaintContext:
      "die Produktempfehlung wirkt provisionsgetrieben statt am Bedarf orientiert",
    avatarComplaintType: "Interessenkonflikt",
  },
  {
    avatarComplaintTopic: "Rückrufversprechen werden nie eingehalten",
    avatarComplaintContext:
      "zugesagte Rückrufe werden wiederholt nicht eingehalten",
    avatarComplaintType: "Kommunikationsproblem",
  },
  {
    avatarComplaintTopic: "Falsche Angaben im Antrag sorgen später für Probleme",
    avatarComplaintContext:
      "falsche oder unvollständige Antragsdaten führen im Nachgang zu Leistungsproblemen",
    avatarComplaintType: "Antragsfehler",
  },
  {
    avatarComplaintTopic: "Digitale Kundenportale funktionieren nicht richtig",
    avatarComplaintContext:
      "digitale Portale zeigen Fehler, unvollständige Daten oder blockieren Prozesse",
    avatarComplaintType: "Digitaler Servicefehler",
  },
  {
    avatarComplaintTopic: "Vertragswechsel verursacht Versorgungslücken",
    avatarComplaintContext:
      "durch den Vertragswechsel sind temporäre Versorgungslücken entstanden",
    avatarComplaintType: "Wechselprozess-Fehler",
  },
  {
    avatarComplaintTopic: "Kunde versteht seine Verträge trotz Beratung nicht",
    avatarComplaintContext:
      "trotz Beratung bleiben zentrale Vertragsinhalte unverständlich",
    avatarComplaintType: "Verständnisdefizit",
  },
  {
    avatarComplaintTopic: "Zu viele Produkte gleichzeitig verkauft (Over-Selling)",
    avatarComplaintContext:
      "es wurden zu viele Produkte gleichzeitig verkauft, ohne klare Priorisierung",
    avatarComplaintType: "Over-Selling",
  },
  {
    avatarComplaintTopic: "Fonds entwickeln sich deutlich schlechter als versprochen",
    avatarComplaintContext:
      "die Fondsentwicklung liegt klar unter den im Verkauf kommunizierten Erwartungen",
    avatarComplaintType: "Performanceabweichung",
  },
  {
    avatarComplaintTopic: "Hohe Gebühren fressen die Rendite auf",
    avatarComplaintContext:
      "laufende Kosten und Gebühren reduzieren die Rendite deutlich stärker als erwartet",
    avatarComplaintType: "Kosten-Rendite-Konflikt",
  },
  {
    avatarComplaintTopic: "Risiko der Geldanlage wurde falsch eingeschätzt",
    avatarComplaintContext:
      "das tatsächliche Risiko der Anlage wurde im Beratungsprozess zu niedrig dargestellt",
    avatarComplaintType: "Risikofehlbewertung",
  },
  {
    avatarComplaintTopic: "Kunde versteht das Investmentprodukt nicht richtig",
    avatarComplaintContext:
      "das Investmentprodukt wurde nicht so erklärt, dass Chancen und Risiken klar verstanden sind",
    avatarComplaintType: "Produktverständnislücke",
  },
  {
    avatarComplaintTopic: "Verluste werden heruntergespielt oder schön geredet",
    avatarComplaintContext:
      "Verluste in der Anlage werden verharmlost statt ehrlich aufgearbeitet",
    avatarComplaintType: "Kommunikations- und Vertrauensproblem",
  },
  {
    avatarComplaintTopic: "Zu riskante Produkte für die Lebenssituation empfohlen",
    avatarComplaintContext:
      "die empfohlenen Produkte sind für Alter, Ziele und Risikoprofil zu aggressiv",
    avatarComplaintType: "Suitability-Verstoß",
  },
  {
    avatarComplaintTopic: "Berater meldet sich nur beim Verkauf neuer Produkte",
    avatarComplaintContext:
      "laufende Betreuung fehlt, Kontakt erfolgt nur bei neuen Verkaufsanlässen",
    avatarComplaintType: "Betreuungslücke",
  },
  {
    avatarComplaintTopic: "Depot ist schlecht diversifiziert",
    avatarComplaintContext:
      "das Depot ist unzureichend diversifiziert und konzentriert Klumpenrisiken",
    avatarComplaintType: "Portfoliostrukturproblem",
  },
  {
    avatarComplaintTopic: "Hohe Ausgabeaufschläge wurden verschwiegen",
    avatarComplaintContext:
      "Ausgabeaufschläge wurden vor Abschluss nicht transparent kommuniziert",
    avatarComplaintType: "Gebührentransparenzproblem",
  },
  {
    avatarComplaintTopic: "Investmentstrategie wird ständig geändert",
    avatarComplaintContext:
      "die Strategie wird ohne klare Logik laufend geändert und wirkt inkonsistent",
    avatarComplaintType: "Strategieinstabilität",
  },
  {
    avatarComplaintTopic: "Anleger fühlt sich bei Kurseinbrüchen allein gelassen",
    avatarComplaintContext:
      "bei Kurseinbrüchen fehlt proaktive Einordnung und klare Handlungsführung",
    avatarComplaintType: "Krisenkommunikationsdefizit",
  },
  {
    avatarComplaintTopic: "Zu viele aktive Fonds statt günstiger ETF-Lösungen verkauft",
    avatarComplaintContext:
      "es wurden kostenintensive aktive Fonds statt naheliegender ETF-Lösungen empfohlen",
    avatarComplaintType: "Kostenineffiziente Produktwahl",
  },
  {
    avatarComplaintTopic: "Versprochene Renditen wurden nie erreicht",
    avatarComplaintContext:
      "in Aussicht gestellte Renditeziele wurden über längere Zeit klar verfehlt",
    avatarComplaintType: "Renditeversprechen verfehlt",
  },
  {
    avatarComplaintTopic: "Steuerliche Nachteile wurden nicht erklärt",
    avatarComplaintContext:
      "steuerliche Nachteile und Folgen wurden vor Abschluss nicht verständlich erläutert",
    avatarComplaintType: "Steueraufklärungsdefizit",
  },
  {
    avatarComplaintTopic: "Anlageberatung wirkt eher wie Verkauf statt echte Strategie",
    avatarComplaintContext:
      "die Anlageberatung wirkt produktgetrieben statt strategisch und zielorientiert",
    avatarComplaintType: "Strategie- statt Verkaufsanspruch verfehlt",
  },
];

const FINANCE_COMPLAINT_SEEDS: readonly ComplaintSeed[] =
  FINANCE_COMPLAINT_SEED_INPUTS.map((seed) => ({
    ...seed,
    avatarComplaintGoal:
      "eine verbindliche Klärung mit transparenter Begründung und konkretem nächsten Schritt",
    avatarComplaintHistory:
      "hat bereits nachgefasst, aber bislang nur Teilantworten oder wechselnde Aussagen erhalten",
    avatarInnerAmplifiers: [
      "verliert Vertrauen bei unklaren Kosten und fehlender Verbindlichkeit",
      "will finanzielle Entscheidungen nachvollziehbar und revisionssicher treffen",
    ],
    avatarLifeContext:
      "muss private und berufliche Finanzentscheidungen eng abgestimmt und planbar halten",
    avatarMembershipContext:
      "ist Bestandskunde und erwartet verlässliche Beratung sowie saubere Betreuung nach Vertragsabschluss",
  }));

function getComplaintSeedsForIndustry(industryKey: IndustryKey) {
  if (industryKey === "energy") {
    return ENERGY_COMPLAINT_SEEDS;
  }

  if (industryKey === "finance") {
    return FINANCE_COMPLAINT_SEEDS;
  }

  return DEFAULT_COMPLAINT_SEEDS;
}

function getFranchiseComplaintSeeds(
  vertical: FranchiseVerticalKey
): readonly ComplaintSeed[] {
  if (vertical === "restaurant") {
    return [
      {
        avatarComplaintContext:
          "die Warenkosten und Personalauslastung liegen deutlich über der Business-Plan-Annahme",
        avatarComplaintGoal:
          "eine belastbare operative Nachsteuerung mit klaren Maßnahmen und Fristen",
        avatarComplaintHistory:
          "hat schon mehrfach auf Abweichungen hingewiesen, aber nur allgemeine Antworten erhalten",
        avatarComplaintTopic: "Marge kippt im Restaurantbetrieb",
        avatarComplaintType: "Operative Wirtschaftlichkeitsabweichung",
        avatarInnerAmplifiers: [
          "hoher Druck auf Liquidität und Teamplanung",
          "zweifelt an der Tragfähigkeit der Standortannahmen",
        ],
        avatarLifeContext: "führt einen anspruchsvollen Schichtbetrieb mit hoher Personalvolatilität",
        avatarMembershipContext:
          "ist Franchisepartner und erwartet operatives Coaching statt Standardfloskeln",
      },
    ];
  }
  if (vertical === "fashion") {
    return [
      {
        avatarComplaintContext:
          "Sortiment und Saisonsteuerung funktionieren nicht wie in der Präsentation dargestellt",
        avatarComplaintGoal:
          "klare Steuerungslogik für Warenrotation, Abschriften und Flächenproduktivität",
        avatarComplaintHistory:
          "hat bereits Kennzahlen geteilt, aber keine konkrete Handlungsempfehlung erhalten",
        avatarComplaintTopic: "Warenrotation/Abschriften außer Kontrolle",
        avatarComplaintType: "Sortiments- und Steuerungsproblem",
        avatarInnerAmplifiers: [
          "hohe Kapitalbindung in langsam drehender Ware",
          "sinkendes Vertrauen in die Zentrale",
        ],
        avatarLifeContext: "muss täglich zwischen Verkauf, Teamführung und Warensteuerung balancieren",
        avatarMembershipContext:
          "ist Franchisenehmer und fordert umsetzbare, standortrelevante Steuerungsmaßnahmen",
      },
    ];
  }
  if (vertical === "fitness") {
    return [
      {
        avatarComplaintContext:
          "Mitgliederentwicklung bleibt klar hinter den Standortzielen zurück, trotz lokaler Maßnahmen",
        avatarComplaintGoal:
          "eine konkrete Pipeline- und Bindungsstrategie mit messbaren Zwischenzielen",
        avatarComplaintHistory:
          "hat wiederholt um Unterstützung gebeten, aber nur generische Marketinghinweise bekommen",
        avatarComplaintTopic: "Mitgliederaufbau/Bindung unter Plan",
        avatarComplaintType: "Wachstums- und Retentionsproblem",
        avatarInnerAmplifiers: [
          "Fixkosten laufen stabil, Umsatzentwicklung nicht",
          "hohe Belastung durch Fluktuation im Team",
        ],
        avatarLifeContext: "arbeitet operativ nah am Tagesgeschäft mit wenig Puffer",
        avatarMembershipContext:
          "ist Franchisepartner mit Fokus auf stabile Auslastung und planbares Wachstum",
      },
    ];
  }

  return [];
}

function getRandomItem<T>(items: readonly T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function buildComplaintTone(profile: SimulationAvatarProfile) {
  const parts = [
    profile.avatarDifficulty === "easy"
      ? "noch kontrolliert"
      : profile.avatarDifficulty === "medium"
        ? "klar genervt"
        : profile.avatarDifficulty === "hard"
          ? "spürbar gereizt"
          : "nahe an Gesprächsabbruch",
    profile.avatarDiscType === "dominant"
      ? "druckvoll"
      : profile.avatarDiscType === "analytical"
        ? "kühl und prüfend"
        : profile.avatarDiscType === "steady"
          ? "empfindlich und verletzt"
          : "sprunghaft und wechselhaft",
  ];

  return parts.join(", ");
}

function buildOpeningMessage(avatar: ComplaintAvatarCandidate) {
  if (avatar.avatarDifficulty === "easy") {
    return `Guten Tag, hier ist ${avatar.avatarName}. Ich möchte ein Anliegen einmal sauber klären: ${avatar.avatarComplaintContext}.`;
  }

  if (avatar.avatarDifficulty === "medium") {
    return `Hallo, ${avatar.avatarName} hier. Ich spreche das jetzt nochmal an, weil ${avatar.avatarComplaintContext} und ich bisher keine wirklich klare Antwort bekommen habe.`;
  }

  if (avatar.avatarDifficulty === "hard") {
    return `${avatar.avatarName} hier. Ich sage es direkt: ${avatar.avatarComplaintContext} und langsam habe ich wirklich das Gefühl, dass mich hier niemand sauber ernst nimmt.`;
  }

  return `Hallo, hier ist ${avatar.avatarName}. Ehrlich gesagt bin ich kurz davor, das Gespräch gleich wieder zu beenden, weil ${avatar.avatarComplaintContext} und ich seit Längerem nur vertröstet werde.`;
}

export function selectComplaintAvatar(params: {
  channel: ComplaintChannelOption;
  difficulty: SessionDifficulty;
  franchiseVertical?: FranchiseVerticalKey;
  industryKey: IndustryKey;
  previousAvatar?: ComplaintAvatarSnapshot | null;
}) {
  const baseSeeds = getComplaintSeedsForIndustry(params.industryKey);
  const verticalSeeds =
    params.industryKey === "franchise"
      ? getFranchiseComplaintSeeds(params.franchiseVertical ?? "other")
      : [];
  const seed = getRandomItem(
    verticalSeeds.length > 0 ? verticalSeeds : baseSeeds
  );
  const selection = selectDiverseSimulationAvatarProfile({
    module: "complaint_management",
    previousAvatar: params.previousAvatar ?? null,
    preferredDifficulty: params.difficulty,
  });
  const avatarName = maybeUseAlternativeName(
    selection.profile.avatarGender,
    pickAvatarName(selection.profile.avatarGender)
  );
  const avatar = {
    ...selection.profile,
    ...seed,
    avatarChannel: params.channel,
    avatarEmotionalTone: buildComplaintTone(selection.profile),
    avatarName,
    openingMessage: "",
  } satisfies ComplaintAvatarCandidate;

  avatar.openingMessage = buildOpeningMessage(avatar);

  return {
    avatar,
    comparison: selection.comparison,
  } satisfies ComplaintAvatarSelection;
}

function formatAvatarSummaryLines(
  avatar: ComplaintAvatarCandidate | ComplaintAvatarSnapshot
) {
  return [
    `- Name: ${avatar.avatarName}`,
    getProfileSummaryLines(avatar),
    `- Kanal: ${avatar.avatarChannel}`,
    `- Beschwerdetyp: ${avatar.avatarComplaintType}`,
    `- Beschwerdeanlass: ${avatar.avatarComplaintTopic}`,
    `- Konkreter Auslöser: ${avatar.avatarComplaintContext}`,
    `- Mitgliedskontext: ${avatar.avatarMembershipContext}`,
    `- Alltagskontext: ${avatar.avatarLifeContext}`,
    `- Frustrationsverstärker: ${avatar.avatarInnerAmplifiers.join("; ")}`,
    `- Vorgeschichte: ${avatar.avatarComplaintHistory}`,
    `- Erwartung an das Gespräch: ${avatar.avatarComplaintGoal}`,
    `- Emotionaler Ton: ${avatar.avatarEmotionalTone}`,
  ].join("\n");
}

export function buildComplaintAvatarPrompt(
  context?: ComplaintAvatarPromptContext | null
) {
  if (!context) {
    return "";
  }

  const currentAvatar = context.currentAvatar;
  const blocks = [
    `AVATAR-VORGABE FÜR DIESE BESCHWERDE-SESSION:
Bleibe exakt bei diesem Kundenprofil. Verändere weder Kanal, Beschwerdebild, Historie noch Temperament.

${formatAvatarSummaryLines(currentAvatar)}

- Berufssituation: ${formatJobSituation(currentAvatar.avatarJobSituation)}
- Familiensituation: ${formatFamilySituation(currentAvatar.avatarFamilySituation)}
- Zeitbudget: ${formatTimeBudget(currentAvatar.avatarTimeBudget)}
- Finanzieller Spielraum: ${formatFinancialBudget(currentAvatar.avatarFinancialBudget)}
- Disc-Typ: ${formatDiscType(currentAvatar.avatarDiscType)} (${getDiscPromptGuidance(
      currentAvatar.avatarDiscType
    )})
- Difficulty: ${currentAvatar.avatarDifficulty} (${getDifficultyPromptGuidance(
      currentAvatar.avatarDifficulty
    )})
- Typische Einwände und Friktionen: ${currentAvatar.avatarObjections
      .map((entry) => formatObjectionType(entry))
      .join(", ")}

Die Difficulty muss sich real zeigen in Geduld, Härte, Abbruchneigung, Vertrauen und Lösungswahrscheinlichkeit.
Der Disc-Typ muss Verhalten, Sprache und Reaktionstempo sichtbar prägen.`,
  ];

  if (context.previousAvatar) {
    const difference = calculateSimulationAvatarDifference(
      context.previousAvatar,
      currentAvatar
    );

    blocks.push(`AVATAR-MEMORY ZUR ABGRENZUNG:
Der letzte Beschwerde-Avatar war:

${formatAvatarSummaryLines(context.previousAvatar)}

Die neue Session wurde bewusst deutlich anders angelegt.
- Zielwert ist eine spürbare Abweichung von rund 70 Prozent.
- Bereits bewusst veränderte Profil-Dimensionen: ${describeDifferenceDimensions(
        difference
      )}.
- Wiederhole nicht denselben Grundkonflikt mit nur leicht veränderten Details.`);
  }

  return blocks.join("\n\n");
}
