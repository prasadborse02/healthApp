import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  jwtSecret: process.env.JWT_SECRET || (() => {
    if (process.env.NODE_ENV === 'production') throw new Error('JWT_SECRET environment variable is required in production');
    return 'dev-only-secret';
  })(),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  nodeEnv: process.env.NODE_ENV || 'development',
} as const;
