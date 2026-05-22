export const COPECART_PLAN_KEYS = ["solo", "team_3", "team_5"] as const;

export type CopeCartPlanKey = (typeof COPECART_PLAN_KEYS)[number];

type CopeCartProductConfig = {
  checkoutUrl: string;
  packageLabel: string;
  planKey: CopeCartPlanKey;
  productId: string;
  seatLimit: number;
};

const COPECART_PRODUCT_CONFIGS: CopeCartProductConfig[] = [
  {
    checkoutUrl: "https://copecart.com/products/f69450a5/checkout",
    packageLabel: "Solo-Lizenz",
    planKey: "solo",
    productId: "f69450a5",
    seatLimit: 1,
  },
  {
    checkoutUrl: "https://copecart.com/products/22c68511/checkout",
    packageLabel: "Team Seat 3",
    planKey: "team_3",
    productId: "22c68511",
    seatLimit: 3,
  },
  {
    checkoutUrl: "https://copecart.com/products/2a10ffec/checkout",
    packageLabel: "Team Seat 5",
    planKey: "team_5",
    productId: "2a10ffec",
    seatLimit: 5,
  },
];

const COPECART_PRODUCT_CONFIG_BY_ID = new Map(
  COPECART_PRODUCT_CONFIGS.map((config) => [config.productId, config])
);

function normalizeText(value: string | null | undefined) {
  const trimmedValue = value?.trim();

  return trimmedValue ? trimmedValue : null;
}

export function normalizeCopeCartProductId(productId: string | null | undefined) {
  return normalizeText(productId)?.toLowerCase() ?? null;
}

export function getCopeCartProductConfig(productId: string | null | undefined) {
  const normalizedProductId = normalizeCopeCartProductId(productId);

  return normalizedProductId
    ? COPECART_PRODUCT_CONFIG_BY_ID.get(normalizedProductId) ?? null
    : null;
}

export function getSeatLimitForCopeCartProduct(productId: string | null | undefined) {
  return getCopeCartProductConfig(productId)?.seatLimit ?? null;
}

export function getPlanKeyForCopeCartProduct(productId: string | null | undefined) {
  return getCopeCartProductConfig(productId)?.planKey ?? null;
}

export function getSeatLimitForPlanKey(planKey: string | null | undefined) {
  switch (planKey) {
    case "solo":
      return 1;
    case "team_3":
      return 3;
    case "team_5":
      return 5;
    case "manual":
      return null;
    default:
      return null;
  }
}

export function getPlanLabel(planKey: string | null | undefined) {
  switch (planKey) {
    case "solo":
      return "Solo-Lizenz";
    case "team_3":
      return "Team Seat 3";
    case "team_5":
      return "Team Seat 5";
    case "manual":
      return "Manuell";
    default:
      return "Nicht hinterlegt";
  }
}

export function getPackageLabel(params: {
  copecartProductId?: string | null;
  planKey?: string | null;
  seatLimit?: number | null;
}) {
  const productConfig = getCopeCartProductConfig(params.copecartProductId);

  if (productConfig) {
    return productConfig.packageLabel;
  }

  if (params.planKey) {
    return getPlanLabel(params.planKey);
  }

  if (typeof params.seatLimit === "number" && params.seatLimit > 0) {
    if (params.seatLimit === 1) {
      return "Solo-Lizenz";
    }

    return `Team Seat ${params.seatLimit}`;
  }

  return "Nicht hinterlegt";
}

export function resolveOrganizationSeatLimit(params: {
  copecartProductId?: string | null;
  planKey?: string | null;
  seatLimit?: number | null;
}) {
  const productSeatLimit = getSeatLimitForCopeCartProduct(params.copecartProductId);
  const planSeatLimit = getSeatLimitForPlanKey(params.planKey);
  const storedSeatLimit =
    typeof params.seatLimit === "number" &&
    Number.isFinite(params.seatLimit) &&
    params.seatLimit >= 1
      ? params.seatLimit
      : null;
  const candidates = [
    { seatLimit: storedSeatLimit, source: "stored" as const },
    { seatLimit: productSeatLimit, source: "copecart_product" as const },
    { seatLimit: planSeatLimit, source: "plan_key" as const },
  ].filter(
    (candidate): candidate is { seatLimit: number; source: "stored" | "copecart_product" | "plan_key" } =>
      typeof candidate.seatLimit === "number" &&
      Number.isFinite(candidate.seatLimit) &&
      candidate.seatLimit >= 1
  );

  if (candidates.length > 0) {
    const selected = candidates.reduce((currentMax, candidate) =>
      candidate.seatLimit > currentMax.seatLimit ? candidate : currentMax
    );

    return {
      seatLimit: selected.seatLimit,
      source: selected.source,
    };
  }

  return {
    seatLimit: 1,
    source: "fallback" as const,
  };
}
