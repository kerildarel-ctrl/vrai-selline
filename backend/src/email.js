/**
 * Service d'envoi d'emails via l'API Brevo (Sendinblue).
 * Utilise fetch natif (Node 18+) pour éviter une dépendance supplémentaire.
 */

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email'

async function sendEmail(config, { to, toName, subject, html }) {
  if (!config.brevoApiKey || !config.brevoSender) {
    console.warn('⚠️  Brevo non configuré : email non envoyé à', to)
    return
  }

  const body = {
    sender: { email: config.brevoSender, name: 'Selline' },
    to: [{ email: to, name: toName }],
    subject,
    htmlContent: html,
  }

  const res = await fetch(BREVO_URL, {
    method: 'POST',
    headers: {
      'api-key': config.brevoApiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    console.error(`[Brevo] Erreur ${res.status}:`, text)
    throw new Error(`Brevo ${res.status}: ${text}`)
  }
  console.log(`[Brevo] ✅ Email envoyé à ${to}`)
}

/** Email de vérification envoyé à l'inscription. */
export async function sendVerificationEmail(config, { to, name, token }) {
  const link = `${config.frontendUrl}/verify-email?token=${token}`
  await sendEmail(config, {
    to,
    toName: name,
    subject: 'Vérifiez votre adresse e-mail – Selline',
    html: `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#6C3BE2 0%,#9B59B6 100%);padding:36px 40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">Selline</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">La marketplace camerounaise</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:22px;font-weight:600;">Bonjour ${name} 👋</h2>
            <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6;">
              Merci de vous être inscrit sur <strong>Selline</strong> ! Pour activer votre compte et commencer à acheter ou vendre, veuillez confirmer votre adresse e-mail en cliquant sur le bouton ci-dessous.
            </p>
            <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
              <tr>
                <td style="background:linear-gradient(135deg,#6C3BE2 0%,#9B59B6 100%);border-radius:8px;">
                  <a href="${link}" style="display:inline-block;padding:14px 36px;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;border-radius:8px;">
                    ✉️ Vérifier mon e-mail
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 8px;color:#888;font-size:13px;text-align:center;">
              Ce lien expire dans <strong>24 heures</strong>.
            </p>
            <p style="margin:0;color:#aaa;font-size:12px;text-align:center;word-break:break-all;">
              Ou copiez ce lien : <a href="${link}" style="color:#6C3BE2;">${link}</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px;background:#f8f8fb;border-top:1px solid #eee;text-align:center;">
            <p style="margin:0;color:#aaa;font-size:12px;">
              Si vous n'avez pas créé de compte Selline, ignorez cet e-mail.<br>
              © ${new Date().getFullYear()} Selline – Cameroun
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  })
}

/** Email de réinitialisation du mot de passe. */
export async function sendPasswordResetEmail(config, { to, name, token }) {
  const link = `${config.frontendUrl}/reset-password?token=${token}`
  await sendEmail(config, {
    to,
    toName: name,
    subject: 'Réinitialisation de votre mot de passe – Selline',
    html: `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#6C3BE2 0%,#9B59B6 100%);padding:36px 40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">Selline</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">La marketplace camerounaise</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:22px;font-weight:600;">Réinitialisation du mot de passe</h2>
            <p style="margin:0 0 8px;color:#555;font-size:15px;line-height:1.6;">
              Bonjour <strong>${name}</strong>,
            </p>
            <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6;">
              Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte Selline. Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.
            </p>
            <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
              <tr>
                <td style="background:linear-gradient(135deg,#E24B3B 0%,#E8785A 100%);border-radius:8px;">
                  <a href="${link}" style="display:inline-block;padding:14px 36px;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;border-radius:8px;">
                    🔑 Réinitialiser mon mot de passe
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 8px;color:#888;font-size:13px;text-align:center;">
              Ce lien expire dans <strong>1 heure</strong>.
            </p>
            <p style="margin:0 0 16px;color:#aaa;font-size:12px;text-align:center;word-break:break-all;">
              Ou copiez ce lien : <a href="${link}" style="color:#E24B3B;">${link}</a>
            </p>
            <div style="background:#fff8f7;border:1px solid #fce;border-radius:8px;padding:12px 16px;">
              <p style="margin:0;color:#c0392b;font-size:13px;">
                ⚠️ Si vous n'avez pas demandé de réinitialisation, ignorez cet e-mail. Votre mot de passe ne sera pas modifié.
              </p>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px;background:#f8f8fb;border-top:1px solid #eee;text-align:center;">
            <p style="margin:0;color:#aaa;font-size:12px;">
              © ${new Date().getFullYear()} Selline – Cameroun
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  })
}
