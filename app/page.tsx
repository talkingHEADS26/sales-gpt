import type { Metadata } from "next";

import HomePageContent from "./homepage";

export const metadata: Metadata = {
  description:
    "talkingHEADS Sales Trainer trainiert reale Verkaufsgespräche mit direktem Feedback, klarer Entwicklung und skalierbaren Lizenzen für Einzelpersonen und Teams.",
};

export default function HomePage() {
  return <HomePageContent />;
}
