import type { Metadata } from "next";
import Link from "next/link";

import { FaqSection, type FaqSectionData } from "@/components/faq/faq-section";
import { PublicSiteHeader } from "@/components/public-site-header";

export const metadata: Metadata = {
  title: "Häufige Fragen",
  description:
    "Antworten auf häufige Fragen zu talkingHEADS Sales Trainer, Training, KI, Sicherheit und Nutzung im Team.",
};

const faqSections: readonly FaqSectionData[] = [
  {
    id: "allgemein",
    title: "Allgemein",
    description:
      "Die wichtigsten Grundlagen zu Produkt, Zielgruppe und Nutzen von talkingHEADS Sales Trainer.",
    items: [
      {
        question: "Was ist talkingHEADS Sales Trainer?",
        answer:
          "talkingHEADS Sales Trainer ist ein KI-basiertes Trainingssystem für Verkaufsgespräche. Du trainierst mit realistischen Interessenten, statt nur Theorie zu lesen oder Standardskripte durchzugehen. Nach dem Gespräch bekommst du eine klare Auswertung zu Wirkung, Struktur und Abschlussstärke. Das Ziel ist messbarer Fortschritt im echten Gesprächsverlauf.",
      },
      {
        question: "Für wen ist talkingHEADS Sales Trainer geeignet?",
        answer:
          "talkingHEADS Sales Trainer ist für Einzelverkäufer, Selbstständige und Vertriebsteams gedacht. Es eignet sich für Menschen, die Verkauf aktiv trainieren wollen, statt nur Wissen zu sammeln. Besonders sinnvoll ist es für Teams, die einen einheitlichen Trainingsstandard aufbauen wollen. Auch branchenspezifische Nutzung ist möglich.",
      },
      {
        question: "Kann ich das System auch ohne Verkaufserfahrung nutzen?",
        answer:
          "Ja. Das System ist so aufgebaut, dass du auch ohne lange Vertriebserfahrung direkt starten kannst. Du bekommst realistische Gesprächssituationen und lernst durch Wiederholung, nicht durch komplizierte Theorie. Gerade Einsteiger profitieren davon, schnell ein Gefühl für gute Fragen, Einwände und Abschlüsse zu entwickeln.",
      },
      {
        question: "Was unterscheidet talkingHEADS Sales Trainer von normalen Verkaufstrainings?",
        answer:
          "Normale Verkaufstrainings bleiben oft bei Input, Folien und Rollenspielen mit begrenzter Wiederholbarkeit. talkingHEADS Sales Trainer lässt dich direkt in konkrete Gespräche gehen und gibt dir danach eine strukturierte Rückmeldung. Dadurch trainierst du nicht nur Wissen, sondern Verhalten unter echten Gesprächsbedingungen. Das macht Fortschritt deutlich greifbarer.",
      },
    ],
  },
  {
    id: "training-und-nutzung",
    title: "Training & Nutzung",
    description:
      "So funktioniert das Training im Alltag und so nutzt du die Plattform sinnvoll.",
    items: [
      {
        question: "Wie läuft ein Training konkret ab?",
        answer:
          "Du startest eine Session und führst ein Gespräch mit einem simulierten Interessenten. Je nach Trainingsmodus trainierst du ein komplettes Verkaufsgespräch oder eine bestimmte Situation. Nach dem Gespräch wertet das System deine Leistung aus und zeigt dir, wo du stark warst und was du verbessern solltest. So kannst du direkt die nächste Runde gezielt besser führen.",
      },
      {
        question: "Welche Szenarien kann ich trainieren?",
        answer:
          "Mit talkingHEADS Sales Trainer kannst du verschiedene Trainingsszenarien realitätsnah abbilden. Neben dem vollständigen Verkaufsgespräch kannst du gezielt einzelne Situationen trainieren, darunter die Situationsanalyse realer Gespräche, Terminsetting am Telefon sowie Beschwerdemanagement und schwierige Kundensituationen. So kannst du nicht nur komplette Sales-Prozesse üben, sondern auch gezielt an kritischen Momenten arbeiten, die im Alltag über den Abschluss entscheiden.",
      },
      {
        question: "Ist das Training realistisch?",
        answer:
          "Ja, darauf ist das System ausgelegt. Die Interessenten reagieren nicht nur freundlich oder vorhersehbar, sondern bringen echte Unsicherheit, Einwände und wechselnde Dynamik mit. Dadurch entsteht ein Trainingsrahmen, der näher an echten Verkaufsgesprächen ist als starre Skripte. Genau das macht das Training wertvoll.",
      },
      {
        question: "Wie oft sollte ich trainieren?",
        answer:
          "Wichtiger als lange Einzelsessions ist Regelmäßigkeit. Für viele Nutzer sind mehrere kurze Trainings pro Woche sinnvoller als ein einzelner großer Block. So kannst du Muster schneller erkennen und direkt nachschärfen. Wer konsequent trainiert, sieht Fortschritt deutlich früher.",
      },
    ],
  },
  {
    id: "ki-und-funktionsweise",
    title: "KI & Funktionsweise",
    description:
      "Einfach erklärt: was die KI macht, was sie anpasst und wie sie eingebettet ist.",
    items: [
      {
        question: "Wie funktioniert die KI im Hintergrund?",
        answer:
          "Die KI steuert den simulierten Interessenten und reagiert auf deinen Gesprächsverlauf. Sie bildet typische Dynamiken aus echten Verkaufssituationen nach und bleibt dabei in einem definierten Trainingsrahmen. Dadurch entsteht ein realistisches Rollenspiel mit klaren Regeln. Für dich wirkt das wie ein vernünftig geführtes Trainingsgespräch statt wie ein freier Chat ohne Struktur.",
      },
      {
        question: "Passt sich das Training an meine Branche an?",
        answer:
          "Ja. talkingHEADS Sales Trainer arbeitet mit branchenspezifischen Trainingslogiken und Szenarien. Das bedeutet, dass Problemsituationen, Motive, Einwände und Zielbilder zur gewählten Branche passen. So trainierst du nicht im luftleeren Raum, sondern in einem Kontext, der für deinen Alltag relevant ist.",
      },
      {
        question: "Werden meine Gespräche gespeichert?",
        answer:
          "Ja, Gespräche werden gespeichert, soweit das für Session-Fortsetzung, Auswertung und Trainingshistorie erforderlich ist. Dadurch kannst du Fortschritt nachvollziehen und Sessions später wieder öffnen. Die Speicherung dient dem Produktbetrieb und der Trainingsauswertung.",
      },
      {
        question: "Wie werden meine Fortschritte gemessen?",
        answer:
          "Das System wertet abgeschlossene Trainings entlang klarer Kriterien aus, zum Beispiel Bedarfsermittlung, Präsentation, Einwandbehandlung und Abschlussnähe. Daraus entstehen nachvollziehbare KPI-Snapshots pro Session. So bekommst du nicht nur ein Gefühl, sondern eine vergleichbare Entwicklung über mehrere Trainings hinweg. Gerade für Teams schafft das eine bessere Grundlage als reine Bauchbewertung.",
      },
    ],
  },
  {
    id: "kpis-und-auswertung",
    title: "KPIs & Auswertung",
    description:
      "Wie talkingHEADS Sales Trainer Ergebnisse einordnet und welche Kennzahlen für dich sichtbar werden.",
    items: [
      {
        question: "Was bedeutet die Abschlussquote?",
        answer:
          "Die Abschlussquote zeigt, wie häufig Trainingsgespräche in einen erfolgreichen Abschluss münden. Sie ist kein Marketingwert, sondern eine Trainingskennzahl für deine Entwicklung. Dadurch siehst du, ob deine Gesprächsführung im Verlauf verbindlicher und wirksamer wird. Besonders sinnvoll wird sie im Vergleich über mehrere Sessions.",
      },
      {
        question: "Wie wird ein „Sale“ bewertet?",
        answer:
          "Ein Sale wird nur dann als solcher gewertet, wenn der simulierte Kunde eine verbindliche Zusage oder einen klaren Abschluss macht. Offene Entscheidungen, Vertagungen oder unverbindliche Aussagen zählen nicht als Sale. Die Bewertung ist bewusst eher streng als zu freundlich. Dadurch bleiben die Kennzahlen belastbar.",
      },
      {
        question: "Kann ich meine Entwicklung über Zeit sehen?",
        answer:
          "Ja. talkingHEADS Sales Trainer speichert Trainingsauswertungen so, dass Entwicklungen über mehrere Sessions sichtbar werden. Du kannst damit erkennen, ob sich bestimmte Bereiche stabil verbessern oder ob du an denselben Punkten hängen bleibst. Genau dieser Verlauf ist für nachhaltiges Training wichtiger als eine einzelne starke Session.",
      },
      {
        question: "Können auch Teams ausgewertet werden?",
        answer:
          "Ja, die Plattform ist nicht nur für Einzelpersonen gedacht. In Team-Setups lassen sich Trainings und Kennzahlen über mehrere Nutzer hinweg betrachten. Das ist besonders hilfreich, wenn ein gemeinsamer Sales-Standard aufgebaut werden soll. Admins können damit Entwicklung nicht nur individuell, sondern auch auf Teamebene besser einordnen.",
      },
    ],
  },
  {
    id: "account-und-organisation",
    title: "Account & Organisation",
    description:
      "Fragen rund um Teamverwaltung, Rollen und Organisations-Setup.",
    items: [
      {
        question: "Kann ich mein Team hinzufügen?",
        answer:
          "Ja. talkingHEADS Sales Trainer ist auf Einzel- und Teamnutzung ausgelegt. Je nach gebuchtem Setup kannst du weitere Nutzer in deine Organisation aufnehmen. Dadurch trainieren mehrere Personen in einer gemeinsamen Struktur statt in isolierten Einzellogins.",
      },
      {
        question: "Gibt es unterschiedliche Rollen (Admin, Trainer etc.)?",
        answer:
          "Es gibt bereits rollenbasierte Organisationsstrukturen, zum Beispiel für Administratoren und Mitglieder. Damit lässt sich steuern, wer Organisationseinstellungen oder Teamfunktionen verwaltet. Die genaue Rollentiefe kann je nach aktuellem Produktstand variieren. Für Nutzer bleibt die Bedienung dabei bewusst schlank.",
      },
      {
        question: "Kann ich die Branche später ändern?",
        answer:
          "Grundsätzlich ist die Branchenlogik in der Organisation hinterlegt. Ob und wie sie später angepasst wird, hängt davon ab, wie eure Organisation aktuell konfiguriert ist. Wichtig ist, dass Trainingsszenarien danach konsistent zur Branche passen. Ein Branchenwechsel sollte deshalb bewusst und nicht nebenbei erfolgen.",
      },
    ],
  },
  {
    id: "technik-und-sicherheit",
    title: "Technik & Sicherheit",
    description:
      "Die wichtigsten Antworten zu Datensicherheit, Hosting und mobiler Nutzung.",
    items: [
      {
        question: "Sind meine Daten sicher?",
        answer:
          "talkingHEADS Sales Trainer ist so aufgebaut, dass Nutzerdaten nicht offen oder beliebig zugänglich verarbeitet werden. Zugriff und Speicherung folgen klaren Plattformprozessen. Dazu gehören abgesicherte Accounts, definierte Rollen und technische Trennung zwischen Nutzern. Für viele Kunden ist genau diese Struktur die Grundlage für vertrauensvolle Nutzung.",
      },
      {
        question: "Wo werden die Daten gespeichert?",
        answer:
          "Die Daten werden in der technischen Infrastruktur der Plattform gespeichert, damit Sessions, Organisationen und Auswertungen funktionieren. Welche Daten genau verarbeitet werden, richtet sich nach der Nutzung der Plattformfunktionen. Die FAQ erklärt hier nur die Produktperspektive.",
      },
      {
        question: "Funktioniert das auch auf dem Handy?",
        answer:
          "Ja, die Plattform ist responsiv aufgebaut und lässt sich auch mobil nutzen. Gerade für kurze Trainings oder schnelles Nachschauen von Sessions ist das hilfreich. Für längere Gespräche und Auswertungen ist Desktop oft komfortabler, aber nicht zwingend. Die FAQ-Seite und die öffentlichen Seiten sind ebenfalls für mobile Nutzung ausgelegt.",
      },
    ],
  },
  {
    id: "abrechnung-und-zugang",
    title: "Abrechnung & Zugang",
    description:
      "Ein vorbereiteter Bereich für die häufigsten Fragen zu Tarifen und Zugang.",
    items: [
      {
        question: "Wie funktioniert die Abrechnung?",
        answer:
          "Die Abrechnung richtet sich nach dem gewählten Tarif und der Anzahl der gebuchten Seats. Die Abrechnung erfolgt über unseren Zahlungsdienstleister CopeCart. Verfügbare Zahlungsmethoden sind Kreditkarte, PayPal und Apple Pay. Die verfügbaren Zahlungsmethoden werden im Checkout über CopeCart angezeigt.",
      },
      {
        question: "Kann ich jederzeit kündigen?",
        answer:
          "Das hängt vom gewählten Tarif ab. Im Produkt sind unterschiedliche Vertragsmodelle vorgesehen, zum Beispiel monatliche Lösungen oder Tarife mit längerer Laufzeit. Maßgeblich sind die Bedingungen des gebuchten Plans und die jeweiligen Vertragsunterlagen.",
      },
      {
        question: "Gibt es Testzugang oder Demo?",
        answer:
          "Eine Demo oder ein persönlicher Einstieg ist grundsätzlich möglich, wenn ihr euch ein Bild vom System machen wollt. Gerade für Teams oder größere Setups ist das sinnvoll, bevor ihr breiter ausrollt. So könnt ihr prüfen, ob Trainingslogik, Bedienung und Auswertung zu eurem Vertriebsalltag passen. Auf der Startseite gibt es dafür einen direkten Demo-Einstieg.",
      },
    ],
  },
] as const;

export default function FaqPage() {
  return (
    <main
      className="min-h-screen bg-[#f4f8fd] text-[#707070]"
    >
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 pb-16 pt-5 sm:px-6 sm:pb-20 lg:px-8">
        <PublicSiteHeader reducedEffects />

        <section className="pb-8 pt-12 sm:pt-16 lg:pt-20">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)] lg:items-start">
            <div className="max-w-3xl">
              <div className="inline-flex items-center rounded-full border border-[#0e51a0]/15 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#0e51a0]">
                FAQ
              </div>
              <h1 className="mt-6 text-4xl font-semibold tracking-[-0.06em] text-[#707070] sm:text-5xl lg:text-6xl">
                Klare Antworten auf die wichtigsten Fragen zu talkingHEADS Sales Trainer.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
                Hier findest du kurze, direkte Antworten zu Produkt, Training,
                KI, Sicherheit und Teamnutzung. Die Seite ist so aufgebaut,
                dass du typische Einwände schnell klären kannst, ohne dich
                durch lange Texte zu arbeiten.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/register"
                  className="th-reference-cta"
                >
                  Jetzt starten!
                </Link>
                <Link
                  href="/login"
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-[#707070] shadow-[0_8px_20px_rgba(15,23,42,0.05)] transition-colors hover:border-[#0e51a0]/30 hover:text-[#0e51a0]"
                >
                  Zum Login
                </Link>
              </div>
            </div>

            <aside className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)] sm:p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#0e51a0]">
                Kategorien
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                {faqSections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="inline-flex min-h-11 items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-[#707070] transition-colors hover:border-[#0e51a0]/24 hover:text-[#0e51a0]"
                  >
                    {section.title}
                  </a>
                ))}
              </div>
              <div className="mt-6 rounded-[1.5rem] border border-slate-100 bg-slate-50 p-5">
                <p className="text-sm font-semibold text-[#707070]">
                  Noch etwas offen?
                </p>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Wenn deine Frage hier nicht beantwortet wird, kannst du dir
                  zuerst eine Demo ansehen oder direkt mit dem Einstieg
                  beginnen.
                </p>
              </div>
            </aside>
          </div>
        </section>

        <section className="pb-12">
          <div className="space-y-6">
            {faqSections.map((section) => (
              <FaqSection key={section.id} section={section} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
