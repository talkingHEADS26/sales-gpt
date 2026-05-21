import type { Metadata } from "next";
import "./globals.css";
import { ConsentIntegrations } from "@/components/consent-integrations";
import { ConsentProvider } from "@/components/consent-provider";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: {
    default: "AbschlussIO",
    template: "%s | AbschlussIO",
  },
  description: "Sales Performance System",
  appleWebApp: {
    title: "AbschlussIO",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <ConsentProvider>
          <div className="flex-1">{children}</div>
          <SiteFooter />
          <ConsentIntegrations />
        </ConsentProvider>
      </body>
    </html>
  );
}
