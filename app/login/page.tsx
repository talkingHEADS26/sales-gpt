import type { Metadata } from "next";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Login",
};

type LoginPageProps = {
  searchParams: Promise<{
    code?: string;
    confirmed?: string;
    confirm_mail?: string;
    email?: string;
    error_description?: string;
    invited?: string;
    registered?: string;
    reset?: string;
    token_hash?: string;
    type?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = await searchParams;

  return (
    <LoginForm
      confirmationCode={resolvedSearchParams.code}
      confirmed={resolvedSearchParams.confirmed === "1"}
      confirmationMailSent={resolvedSearchParams.confirm_mail !== "0"}
      confirmationErrorDescription={resolvedSearchParams.error_description}
      defaultEmail={resolvedSearchParams.email}
      invited={resolvedSearchParams.invited === "1"}
      reset={resolvedSearchParams.reset === "1"}
      registered={resolvedSearchParams.registered === "1"}
      tokenHash={resolvedSearchParams.token_hash}
      tokenType={resolvedSearchParams.type}
    />
  );
}
