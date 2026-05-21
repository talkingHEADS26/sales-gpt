import type { Metadata } from "next";

import { AdminPageView } from "./admin-page-view";

export const metadata: Metadata = {
  title: "Admin",
  description:
    "Globale talkingHEADS Sales Trainer-Verwaltung für Plattform-Admins mit Organisationen, Seats und Teammitgliedern.",
};

export default function AdminPage() {
  return <AdminPageView />;
}
