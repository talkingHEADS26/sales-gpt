import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: {
    absolute: "Dashboard",
  },
};

type DashboardLayoutProps = {
  children: ReactNode;
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return children;
}
