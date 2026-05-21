import type { IndustryKey } from "@/lib/industries";
import { energyPromptConfig } from "@/lib/prompts/industries/energy";
import { financePromptConfig } from "@/lib/prompts/industries/finance";
import { fitnessPromptConfig } from "@/lib/prompts/industries/fitness";
import { franchisePromptConfig } from "@/lib/prompts/industries/franchise";
import type { IndustryPromptConfig } from "@/lib/prompts/types";

const PROMPT_CONFIG_BY_INDUSTRY: Record<IndustryKey, IndustryPromptConfig> = {
  energy: energyPromptConfig,
  finance: financePromptConfig,
  fitness: fitnessPromptConfig,
  franchise: franchisePromptConfig,
};

export function getIndustryPromptConfig(industryKey: IndustryKey) {
  return PROMPT_CONFIG_BY_INDUSTRY[industryKey];
}
