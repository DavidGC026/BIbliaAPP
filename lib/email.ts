import { getAppUrl } from "@/lib/auth"

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "BibliaAPP <onboarding@resend.dev>"

interface SendEmailOptions {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<void> {
  if (!RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY no está configurada.")
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html,
    }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message =
      typeof data?.message === "string"
        ? data.message
        : typeof data?.error === "string"
          ? data.error
          : "Error al enviar el correo"
    throw new Error(message)
  }
}

function emailLayout(content: string): string {
  return `
    <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="font-size: 22px; margin: 0; color: #7c5c2b;">BibliaAPP</h1>
        <p style="font-size: 13px; color: #666; margin: 8px 0 0;">Tu estudio bíblico personal</p>
      </div>
      ${content}
      <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0 16px;" />
      <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">
        Si no solicitaste este correo, puedes ignorarlo con seguridad.
      </p>
    </div>
  `
}

function actionButton(href: string, label: string): string {
  return `
    <p style="text-align: center; margin: 28px 0;">
      <a href="${href}" style="display: inline-block; background: #7c5c2b; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 15px;">
        ${label}
      </a>
    </p>
  `
}

export async function sendVerificationEmail(
  to: string,
  name: string,
  token: string,
  origin?: string,
): Promise<void> {
  const verifyUrl = `${getAppUrl(origin)}/verify-email?token=${encodeURIComponent(token)}`

  await sendEmail({
    to,
    subject: "Verifica tu correo — BibliaAPP",
    html: emailLayout(`
      <p style="font-size: 16px; line-height: 1.6;">Hola <strong>${escapeHtml(name)}</strong>,</p>
      <p style="font-size: 15px; line-height: 1.6; color: #444;">
        Gracias por registrarte en BibliaAPP. Confirma tu correo electrónico para activar tu cuenta y acceder a notas, devocionales y más.
      </p>
      ${actionButton(verifyUrl, "Verificar mi correo")}
      <p style="font-size: 13px; color: #666; line-height: 1.5;">
        Este enlace expira en 24 horas. Si el botón no funciona, copia y pega esta URL en tu navegador:<br />
        <a href="${verifyUrl}" style="color: #7c5c2b; word-break: break-all;">${verifyUrl}</a>
      </p>
    `),
  })
}

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  token: string,
  origin?: string,
): Promise<void> {
  const resetUrl = `${getAppUrl(origin)}/reset-password?token=${encodeURIComponent(token)}`

  await sendEmail({
    to,
    subject: "Restablecer contraseña — BibliaAPP",
    html: emailLayout(`
      <p style="font-size: 16px; line-height: 1.6;">Hola <strong>${escapeHtml(name)}</strong>,</p>
      <p style="font-size: 15px; line-height: 1.6; color: #444;">
        Recibimos una solicitud para restablecer la contraseña de tu cuenta en BibliaAPP.
      </p>
      ${actionButton(resetUrl, "Restablecer contraseña")}
      <p style="font-size: 13px; color: #666; line-height: 1.5;">
        Este enlace expira en 1 hora. Si no solicitaste el cambio, ignora este mensaje.
      </p>
      <p style="font-size: 13px; color: #666; line-height: 1.5; word-break: break-all;">
        <a href="${resetUrl}" style="color: #7c5c2b;">${resetUrl}</a>
      </p>
    `),
  })
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}
