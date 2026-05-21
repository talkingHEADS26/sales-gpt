import { NextResponse } from "next/server";

import { sendTrainingReminderEmail } from "@/lib/email/send-training-reminder";
import {
  claimTrainingReminderEmail,
  hasTrainingReminderTrigger,
  isTrainingReminderInCooldown,
  listTrainingReminderCandidates,
  markTrainingReminderEmailFailed,
  markTrainingReminderEmailSent,
} from "@/lib/reminders";
import {
  getServiceRoleClientInitError,
  getSupabaseServiceRoleClient,
} from "@/lib/supabase-server";
import { getErrorMessage, logSystemEvent } from "@/lib/system-monitoring";

export const dynamic = "force-dynamic";

type CronSummary = {
  checkedUsers: number;
  dryRun: boolean;
  eligibleUsers: number;
  errors: Array<{ message: string; userId?: string }>;
  missingEmail: number;
  sentCount: number;
  skippedDueToCooldown: number;
  skippedNoTrigger: number;
  skippedPendingClaim: number;
};

function isAuthorizedCronRequest(request: Request) {
  const configuredSecret = process.env.TRAINING_REMINDER_CRON_SECRET?.trim();

  if (!configuredSecret) {
    return {
      authorized: false,
      status: 500,
      message: "Missing env: TRAINING_REMINDER_CRON_SECRET",
    } as const;
  }

  const authorizationHeader = request.headers.get("authorization");
  const bearerToken = authorizationHeader?.startsWith("Bearer ")
    ? authorizationHeader.slice("Bearer ".length).trim()
    : null;
  const headerSecret = request.headers.get("x-cron-secret")?.trim() ?? null;

  if (bearerToken === configuredSecret || headerSecret === configuredSecret) {
    return {
      authorized: true,
    } as const;
  }

  return {
    authorized: false,
    status: 401,
    message: "Nicht autorisiert.",
  } as const;
}

async function handleCronRequest(request: Request) {
  const auth = isAuthorizedCronRequest(request);

  if (!auth.authorized) {
    return NextResponse.json(
      { error: auth.message },
      { status: auth.status }
    );
  }

  const serviceRoleClient = getSupabaseServiceRoleClient();

  if (!serviceRoleClient) {
    const errorMessage =
      getServiceRoleClientInitError() ??
      "Supabase Service Role Client konnte nicht initialisiert werden.";

    await logSystemEvent({
      forceNotify: true,
      message: "Reminder cron could not initialize service role client",
      metadata: {
        error: errorMessage,
      },
      severity: "critical",
      source: "reminders",
    });

    return NextResponse.json(
      {
        error: errorMessage,
      },
      { status: 500 }
    );
  }

  const url = new URL(request.url);
  const dryRun =
    url.searchParams.get("dryRun") === "true" ||
    url.searchParams.get("dryRun") === "1";
  const summary: CronSummary = {
    checkedUsers: 0,
    dryRun,
    eligibleUsers: 0,
    errors: [],
    missingEmail: 0,
    sentCount: 0,
    skippedDueToCooldown: 0,
    skippedNoTrigger: 0,
    skippedPendingClaim: 0,
  };

  try {
    const candidates = await listTrainingReminderCandidates(serviceRoleClient);
    summary.checkedUsers = candidates.length;

    for (const candidate of candidates) {
      try {
        if (!hasTrainingReminderTrigger(candidate)) {
          summary.skippedNoTrigger += 1;
          continue;
        }

        if (!candidate.email) {
          summary.missingEmail += 1;
          continue;
        }

        if (isTrainingReminderInCooldown(candidate.latestReminderSentAt)) {
          summary.skippedDueToCooldown += 1;
          continue;
        }

        summary.eligibleUsers += 1;

        if (dryRun) {
          continue;
        }

        const claimResult = await claimTrainingReminderEmail(
          serviceRoleClient,
          candidate
        );

        if (!claimResult.claimed) {
          if (
            claimResult.skipReason === "cooldown_active" ||
            claimResult.skipReason === "pending_exists"
          ) {
            if (claimResult.skipReason === "cooldown_active") {
              summary.skippedDueToCooldown += 1;
            } else {
              summary.skippedPendingClaim += 1;
            }

            continue;
          }

          summary.errors.push({
            message: `Reminder claim skipped: ${claimResult.skipReason}`,
            userId: candidate.userId,
          });
          continue;
        }

        const sendResult = await sendTrainingReminderEmail({
          firstName: candidate.firstName,
          inactivityTriggered: candidate.inactivityTriggered,
          openFullSalesCount: candidate.openFullSalesCount,
          openFullSalesTriggered: candidate.openFullSalesTriggered,
          recipientEmail: candidate.email,
        });

        if (sendResult.mode !== "sent") {
          await logSystemEvent({
            message: "Reminder email delivery failed",
            metadata: {
              logId: claimResult.logId,
              reason: sendResult.reason,
              userId: candidate.userId,
            },
            severity: "error",
            source: "reminders",
          });

          await markTrainingReminderEmailFailed(serviceRoleClient, {
            errorMessage: sendResult.reason,
            logId: claimResult.logId,
          });

          summary.errors.push({
            message: `Reminder email not sent: ${sendResult.reason}`,
            userId: candidate.userId,
          });
          continue;
        }

        await markTrainingReminderEmailSent(serviceRoleClient, {
          logId: claimResult.logId,
          resendMessageId: sendResult.messageId,
        });

        summary.sentCount += 1;
      } catch (candidateError) {
        const message =
          candidateError instanceof Error
            ? candidateError.message
            : "Unknown reminder error";

        summary.errors.push({
          message,
          userId: candidate.userId,
        });
      }
    }

    return NextResponse.json({
      success: true,
      ...summary,
    });
  } catch (error) {
    const message = getErrorMessage(
      error,
      "Die Reminder-Ausfuehrung ist fehlgeschlagen."
    );

    await logSystemEvent({
      forceNotify: true,
      message: "Reminder job failed completely",
      metadata: {
        dryRun: summary.dryRun,
        eligibleUsers: summary.eligibleUsers,
        checkedUsers: summary.checkedUsers,
        error: message,
      },
      severity: "critical",
      source: "reminders",
    });

    return NextResponse.json(
      {
        success: false,
        ...summary,
        error: message,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return handleCronRequest(request);
}

export async function POST(request: Request) {
  return handleCronRequest(request);
}
