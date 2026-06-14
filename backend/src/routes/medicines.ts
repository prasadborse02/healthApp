import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import * as medicineService from '../services/medicine.service';
import { AppError } from '../middleware/errorHandler';
import { formatZodErrors } from '../utils/validation';

const router = Router();

router.use(authenticate);

// GET / — List user's medicines with reminders
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const medicines = await medicineService.listByUser(req.userId!);
    res.status(200).json(medicines);
  } catch (err) {
    next(err);
  }
});

// POST /from-analysis/:analysisId — Create medicines from an analysis
router.post(
  '/from-analysis/:analysisId',
  async (req: Request<{ analysisId: string }>, res: Response, next: NextFunction) => {
    try {
      const medicines = await medicineService.createFromAnalysis(
        req.params.analysisId,
        req.userId!,
      );
      res.status(201).json(medicines);
    } catch (err) {
      next(err);
    }
  },
);

const updateStatusSchema = z.object({
  status: z.enum(['taken', 'skipped'], {
    errorMap: () => ({ message: 'Status must be "taken" or "skipped"' }),
  }),
});

// PATCH /reminders/:id — Update reminder status
router.patch(
  '/reminders/:id',
  async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const parsed = updateStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(400, 'Validation failed', formatZodErrors(parsed.error));
      }

      const reminder = await medicineService.updateReminderStatus(
        req.params.id,
        req.userId!,
        parsed.data.status,
      );
      res.status(200).json(reminder);
    } catch (err) {
      next(err);
    }
  },
);

export const medicinesRouter = router;
