import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config/env';
import { logger } from '../config/logger';

// Lazily-built singleton transporter (mirrors the Prisma singleton pattern).
// When SMTP is not configured we skip building a transporter and fall back to
// logging the OTP to the console — lets the full flow be developed/tested
// before any SMTP credentials exist.
let transporter: Transporter | null = null;

function isSmtpConfigured(): boolean {
  return Boolean(config.smtpHost && config.smtpUser && config.smtpPass);
}

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpPort === 465, // true for 465 (SSL), false for 587 (STARTTLS)
      auth: { user: config.smtpUser, pass: config.smtpPass },
    });
  }
  return transporter;
}

export async function sendOtpEmail(email: string, code: string): Promise<void> {
  const subject = 'Your Health Companion verification code';
  const text = `Your verification code is ${code}. It expires in ${config.otpExpiryMinutes} minutes.`;
  const html = `<p>Your Health Companion verification code is:</p>
<p style="font-size:24px;font-weight:bold;letter-spacing:4px">${code}</p>
<p>This code expires in ${config.otpExpiryMinutes} minutes. If you did not request it, you can ignore this email.</p>`;

  if (!isSmtpConfigured()) {
    logger.warn(
      { email, code },
      'SMTP not configured — logging OTP instead of sending email',
    );
    return;
  }

  try {
    await getTransporter().sendMail({
      from: config.smtpFrom,
      to: email,
      subject,
      text,
      html,
    });
    logger.info({ email }, 'OTP email sent');
  } catch (err) {
    logger.error({ err, email }, 'Failed to send OTP email');
    throw err;
  }
}
