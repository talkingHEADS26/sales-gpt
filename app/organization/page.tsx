import type { Metadata } from "next";

import { OrganizationPageView } from "./organization-page-view";

export const metadata: Metadata = {
  title: "Team verwalten",
  description:
    "Organisations-Verwaltung für Owner mit Teamübersicht, Seats und Mitgliederstatus.",
};

export default function OrganizationPage() {
  return <OrganizationPageView />;
}
