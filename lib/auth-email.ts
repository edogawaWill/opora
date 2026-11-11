import { Resend } from "resend";

type AuthEmail = {
  to: string;
  subject: string;
  url: string;
  action: "verify your email address" | "reset your password";
};

export async function sendAuthEmail({
  to,
  subject,
  url,
  action,
}: AuthEmail): Promise<void> {
  const from = process.env.RESEND_FROM_EMAIL;

  if (
    process.env.NODE_ENV === "development" &&
    process.env.OPORA_EMAIL_TRANSPORT === "mailpit"
  ) {
    if (!from) {
      reportDeliveryFailure(action, "configuration");
    }

    await sendMailpitEmail({ to, from, subject, url, action });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  const testRecipient = process.env.RESEND_TEST_TO_EMAIL?.trim();
  const recipient =
    process.env.NODE_ENV === "development" && testRecipient ? testRecipient : to;

  if (!apiKey || !from) {
    reportDeliveryFailure(action, "configuration");
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: recipient,
      subject,
      text: `Use this link to ${action}: ${url}`,
    });

    if (error) {
      throw new Error("Resend delivery failed.");
    }
  } catch {
    reportDeliveryFailure(action, "provider");
  }
}

async function sendMailpitEmail({
  to,
  from,
  subject,
  url,
  action,
}: AuthEmail & { from: string }): Promise<void> {
  const text = `Use this link to ${action}: ${url}`;
  const html = `<p>Use this link to ${escapeHtml(action)}: <a href="${escapeHtml(url)}">Continue</a></p>`;

  try {
    const response = await fetch("http://127.0.0.1:8025/api/v1/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        From: { Email: from },
        To: [{ Email: to }],
        Subject: subject,
        Text: text,
        HTML: html,
      }),
    });

    if (!response.ok) {
      throw new Error("Mailpit delivery failed.");
    }
  } catch {
    reportDeliveryFailure(action, "mailpit");
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

function reportDeliveryFailure(
  action: AuthEmail["action"],
  cause: "configuration" | "provider" | "mailpit",
): never {
  // Log only a fixed event, action category, and failure class. Never include
  // recipient addresses, provider error objects, API keys, or message URLs.
  console.error("OPORA authentication email delivery failed", {
    action,
    cause,
  });
  throw new Error("Authentication email delivery failed.");
}
