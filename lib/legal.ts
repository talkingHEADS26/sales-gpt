import { OFFICIAL_CONTACT_EMAIL } from "@/lib/mail-config";

export const legalProvider = {
  addressLine: "Köttlingerweg 11",
  cityLine: "44793 Bochum",
  email: OFFICIAL_CONTACT_EMAIL,
  name: "Christian Guzien",
} as const;

export const legalNavigationLinks = [
  {
    href: "/impressum",
    label: "Impressum",
  },
  {
    href: "/datenschutz",
    label: "Datenschutz",
  },
  {
    href: "/agb",
    label: "AGB",
  },
] as const;

export const legalPrivacySections = [
  {
    title: "1. Anbieterangaben",
    paragraphs: [
      `${legalProvider.name}`,
      legalProvider.addressLine,
      legalProvider.cityLine,
      `E-Mail: ${legalProvider.email}`,
    ],
  },
  {
    title: "2. Überblick",
    paragraphs: [
      "AbschlussIO verarbeitet nur die Daten, die für den Betrieb der Plattform, die Sicherung des Zugangs und ausdrücklich freigegebene optionale Funktionen erforderlich sind.",
    ],
  },
  {
    title: "3. Cookies und ähnliche Technologien",
    paragraphs: [
      "Wir unterscheiden zwischen notwendigen Cookies sowie optionalen Kategorien für Statistik / Analyse und Marketing. Optionale Kategorien bleiben deaktiviert, bis Sie aktiv zustimmen.",
    ],
  },
  {
    title: "4. Ihre Auswahl",
    paragraphs: [
      "Ihre Cookie-Entscheidung wird lokal im Browser gespeichert. Sie können diese Auswahl jederzeit über den Link „Cookie-Einstellungen“ erneut öffnen und anpassen.",
    ],
  },
  {
    title: "5. Rechtlicher Hinweis",
    paragraphs: [
      "Diese Seite bildet die technische Grundlage für die Datenschutz-Navigation in der App. Die finale rechtliche Ausgestaltung sollte vor Produktivbetrieb mit Ihrer Datenschutz- oder Rechtsberatung abgestimmt werden.",
    ],
  },
] as const;

export const legalNoticeSections = [
  {
    title: "Anbieter",
    paragraphs: [
      legalProvider.name,
      legalProvider.addressLine,
      legalProvider.cityLine,
    ],
  },
  {
    title: "Kontakt",
    paragraphs: [`E-Mail: ${legalProvider.email}`],
  },
  {
    title: "Hinweis",
    paragraphs: [
      "Weitere Pflichtangaben wie Handelsregister, USt-IdNr. oder vertretungsberechtigte Personen sind im bestehenden Projekt nicht hinterlegt und werden daher hier nicht ergänzt.",
    ],
  },
] as const;

export const termsSections = [
  {
    title: "Geltungsbereich",
    paragraphs: [
      'Diese Allgemeinen Geschäftsbedingungen (nachfolgend "AGB") gelten für alle Verträge über die Nutzung der Plattform AbschlussIO (nachfolgend "Plattform"), die zwischen Christian Guzien, Köttlingerweg 11, 44793 Bochum (nachfolgend "Anbieter") und dem jeweiligen Nutzer (nachfolgend "Kunde") geschlossen werden.',
      "Die Plattform ist ein KI-gestützter interaktiver Sales-Trainer, der auf dem OpenAI Response Model basiert und Soloselbstständigen sowie Teams (3er, 5er oder Enterprise) die Optimierung ihrer Verkaufsgespräche durch Training mit künstlicher Intelligenz ermöglicht.",
    ],
  },
  {
    title: "Vertragsschluss und Registrierung",
    bullets: [
      "Der Vertrag kommt durch die Registrierung des Kunden auf der Plattform und die anschließende Bestätigung durch den Anbieter zustande.",
      "Mit der Registrierung gibt der Kunde ein verbindliches Angebot zum Abschluss eines Nutzungsvertrags ab. Der Anbieter nimmt dieses Angebot durch Freischaltung des Zugangs zur Plattform oder durch eine ausdrückliche Bestätigungserklärung (z.B. per E-Mail) an.",
      "Der Kunde ist verpflichtet, bei der Registrierung vollständige und wahrheitsgemäße Angaben zu machen. Änderungen seiner Daten hat der Kunde unverzüglich zu aktualisieren.",
    ],
  },
  {
    title: "Leistungsumfang",
    paragraphs: [
      "Der Anbieter stellt dem Kunden die Plattform zur Nutzung über das Internet zur Verfügung. Die konkrete Leistung richtet sich nach dem vom Kunden gebuchten Tarif.",
      "Verfügbare Tarife:",
    ],
    bullets: [
      "Solo-Tarif: 39,00 EUR (netto) pro Monat für einen Einzelnutzer",
      "3er-Team-Tarif: 79,00 EUR (netto) pro Monat für bis zu drei Nutzer",
      "5er-Team-Tarif: 99,00 EUR (netto) pro Monat für bis zu fünf Nutzer",
      "Enterprise-Tarif: Individuelle Vereinbarung für größere Teams",
      "Der Anbieter ist berechtigt, den Leistungsumfang zu erweitern oder zu ändern, sofern dies der technischen Weiterentwicklung dient und die Funktionalität der Plattform nicht wesentlich beeinträchtigt wird.",
      "Eine Verfügbarkeit der Plattform von 100% kann technisch nicht garantiert werden. Der Anbieter strebt jedoch eine Verfügbarkeit von mindestens 98% im Jahresmittel an, ausgenommen geplante Wartungsarbeiten.",
    ],
  },
  {
    title: "Nutzungsbedingungen",
    paragraphs: [
      "Die Zugangsdaten sind vertraulich zu behandeln und dürfen nicht an Dritte weitergegeben werden. Der Kunde ist für alle Aktivitäten verantwortlich, die unter Verwendung seiner Zugangsdaten vorgenommen werden.",
      "Der Kunde ist verpflichtet, die Plattform ausschließlich für rechtmäßige Zwecke zu nutzen. Insbesondere ist untersagt:",
    ],
    bullets: [
      "Die Verbreitung von rechtswidrigen, beleidigenden, diffamierenden oder anderweitig anstößigen Inhalten",
      "Die Verwendung automatisierter Systeme oder Software zur unautorisierten Datengewinnung (Scraping)",
      "Manipulationsversuche oder sonstige Beeinträchtigungen der Plattform",
      "Die Weitergabe oder kommerzielle Nutzung der über die Plattform gewonnenen Erkenntnisse ohne Zustimmung des Anbieters",
      "Bei Verstößen gegen diese Nutzungsbedingungen ist der Anbieter berechtigt, den Zugang zur Plattform zu sperren oder das Vertragsverhältnis außerordentlich zu kündigen.",
    ],
  },
  {
    title: "Vertragslaufzeit und Kündigung",
    paragraphs: [
      "Der Kunde kann zwischen zwei Vertragsmodellen wählen:",
      "Flex-Tarif (monatlich kündbar):",
    ],
    bullets: [
      "Vertragslaufzeit: 1 Monat",
      "Verlängert sich automatisch um jeweils einen weiteren Monat, sofern nicht gekündigt wird",
      "Kündigungsfrist: 4 Wochen vor Ablauf der jeweiligen Vertragslaufzeit",
    ],
    subSections: [
      {
        title: "Standard-Tarif (6 Monate Mindestlaufzeit)",
        bullets: [
          "Vertragslaufzeit: 6 Monate",
          "Verlängert sich automatisch um jeweils weitere 6 Monate, sofern nicht gekündigt wird",
          "Kündigungsfrist: 4 Wochen vor Ablauf der jeweiligen Vertragslaufzeit",
        ],
      },
      {
        title: "Weitere Regelungen",
        bullets: [
          `Die Kündigung bedarf der Textform (z.B. E-Mail an ${legalProvider.email}).`,
          "Das Recht zur außerordentlichen Kündigung aus wichtigem Grund bleibt für beide Parteien unberührt. Ein wichtiger Grund liegt insbesondere vor, wenn der Kunde gegen wesentliche Pflichten aus diesen AGB verstößt oder der Anbieter die Plattform aus technischen oder rechtlichen Gründen nicht mehr bereitstellen kann.",
        ],
      },
    ],
  },
  {
    title: "Vergütung und Zahlung",
    bullets: [
      "Die Preise verstehen sich als Nettopreise. Hinzu kommt die jeweils gültige gesetzliche Umsatzsteuer.",
      "Die Zahlung erfolgt monatlich im Voraus.",
      "Die Abrechnung erfolgt über unseren Zahlungsdienstleister CopeCart.",
      "Verfügbare Zahlungsmethoden: Kreditkarte, PayPal und Apple Pay.",
      "Die verfügbaren Zahlungsmethoden werden im Checkout über CopeCart angezeigt.",
      "Bei Zahlungsverzug ist der Anbieter berechtigt, den Zugang zur Plattform zu sperren, bis die ausstehenden Beträge beglichen sind.",
      "Der Anbieter behält sich das Recht vor, die Preise mit einer Ankündigungsfrist von 4 Wochen anzupassen. Bestandskunden werden per E-Mail über die Preisanpassung informiert. Der Kunde hat in diesem Fall ein Sonderkündigungsrecht binnen 4 Wochen nach Bekanntgabe der Preiserhöhung.",
    ],
  },
  {
    title: "Haftung",
    paragraphs: ["Der Anbieter haftet unbeschränkt:"],
    bullets: [
      "für Vorsatz und grobe Fahrlässigkeit",
      "für die Verletzung von Leben, Körper oder Gesundheit",
      "nach den Vorschriften des Produkthaftungsgesetzes",
      "Bei leicht fahrlässiger Verletzung wesentlicher Vertragspflichten (Kardinalpflichten) haftet der Anbieter der Höhe nach begrenzt auf den bei Vertragsschluss vorhersehbaren und vertragstypischen Schaden.",
      "Im Übrigen ist die Haftung des Anbieters ausgeschlossen. Dies gilt insbesondere für Schäden, die durch unsachgemäße Nutzung der Plattform, durch Dritte oder durch technische Störungen entstehen, auf die der Anbieter keinen Einfluss hat.",
    ],
  },
  {
    title: "Haftungsausschluss für KI-generierte Inhalte",
    bullets: [
      "Die Plattform nutzt künstliche Intelligenz (OpenAI Response Model), um interaktive Trainingsinhalte zu generieren. Die durch die KI erzeugten Inhalte, Empfehlungen und Trainingsvorschläge dienen ausschließlich zu Lern- und Trainingszwecken.",
      "Der Anbieter übernimmt keine Gewähr für die Richtigkeit, Vollständigkeit oder Aktualität der KI-generierten Inhalte. Insbesondere können diese keine individuelle Beratung oder professionelle Verkaufsschulung durch qualifizierte Fachkräfte ersetzen.",
      "Der Kunde ist selbst dafür verantwortlich, die durch die KI generierten Inhalte kritisch zu prüfen und eigenverantwortlich zu entscheiden, ob und in welcher Form er diese in seiner beruflichen Praxis anwendet.",
      "Der Anbieter haftet nicht für Schäden, die aus der Anwendung von KI-generierten Empfehlungen oder Trainingsvorschlägen in realen Verkaufssituationen entstehen, soweit ihn kein Vorsatz oder grobe Fahrlässigkeit trifft.",
    ],
  },
  {
    title: "Datenschutz",
    bullets: [
      "Der Anbieter verarbeitet personenbezogene Daten des Kunden im Einklang mit den geltenden datenschutzrechtlichen Bestimmungen, insbesondere der Datenschutz-Grundverordnung (DSGVO).",
      "Nähere Informationen zur Datenverarbeitung entnimmt der Kunde der Datenschutzerklärung auf der Plattform.",
    ],
  },
  {
    title: "Geistiges Eigentum",
    bullets: [
      'Alle Rechte an der Plattform, einschließlich der Software, des Designs, der Inhalte und der Marke "AbschlussIO", stehen dem Anbieter oder dessen Lizenzgebern zu.',
      "Dem Kunden wird lediglich ein einfaches, nicht übertragbares Nutzungsrecht für die Dauer des Vertragsverhältnisses eingeräumt. Eine Vervielfältigung, Verbreitung oder öffentliche Zugänglichmachung der Plattform oder ihrer Inhalte ist ohne vorherige schriftliche Zustimmung des Anbieters untersagt.",
    ],
  },
  {
    title: "Änderungen der AGB",
    bullets: [
      "Der Anbieter behält sich das Recht vor, diese AGB mit Wirkung für die Zukunft zu ändern, sofern dies zur Anpassung an geänderte rechtliche Rahmenbedingungen oder zur Behebung von Regelungslücken erforderlich ist.",
      "Änderungen werden dem Kunden mindestens 4 Wochen vor ihrem Inkrafttreten per E-Mail mitgeteilt. Widerspricht der Kunde den geänderten AGB nicht innerhalb von 4 Wochen nach Zugang der Mitteilung, gelten die geänderten AGB als angenommen. Der Anbieter wird den Kunden in der Änderungsmitteilung auf die Bedeutung dieser Frist und sein Widerspruchsrecht hinweisen.",
      "Widerspricht der Kunde fristgerecht, steht dem Anbieter ein Sonderkündigungsrecht zu.",
    ],
  },
  {
    title: "Schlussbestimmungen",
    bullets: [
      "Auf diese AGB und alle Rechtsbeziehungen zwischen dem Anbieter und dem Kunden findet das Recht der Bundesrepublik Deutschland Anwendung. Die Anwendung des UN-Kaufrechts ist ausgeschlossen.",
      "Sofern der Kunde Kaufmann, juristische Person des öffentlichen Rechts oder öffentlich-rechtliches Sondervermögen ist, ist ausschließlicher Gerichtsstand für alle Streitigkeiten aus diesem Vertrag der Sitz des Anbieters (Bochum).",
      "Sollten einzelne Bestimmungen dieser AGB unwirksam oder undurchführbar sein oder werden, so berührt dies die Wirksamkeit der übrigen Bestimmungen nicht. An die Stelle der unwirksamen oder undurchführbaren Bestimmung tritt eine wirksame und durchführbare Regelung, die dem wirtschaftlichen Zweck der unwirksamen Bestimmung möglichst nahekommt.",
      "Änderungen und Ergänzungen dieses Vertrages bedürfen zu ihrer Wirksamkeit der Schriftform. Dies gilt auch für die Abbedingung dieses Schriftformerfordernisses.",
    ],
  },
] as const;

export const termsLastUpdated = "Stand April 2026";
