import type { Metadata } from "next";

import ForgotPasswordClient from "./forgot-password-client";

export const metadata: Metadata = {
  title: "Passwort vergessen",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordClient />;
}
