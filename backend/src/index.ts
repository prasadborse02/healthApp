import express from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config/env';
import { prisma } from './config/db';
import { errorHandler } from './middleware/errorHandler';
import { authRouter } from './routes/auth';
import { submissionsRouter } from './routes/submissions';

const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(path.resolve(config.uploadDir)));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRouter);
app.use('/api/submissions', submissionsRouter);

app.use(errorHandler);

const server = app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});

process.on('SIGTERM', () => {
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
});

export default app;
