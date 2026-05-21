import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Einladung annehmen",
};

type InviteLayoutProps = {
  children: ReactNode;
};

export default function InviteLayout({ children }: InviteLayoutProps) {
  return children;
}
