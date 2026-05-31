import type { Metadata } from "next";
import { Roboto, Rubik } from "next/font/google";
import "./globals.css";
import "../styles/main.css";
import { ConsentIntegrations } from "@/components/consent-integrations";
import { ConsentProvider } from "@/components/consent-provider";

const rubik = Rubik({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-rubik",
});

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-roboto",
});

export const metadata: Metadata = {
  title: {
    default: "talkingHEADS Sales Trainer",
    template: "%s | talkingHEADS Sales Trainer",
  },
  description: "Sales Performance System",
  appleWebApp: {
    title: "talkingHEADS Sales Trainer",
  },
  icons: {
    icon: "/th_icon.png",
    apple: "/th_icon.png",
    shortcut: "/th_icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className={`${rubik.variable} ${roboto.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <ConsentProvider>
          <div className="flex-1">{children}</div>
          <ConsentIntegrations />
        </ConsentProvider>
      </body>
    </html>
  );
}
