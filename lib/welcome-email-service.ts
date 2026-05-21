import { sendWelcomeEmail } from "@/lib/welcome-mailer";
import type { SupabaseServerClient } from "@/lib/supabase-server";

type WelcomeProfileRecord = {
  first_name: string | null;
  id: string;
  is_active: boolean;
  welcome_email_sent_at: string | null;
};

export type MaybeSendWelcomeEmailResult =
  | { mode: "sent" }
  | {
      mode: "skipped";
      reason:
        | "already_sent"
        | "email_missing"
        | "not_approved"
        | "not_confirmed"
        | "profile_missing"
        | "send_failed"
        | "update_failed";
    };

export async function maybeSendWelcomeEmailForUser({
  serviceRoleClient,
  userId,
}: {
  serviceRoleClient: SupabaseServerClient;
  userId: string;
}): Promise<MaybeSendWelcomeEmailResult> {
  const { data: profile, error: profileError } = await serviceRoleClient
    .from("profiles")
    .select("id, first_name, is_active, welcome_email_sent_at")
    .eq("id", userId)
    .maybeSingle<WelcomeProfileRecord>();

  if (profileError || !profile) {
    return { mode: "skipped", reason: "profile_missing" };
  }

  if (profile.welcome_email_sent_at) {
    return { mode: "skipped", reason: "already_sent" };
  }

  if (!profile.is_active) {
    return { mode: "skipped", reason: "not_approved" };
  }

  const authUserResult = await serviceRoleClient.auth.admin.getUserById(userId);
  const authUser = authUserResult.data.user;

  if (authUserResult.error || !authUser?.email) {
    return { mode: "skipped", reason: "email_missing" };
  }

  if (!authUser.email_confirmed_at) {
    return { mode: "skipped", reason: "not_confirmed" };
  }

  const claimedAt = new Date().toISOString();
  const { data: claimRow, error: claimError } = await serviceRoleClient
    .from("profiles")
    .update({ welcome_email_sent_at: claimedAt })
    .eq("id", userId)
    .is("welcome_email_sent_at", null)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (claimError) {
    return { mode: "skipped", reason: "update_failed" };
  }

  if (!claimRow) {
    return { mode: "skipped", reason: "already_sent" };
  }

  const sendResult = await sendWelcomeEmail({
    firstName: profile.first_name,
    recipientEmail: authUser.email,
  });

  if (sendResult.mode !== "sent") {
    await serviceRoleClient
      .from("profiles")
      .update({ welcome_email_sent_at: null })
      .eq("id", userId)
      .eq("welcome_email_sent_at", claimedAt);

    return { mode: "skipped", reason: "send_failed" };
  }

  return { mode: "sent" };
}
