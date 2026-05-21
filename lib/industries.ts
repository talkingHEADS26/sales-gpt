import type { SupabaseServerClient } from "@/lib/supabase-server";

export const INDUSTRY_KEYS = [
  "fitness",
  "finance",
  "franchise",
  "energy",
] as const;

export type IndustryKey = (typeof INDUSTRY_KEYS)[number];
export const FRANCHISE_VERTICAL_KEYS = [
  "restaurant",
  "fashion",
  "fitness",
  "beauty",
  "retail",
  "services",
  "other",
] as const;

export type FranchiseVerticalKey = (typeof FRANCHISE_VERTICAL_KEYS)[number];
export const DEFAULT_FRANCHISE_VERTICAL_KEY: FranchiseVerticalKey = "other";
export const FRANCHISE_VERTICAL_LABELS: Record<FranchiseVerticalKey, string> = {
  beauty: "Beauty",
  fashion: "Bekleidung",
  fitness: "Gym/Fitness",
  other: "Sonstiges",
  restaurant: "Restaurant",
  retail: "Retail/Handel",
  services: "Dienstleistung",
};
export const FRANCHISE_VERTICAL_OPTIONS = FRANCHISE_VERTICAL_KEYS.map((key) => ({
  label: FRANCHISE_VERTICAL_LABELS[key],
  value: key,
})) as ReadonlyArray<{
  label: string;
  value: FranchiseVerticalKey;
}>;

export const DEFAULT_INDUSTRY_KEY: IndustryKey = "fitness";

export const INDUSTRY_LABELS: Record<IndustryKey, string> = {
  energy: "Energie",
  finance: "Finanzen",
  fitness: "Fitness",
  franchise: "Franchise",
};

export const INDUSTRY_OPTIONS = INDUSTRY_KEYS.map((industryKey) => ({
  label: INDUSTRY_LABELS[industryKey],
  value: industryKey,
})) as ReadonlyArray<{
  label: string;
  value: IndustryKey;
}>;

export type OrganizationIndustrySettings = {
  franchise_vertical: string | null;
  industry_key: string | null;
  industry_locked: boolean | null;
  prompt_profile_key: string | null;
};

export function isFranchiseVerticalKey(value: string): value is FranchiseVerticalKey {
  return (FRANCHISE_VERTICAL_KEYS as readonly string[]).includes(value);
}

export function normalizeFranchiseVerticalKey(
  value: string | null | undefined
): FranchiseVerticalKey {
  if (!value) {
    return DEFAULT_FRANCHISE_VERTICAL_KEY;
  }

  return isFranchiseVerticalKey(value) ? value : DEFAULT_FRANCHISE_VERTICAL_KEY;
}

export function isIndustryKey(value: string): value is IndustryKey {
  return (INDUSTRY_KEYS as readonly string[]).includes(value);
}

export function normalizeIndustryKey(value: string | null | undefined): IndustryKey {
  if (!value) {
    return DEFAULT_INDUSTRY_KEY;
  }

  // Legacy aliases for environments that still contain pre-migration values.
  if (value === "automotive") {
    return "franchise";
  }
  if (value === "insurance") {
    return "finance";
  }
  if (value === "physio") {
    return "fitness";
  }

  return isIndustryKey(value) ? value : DEFAULT_INDUSTRY_KEY;
}

export function resolvePromptProfileKey(
  settings: Partial<OrganizationIndustrySettings> | null | undefined
) {
  const promptProfileKey = settings?.prompt_profile_key?.trim();

  if (promptProfileKey) {
    return promptProfileKey;
  }

  return normalizeIndustryKey(settings?.industry_key);
}

export function resolveIndustrySettings(
  settings: Partial<OrganizationIndustrySettings> | null | undefined
) {
  const industryKey = normalizeIndustryKey(settings?.industry_key);

  return {
    franchiseVertical: normalizeFranchiseVerticalKey(settings?.franchise_vertical),
    industryKey,
    industryLocked: settings?.industry_locked ?? true,
    promptProfileKey: resolvePromptProfileKey(settings),
  };
}

export async function getOrganizationIndustrySettings(
  supabase: SupabaseServerClient,
  organizationId: string | null
) {
  if (!organizationId) {
    return resolveIndustrySettings(null);
  }

  const { data, error } = await supabase
    .from("organizations")
    .select("industry_key, prompt_profile_key, industry_locked, franchise_vertical")
    .eq("id", organizationId)
    .maybeSingle<OrganizationIndustrySettings>();

  if (error) {
    throw new Error(error.message);
  }

  return resolveIndustrySettings(data);
}
