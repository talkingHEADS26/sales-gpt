import { NextResponse, type NextRequest } from "next/server";

import {
  COPECART_PLAN_KEYS,
  getCopeCartProductConfigForPlanKey,
} from "@/lib/copecart-products";

function normalizePlanKey(value: string | undefined) {
  const normalizedValue = value?.trim().toLowerCase();

  return normalizedValue && COPECART_PLAN_KEYS.includes(normalizedValue as (typeof COPECART_PLAN_KEYS)[number])
    ? (normalizedValue as (typeof COPECART_PLAN_KEYS)[number])
    : null;
}

function getFirstSearchParam(request: NextRequest, names: string[]) {
  for (const name of names) {
    const value = request.nextUrl.searchParams.get(name)?.trim();

    if (value) {
      return value;
    }
  }

  return null;
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

  const productConfig = getCopeCartProductConfigForPlanKey(planKey);
  const registerUrl = new URL("/register", request.url);
  registerUrl.searchParams.set("licensePlan", planKey);
  registerUrl.searchParams.set("license_plan", planKey);

  if (productConfig) {
    registerUrl.searchParams.set("copecart_product_id", productConfig.productId);
    registerUrl.searchParams.set("cope_cart_product_id", productConfig.productId);
  }

  const orderId = getFirstSearchParam(request, [
    "copecart_order_id",
    "cope_cart_order_id",
    "order_id",
    "orderId",
    "transaction_id",
    "transactionId",
  ]);
  const customerEmail = getFirstSearchParam(request, [
    "copecart_customer_email",
    "cope_cart_customer_email",
    "customer_email",
    "customerEmail",
    "email",
  ]);

  if (orderId) {
    registerUrl.searchParams.set("copecart_order_id", orderId);
    registerUrl.searchParams.set("cope_cart_order_id", orderId);
    registerUrl.searchParams.set("order_id", orderId);
  }

  if (customerEmail) {
    registerUrl.searchParams.set("copecart_customer_email", customerEmail);
    registerUrl.searchParams.set("cope_cart_customer_email", customerEmail);
    registerUrl.searchParams.set("customer_email", customerEmail);
  }

  return NextResponse.redirect(registerUrl);
}
