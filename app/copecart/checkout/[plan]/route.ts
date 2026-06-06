import { NextResponse, type NextRequest } from "next/server";

import {
  COPECART_PLAN_KEYS,
  getCopeCartCheckoutUrlForPlanKey,
} from "@/lib/copecart-products";

function normalizePlanKey(value: string | undefined) {
  const normalizedValue = value?.trim().toLowerCase();

  return normalizedValue && COPECART_PLAN_KEYS.includes(normalizedValue as (typeof COPECART_PLAN_KEYS)[number])
    ? (normalizedValue as (typeof COPECART_PLAN_KEYS)[number])
    : null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ plan: string }> }
) {
  const resolvedParams = await Promise.resolve(params);
  const planKey = normalizePlanKey(resolvedParams.plan);

  if (!planKey) {
    return NextResponse.redirect(new URL("/register", request.url));
  }

  const checkoutUrl = getCopeCartCheckoutUrlForPlanKey(planKey);

  if (!checkoutUrl) {
    return NextResponse.redirect(new URL("/register", request.url));
  }

  const redirectUrl = new URL(checkoutUrl);
  redirectUrl.searchParams.set("metadata", `talkingheads_sales_trainer:${planKey}`);

  return NextResponse.redirect(redirectUrl);
}
