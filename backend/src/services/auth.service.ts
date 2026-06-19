import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { User } from '@prisma/client';
import { config } from '../config/env';
import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';
import * as otpService from './otp.service';

type UserWithoutPassword = Omit<User, 'password'>;

interface AuthResult {
  user: UserWithoutPassword;
  token: string;
}

const BCRYPT_ROUNDS = 10;

function generateToken(userId: string): string {
  const options: SignOptions = {
    expiresIn: config.jwtExpiresIn as SignOptions['expiresIn'],
  };
  return jwt.sign({ userId }, config.jwtSecret, options);
}

function excludePassword(user: User): UserWithoutPassword {
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

/**
 * Register a user as unverified and send an email OTP. No token is issued until
 * the email is verified via verifyEmailOtp. If the email belongs to an existing
 * but still-unverified account, the password is refreshed and a new OTP sent
 * (lets a user who abandoned verification retry without being blocked).
 */
export async function signup(email: string, password: string): Promise<{ email: string }> {
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser && existingUser.isVerified) {
    throw new AppError(409, 'Email already in use');
  }

  const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

  if (existingUser) {
    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    });
  } else {
    await prisma.user.create({
      data: { email, password: hashedPassword },
    });
  }

  await otpService.generateOtp(email);

  return { email };
}

/**
 * Verify the email OTP. On success, mark the user verified and issue a JWT.
 */
export async function verifyEmailOtp(email: string, code: string): Promise<AuthResult> {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  await otpService.verifyOtp(email, code);

  const verifiedUser = await prisma.user.update({
    where: { email },
    data: { isVerified: true },
  });

  const token = generateToken(verifiedUser.id);

  return { user: excludePassword(verifiedUser), token };
}

/**
 * Re-send an email OTP for an unverified account (resend cooldown enforced in
 * the OTP service).
 */
export async function resendOtp(email: string): Promise<{ email: string }> {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  if (user.isVerified) {
    throw new AppError(409, 'Email is already verified');
  }

  await otpService.generateOtp(email);

  return { email };
}

export async function login(email: string, password: string): Promise<AuthResult> {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new AppError(401, 'Invalid email or password');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new AppError(401, 'Invalid email or password');
  }

  if (!user.isVerified) {
    throw new AppError(403, 'Email not verified. Please verify your email to continue.');
  }

  const token = generateToken(user.id);

  return { user: excludePassword(user), token };
}
