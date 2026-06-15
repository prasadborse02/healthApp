import express from 'express';
import cors from 'cors';
import path from 'path';
import pinoHttp from 'pino-http';
import { config } from './config/env';
import { prisma } from './config/db';
import { logger } from './config/logger';
import { errorHandler } from './middleware/errorHandler';
import { authRouter } from './routes/auth';
import { submissionsRouter } from './routes/submissions';
import { medicinesRouter } from './routes/medicines';

const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '1mb' }));
app.use(
  pinoHttp({
    logger,
    autoLogging: { ignore: (req) => req.url === '/api/health' },
    serializers: {
      req: (req) => ({
        method: req.method,
        url: req.url,
      }),
      res: (res) => ({
        statusCode: res.statusCode,
      }),
    },
    customSuccessMessage: (req, res) => `${req.method} ${req.url} ${res.statusCode}`,
    customErrorMessage: (req, res) => `${req.method} ${req.url} ${res.statusCode}`,
  }),
);
app.use('/uploads', express.static(path.resolve(config.uploadDir)));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRouter);
app.use('/api/submissions', submissionsRouter);
app.use('/api/medicines', medicinesRouter);

app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(config.port, () => {
    logger.info({ port: config.port }, 'Server running');
  });

  process.on('SIGTERM', () => {
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  });
}

export default app;
