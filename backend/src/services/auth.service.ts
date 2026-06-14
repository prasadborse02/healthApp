import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config/env';
import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';

const BCRYPT_ROUNDS = 10;

function generateToken(userId: string): string {
  const options: SignOptions = {
    expiresIn: config.jwtExpiresIn as SignOptions['expiresIn'],
  };
  return jwt.sign({ userId }, config.jwtSecret, options);
}

function excludePassword(user: { id: string; email: string; password: string; createdAt: Date; updatedAt: Date }) {
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

export async function signup(email: string, password: string) {
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    throw new AppError(409, 'Email already in use');
  }

  const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
    },
  });

  const token = generateToken(user.id);

  return { user: excludePassword(user), token };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new AppError(401, 'Invalid email or password');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new AppError(401, 'Invalid email or password');
  }

  const token = generateToken(user.id);

  return { user: excludePassword(user), token };
}
