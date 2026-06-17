import { redirect } from "next/navigation";

type InvitePageProps = {
  params: Promise<{ token: string }>;
};

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;

  redirect(`/register?invitation_token=${encodeURIComponent(token)}`);
}
