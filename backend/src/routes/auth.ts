import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as authService from '../services/auth.service';
import { AppError } from '../middleware/errorHandler';
import { formatZodErrors } from '../utils/validation';

const authRouter = Router();

const authSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

const verifyOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
  code: z.string().regex(/^\d{6}$/, 'Code must be 6 digits'),
});

const resendOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
});

authRouter.post('/signup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = authSchema.safeParse(req.body);
    if (!result.success) {
      throw new AppError(400, 'Validation failed', formatZodErrors(result.error));
    }

    const { email, password } = result.data;
    const data = await authService.signup(email, password);

    res.status(202).json({
      message: 'Verification code sent to your email',
      ...data,
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/verify-otp', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = verifyOtpSchema.safeParse(req.body);
    if (!result.success) {
      throw new AppError(400, 'Validation failed', formatZodErrors(result.error));
    }

    const { email, code } = result.data;
    const data = await authService.verifyEmailOtp(email, code);

    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
});

authRouter.post('/resend-otp', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = resendOtpSchema.safeParse(req.body);
    if (!result.success) {
      throw new AppError(400, 'Validation failed', formatZodErrors(result.error));
    }

    const { email } = result.data;
    const data = await authService.resendOtp(email);

    res.status(200).json({
      message: 'Verification code sent to your email',
      ...data,
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = authSchema.safeParse(req.body);
    if (!result.success) {
      throw new AppError(400, 'Validation failed', formatZodErrors(result.error));
    }

    const { email, password } = result.data;
    const data = await authService.login(email, password);

    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
});

export { authRouter };
