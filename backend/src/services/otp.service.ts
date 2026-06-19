import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { config } from '../config/env';
import { prisma } from '../config/db';
import { logger } from '../config/logger';
import { AppError } from '../middleware/errorHandler';
import { sendOtpEmail } from './email.service';

const BCRYPT_ROUNDS = 10;

function generateCode(): string {
  // Cryptographically secure 6-digit code, zero-padded.
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
}

/**
 * Generate a fresh OTP for an email, hash and persist it (overwriting any
 * prior code for that email), and send it via the email service.
 * Enforces a resend cooldown to prevent email spam / abuse.
 */
export async function generateOtp(email: string): Promise<void> {
  const existing = await prisma.emailOtp.findUnique({ where: { email } });

  if (existing) {
    const ageSeconds = (Date.now() - existing.createdAt.getTime()) / 1000;
    if (ageSeconds < config.otpResendCooldownSeconds) {
      const wait = Math.ceil(config.otpResendCooldownSeconds - ageSeconds);
      throw new AppError(429, `Please wait ${wait}s before requesting a new code`);
    }
  }

  const code = generateCode();
  const codeHash = await bcrypt.hash(code, BCRYPT_ROUNDS);
  const expiresAt = new Date(Date.now() + config.otpExpiryMinutes * 60 * 1000);

  // Upsert: one active OTP per email, attempts reset on every new code.
  await prisma.emailOtp.upsert({
    where: { email },
    create: { email, codeHash, expiresAt, attempts: 0 },
    update: { codeHash, expiresAt, attempts: 0, createdAt: new Date() },
  });

  await sendOtpEmail(email, code);
}

/**
 * Verify a submitted code against the stored hash. Consumes the OTP on success.
 * Throws AppError on missing / expired / exhausted / invalid code.
 */
export async function verifyOtp(email: string, code: string): Promise<void> {
  const record = await prisma.emailOtp.findUnique({ where: { email } });

  if (!record) {
    throw new AppError(400, 'No verification code found. Please request a new one.');
  }

  if (record.expiresAt.getTime() < Date.now()) {
    await prisma.emailOtp.delete({ where: { email } });
    throw new AppError(400, 'Verification code has expired. Please request a new one.');
  }

  if (record.attempts >= config.otpMaxAttempts) {
    await prisma.emailOtp.delete({ where: { email } });
    throw new AppError(429, 'Too many incorrect attempts. Please request a new code.');
  }

  const isValid = await bcrypt.compare(code, record.codeHash);
  if (!isValid) {
    await prisma.emailOtp.update({
      where: { email },
      data: { attempts: { increment: 1 } },
    });
    throw new AppError(400, 'Invalid verification code');
  }

  // Success — consume the OTP so it can't be reused.
  await prisma.emailOtp.delete({ where: { email } });
}

/**
 * Hard-delete expired OTP rows. Called periodically so the table stays small;
 * verification already rejects expired codes regardless of this sweep.
 */
export async function cleanupExpiredOtps(): Promise<void> {
  const { count } = await prisma.emailOtp.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  if (count > 0) {
    logger.info({ count }, 'Cleaned up expired OTPs');
  }
}
