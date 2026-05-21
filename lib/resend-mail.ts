type SendResendEmailParams = {
  from: string;
  html: string;
  replyTo?: string | null;
  resendApiKey: string;
  subject: string;
  text: string;
  to: string[];
};

type SendResendEmailResult =
  | { messageId: string | null; ok: true }
  | { errorMessage: string; ok: false };

export async function sendResendEmail({
  from,
  html,
  replyTo,
  resendApiKey,
  subject,
  text,
  to,
}: SendResendEmailParams): Promise<SendResendEmailResult> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      html,
      ...(replyTo ? { reply_to: replyTo } : {}),
      subject,
      text,
      to,
    }),
  });

  if (response.ok) {
    let messageId: string | null = null;

    try {
      const responseBody = (await response.json()) as {
        id?: string;
      };

      messageId = responseBody.id ?? null;
    } catch {
      messageId = null;
    }

    return { messageId, ok: true };
  }

  let resendMessage = `HTTP ${response.status}`;

  try {
    const responseBody = (await response.json()) as {
      error?: string;
      message?: string;
      name?: string;
    };

    resendMessage =
      responseBody.message || responseBody.error || responseBody.name || resendMessage;
  } catch {
    resendMessage = `${resendMessage} ${response.statusText}`.trim();
  }

  return {
    errorMessage: resendMessage,
    ok: false,
  };
}
