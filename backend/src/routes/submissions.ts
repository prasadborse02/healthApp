import path from 'path';
import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { upload } from '../middleware/upload';
import * as submissionService from '../services/submission.service';
import { analyzeSubmission } from '../services/gemini.service';
import { AppError } from '../middleware/errorHandler';
import { formatZodErrors } from '../utils/validation';

const router = Router();

router.use(authenticate);

const symptomsSchema = z.object({
  symptoms: z.string().min(1, 'Symptoms are required').max(5000, 'Symptoms text is too long'),
});

// POST / — Upload file + create submission
router.post(
  '/',
  (req: Request, res: Response, next: NextFunction) => {
    upload.single('file')(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        const message =
          err.code === 'LIMIT_FILE_SIZE'
            ? 'File size exceeds the 10MB limit'
            : err.code === 'LIMIT_UNEXPECTED_FILE'
              ? 'Invalid file type. Only JPEG, PNG, and PDF files are allowed'
              : `Upload error: ${err.message}`;
        return next(new AppError(400, message));
      }
      if (err) {
        return next(err);
      }
      next();
    });
  },
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw new AppError(400, 'File is required');
      }

      const parsed = symptomsSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(400, 'Validation failed', formatZodErrors(parsed.error));
      }

      const submission = await submissionService.create(
        req.userId!,
        req.file.path,
        req.file.mimetype,
        req.file.originalname,
        parsed.data.symptoms,
      );

      res.status(201).json(submission);
    } catch (err) {
      next(err);
    }
  },
);

// GET / — List user's submissions
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const submissions = await submissionService.listByUser(req.userId!);
    res.status(200).json(submissions);
  } catch (err) {
    next(err);
  }
});

// GET /:id — Get single submission with analysis
router.get('/:id', async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const submission = await submissionService.getById(req.params.id, req.userId!);
    res.status(200).json(submission);
  } catch (err) {
    next(err);
  }
});

// POST /:id/analyze — Trigger AI analysis
router.post('/:id/analyze', async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const analysis = await analyzeSubmission(req.params.id, req.userId!);
    res.status(200).json(analysis);
  } catch (err) {
    next(err);
  }
});

// GET /:id/file — Serve uploaded file (authenticated)
router.get('/:id/file', async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const submission = await submissionService.getById(req.params.id, req.userId!);
    res.sendFile(path.resolve(submission.filePath));
  } catch (err) {
    next(err);
  }
});

export const submissionsRouter = router;
