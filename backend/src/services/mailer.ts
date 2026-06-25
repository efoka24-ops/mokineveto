import nodemailer from 'nodemailer';
import { config } from '../config.js';

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: { user: config.smtp.user, pass: config.smtp.pass },
    });
  }
  return transporter;
}

export async function sendOtpEmail(to: string, code: string): Promise<void> {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto">
      <h2 style="color:#3DB54A;margin-bottom:4px">MokineVeto</h2>
      <p style="color:#4A2317">Votre code de vérification est :</p>
      <div style="font-size:34px;font-weight:bold;letter-spacing:8px;color:#4A2317;
                  background:#D7F0DD;border-radius:12px;padding:16px;text-align:center">${code}</div>
      <p style="color:#6B5B4F;font-size:13px">Ce code expire dans ${Math.round(config.otp.ttlSeconds / 60)} minutes.
      Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.</p>
    </div>`;
  await getTransporter().sendMail({
    from: config.smtp.from,
    to,
    subject: `MokineVeto — Code de vérification ${code}`,
    text: `Votre code MokineVeto est : ${code} (valable ${Math.round(config.otp.ttlSeconds / 60)} min).`,
    html,
  });
}

export async function verifySmtp(): Promise<boolean> {
  try {
    await getTransporter().verify();
    return true;
  } catch (e) {
    console.error('[mailer] échec de vérification SMTP', e);
    return false;
  }
}
