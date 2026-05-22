import { NextResponse } from "next/server";

import {
  isFailure,
  requirePaidAppUser,
  resolveAppAccessStateForUser,
} from "@/lib/copecart-subscriptions";

export async function GET(request: Request) {
  const authResult = await requirePaidAppUser(
    request.headers.get("authorization")
  );

  if (isFailure(authResult)) {
    return NextResponse.json(
      {
        code: authResult.code ?? null,
        error: authResult.error,
      },
      { status: authResult.status }
    );
  }

  const accessState = await resolveAppAccessStateForUser({
    serviceRoleClient: authResult.serviceRoleClient,
    userId: authResult.userId,
  });

  return NextResponse.json(accessState, { status: 200 });
}
