// Makono Smart Loan - Backend Notification Worker
// Handles email/SMS/WhatsApp notification delivery for loan reminders and adjustments.

type NotifyRequest = {
  to: string;
  channel: "email" | "sms" | "whatsapp";
  subject: string;
  message: string;
  recipientName?: string;
  loanId?: string;
};

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

async function sendEmailNotification(
  to: string,
  subject: string,
  message: string,
  recipientName?: string
): Promise<{ success: boolean; error?: string }> {
  // In production, integrate with Resend, SendGrid, or AWS SES.
  // For now, log the notification for debugging and return success.
  // The app also falls back to mailto: URL scheme on the device.
  console.log(
    `[EMAIL] To: ${to} (${recipientName ?? "User"}) | Subject: ${subject} | Body: ${message.substring(0, 200)}`
  );

  // TODO: Replace with actual email provider when API keys are available:
  // const res = await fetch("https://api.resend.com/emails", {
  //   method: "POST",
  //   headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
  //   body: JSON.stringify({ from: "Makono <noreply@makono.com>", to, subject, text: message }),
  // });
  // if (!res.ok) return { success: false, error: await res.text() };

  return { success: true };
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // Health check
    if (url.pathname === "/ping") {
      return json({ ok: true, now: new Date().toISOString(), service: "makono-notifications" });
    }

    // Send notification endpoint
    if (url.pathname === "/notify" && request.method === "POST") {
      try {
        const body: NotifyRequest = await request.json();

        if (!body.to || !body.channel || !body.message) {
          return json({ success: false, error: "Missing required fields: to, channel, message" }, 400);
        }

        if (!["email", "sms", "whatsapp"].includes(body.channel)) {
          return json({ success: false, error: "Invalid channel. Use: email, sms, or whatsapp" }, 400);
        }

        let result: { success: boolean; error?: string };

        switch (body.channel) {
          case "email":
            result = await sendEmailNotification(
              body.to,
              body.subject || "Makono Smart Loan Notification",
              body.message,
              body.recipientName
            );
            break;
          case "sms":
            // SMS delivery via Twilio or similar in production.
            // The app side opens the device SMS composer as a practical fallback.
            console.log(
              `[SMS] To: ${body.to} | Message: ${body.message.substring(0, 200)}`
            );
            result = { success: true };
            break;
          case "whatsapp":
            // WhatsApp delivery via Twilio/WhatsApp Business API in production.
            // The app side opens WhatsApp via wa.me URL scheme as a practical fallback.
            console.log(
              `[WHATSAPP] To: ${body.to} | Message: ${body.message.substring(0, 200)}`
            );
            result = { success: true };
            break;
        }

        if (result.success) {
          console.log(
            `[NOTIFY] Sent ${body.channel} notification to ${body.to}${body.loanId ? ` for loan ${body.loanId}` : ""}`
          );
        }

        return json({
          success: result.success,
          channel: body.channel,
          error: result.error,
        });
      } catch (err) {
        console.error("[NOTIFY] Failed to parse request:", err);
        return json({ success: false, error: "Invalid request body" }, 400);
      }
    }

    // Batch notification endpoint (for sending to multiple recipients at once)
    if (url.pathname === "/notify/batch" && request.method === "POST") {
      try {
        const body: { notifications: NotifyRequest[] } = await request.json();

        if (!body.notifications || !Array.isArray(body.notifications)) {
          return json({ success: false, error: "Missing notifications array" }, 400);
        }

        const results: { to: string; channel: string; success: boolean }[] = [];

        for (const n of body.notifications) {
          if (!n.to || !n.channel || !n.message) continue;

          switch (n.channel) {
            case "email":
              await sendEmailNotification(n.to, n.subject || "Makono Notification", n.message, n.recipientName);
              break;
            case "sms":
              console.log(`[SMS] To: ${n.to} | ${n.message.substring(0, 100)}`);
              break;
            case "whatsapp":
              console.log(`[WHATSAPP] To: ${n.to} | ${n.message.substring(0, 100)}`);
              break;
          }

          results.push({ to: n.to, channel: n.channel, success: true });
        }

        return json({ success: true, sent: results.length, results });
      } catch (err) {
        console.error("[NOTIFY-BATCH] Failed:", err);
        return json({ success: false, error: "Invalid request" }, 400);
      }
    }

    return json({ ok: true, service: "makono-notifications", version: "1.0.0" });
  },
};
