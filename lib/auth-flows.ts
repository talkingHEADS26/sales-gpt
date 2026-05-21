import { COPECART_PLAN_KEYS } from "@/lib/copecart-products";
import {
  FRANCHISE_VERTICAL_KEYS,
  INDUSTRY_KEYS,
  type FranchiseVerticalKey,
  type IndustryKey,
} from "@/lib/industries";

export const LICENSE_PLANS = COPECART_PLAN_KEYS;

export type LicensePlan = (typeof LICENSE_PLANS)[number];

export type AuthFormValues = {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
};

export type RegisterFormValues = AuthFormValues & {
  franchiseVertical: FranchiseVerticalKey;
  industryKey: IndustryKey;
  organizationName: string;
  licensePlan: LicensePlan;
};

export type FormErrors = Partial<
  Record<
    | "organizationName"
    | "firstName"
    | "lastName"
    | "username"
    | "industryKey"
    | "franchiseVertical"
    | "email"
    | "password"
    | "licensePlan",
    string
  >
>;

export type InvitationLookup = {
  organization_id: string | null;
  organization_name: string | null;
  email: string | null;
  role_to_assign: string | null;
  expires_at: string | null;
  accepted_at: string | null;
  is_valid: boolean;
  error_message: string | null;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRegisterForm(values: RegisterFormValues): FormErrors {
  const errors: FormErrors = {};

  if (!values.organizationName.trim()) {
    errors.organizationName = "Bitte gib den Organisationsnamen ein.";
  }

  if (!values.firstName.trim()) {
    errors.firstName = "Bitte gib den Vornamen ein.";
  }

  if (!values.lastName.trim()) {
    errors.lastName = "Bitte gib den Nachnamen ein.";
  }

  if (!values.username.trim()) {
    errors.username = "Bitte gib einen Username ein.";
  }

  if (!INDUSTRY_KEYS.includes(values.industryKey)) {
    errors.industryKey = "Bitte wähle eine gültige Branche aus.";
  }
  if (
    values.industryKey === "franchise" &&
    !FRANCHISE_VERTICAL_KEYS.includes(values.franchiseVertical)
  ) {
    errors.franchiseVertical =
      "Bitte wähle ein gültiges Franchise-Segment aus.";
  }

  if (!values.email.trim()) {
    errors.email = "Bitte gib die E-Mail-Adresse ein.";
  } else if (!emailPattern.test(values.email.trim())) {
    errors.email = "Bitte gib eine gültige E-Mail-Adresse ein.";
  }

  if (values.password.length < 6) {
    errors.password = "Das Passwort muss mindestens 6 Zeichen lang sein.";
  }

  if (!LICENSE_PLANS.includes(values.licensePlan)) {
    errors.licensePlan = "Bitte wähle einen gültigen Lizenzplan aus.";
  }

  return errors;
}

export function validateInviteAcceptForm(values: AuthFormValues): FormErrors {
  const errors: FormErrors = {};

  if (!values.firstName.trim()) {
    errors.firstName = "Bitte gib den Vornamen ein.";
  }

  if (!values.lastName.trim()) {
    errors.lastName = "Bitte gib den Nachnamen ein.";
  }

  if (!values.username.trim()) {
    errors.username = "Bitte gib einen Username ein.";
  }

  if (!values.email.trim()) {
    errors.email = "Bitte gib die E-Mail-Adresse ein.";
  } else if (!emailPattern.test(values.email.trim())) {
    errors.email = "Bitte gib eine gültige E-Mail-Adresse ein.";
  }

  if (values.password.length < 6) {
    errors.password = "Das Passwort muss mindestens 6 Zeichen lang sein.";
  }

  return errors;
}
