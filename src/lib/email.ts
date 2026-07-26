/**
 * Email utility module — wraps the Resend API for transactional email.
 *
 * Uses a default "from" address suitable for Resend's free tier testing
 * domain. In production the from address should be updated to a verified
 * domain once one is configured in Resend.
 */
import { Resend } from "resend";

const DEFAULT_FROM = 'LOGISTIQS NETWORK <outreach@resend.dev>';

let _resend: Resend | null = null;

function getResend(): Resend {
  if (_resend) return _resend;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not set");
  _resend = new Resend(apiKey);
  return _resend;
}

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  body: string; // HTML body
  from?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send a single email via Resend.
 *
 * Returns { success, messageId } on success, or throws on failure.
 * The body is treated as HTML.
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const to = Array.isArray(params.to) ? params.to : [params.to];

  // Safety: only send to addresses that look valid
  const valid = to.filter((e) => e && e.includes("@"));
  if (valid.length === 0) {
    throw new Error("No valid recipient email addresses provided");
  }

  try {
    const resend = getResend();
    const result = await resend.emails.send({
      from: params.from || DEFAULT_FROM,
      to: valid,
      subject: params.subject,
      html: params.body,
    });

    if (result.error) {
      console.error("[Email] Resend API error:", result.error);
      throw new Error(`Resend error: ${result.error.message}`);
    }

    console.log(`[Email] Sent to ${valid.join(", ")} — id: ${result.data?.id}`);
    return { success: true, messageId: result.data?.id };
  } catch (err: any) {
    console.error("[Email] Failed to send:", err);
    throw err;
  }
}
