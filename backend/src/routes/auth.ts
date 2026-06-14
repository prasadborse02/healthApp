import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as authService from '../services/auth.service';
import { AppError } from '../middleware/errorHandler';
import { formatZodErrors } from '../utils/validation';

const authRouter = Router();

const authSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

authRouter.post('/signup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = authSchema.safeParse(req.body);
    if (!result.success) {
      throw new AppError(400, 'Validation failed', formatZodErrors(result.error));
    }

    const { email, password } = result.data;
    const data = await authService.signup(email, password);

    res.status(201).json(data);
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
