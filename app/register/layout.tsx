import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: {
    absolute: "Registrieren",
  },
};

type RegisterLayoutProps = {
  children: ReactNode;
};

export default function RegisterLayout({ children }: RegisterLayoutProps) {
  return children;
}
