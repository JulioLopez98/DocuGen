import { DocumentReadyEmail } from "@/emails/document-ready";
import { WelcomeEmail } from "@/emails/welcome";
import { Resend } from "resend";

const DEFAULT_FROM = "DocuGen <onboarding@resend.dev>";

type SendWelcomeEmailInput = {
  to?: string | null;
  name?: string | null;
};

type SendDocumentReadyEmailInput = {
  to?: string | null;
  documentTitle: string;
  documentUrl?: string;
};

export function getResend() {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }

  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendWelcomeEmail({ to, name }: SendWelcomeEmailInput) {
  const resend = getResend();

  if (!resend || !to) {
    console.log("resend_welcome_skipped", { hasApiKey: Boolean(process.env.RESEND_API_KEY), hasRecipient: Boolean(to) });
    return;
  }

  const result = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || DEFAULT_FROM,
    to,
    subject: "Bienvenido a DocuGen",
    react: WelcomeEmail({ name: name || "profesional" }),
  });

  if (result.error) {
    console.error("resend_welcome_error", result.error);
    throw new Error(result.error.message);
  }

  console.log("resend_welcome_sent", { id: result.data?.id, to });
}

export async function sendDocumentReadyEmail({ to, documentTitle, documentUrl }: SendDocumentReadyEmailInput) {
  const resend = getResend();

  if (!resend || !to) {
    console.log("resend_document_ready_skipped", { hasApiKey: Boolean(process.env.RESEND_API_KEY), hasRecipient: Boolean(to) });
    return;
  }

  const result = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || DEFAULT_FROM,
    to,
    subject: `Documento listo: ${documentTitle}`,
    react: DocumentReadyEmail({ documentTitle, documentUrl }),
  });

  if (result.error) {
    console.error("resend_document_ready_error", result.error);
    throw new Error(result.error.message);
  }

  console.log("resend_document_ready_sent", { id: result.data?.id, to, documentTitle });
}
