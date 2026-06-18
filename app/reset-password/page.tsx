import type { Metadata } from "next";

import ResetPasswordClient from "./reset-password-client";

export const metadata: Metadata = {
  title: "Passwort zurücksetzen",
};

export default function ResetPasswordPage() {
  return <ResetPasswordClient />;
}
