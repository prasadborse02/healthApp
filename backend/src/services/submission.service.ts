import { PrismaClient, Prisma } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

export async function create(
  userId: string,
  filePath: string,
  fileType: string,
  fileName: string,
  symptoms: string,
) {
  return prisma.submission.create({
    data: {
      userId,
      filePath,
      fileType,
      fileName,
      symptoms,
    },
  });
}

export async function listByUser(userId: string) {
  return prisma.submission.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      analysis: {
        select: {
          id: true,
          createdAt: true,
        },
      },
    },
  });
}

export async function getById(id: string, userId: string) {
  const submission = await prisma.submission.findUnique({
    where: { id },
    include: {
      analysis: true,
    },
  });

  if (!submission || submission.userId !== userId) {
    throw new AppError(404, 'Submission not found');
  }

  return submission;
}

export interface AnalysisData {
  medicines: Prisma.InputJsonValue;
  doctorAdvice: string;
  lifestyle: Prisma.InputJsonValue;
  diseases: Prisma.InputJsonValue;
  rawResponse: string;
}

export async function saveAnalysis(submissionId: string, analysisData: AnalysisData) {
  return prisma.analysis.create({
    data: {
      submissionId,
      medicines: analysisData.medicines,
      doctorAdvice: analysisData.doctorAdvice,
      lifestyle: analysisData.lifestyle,
      diseases: analysisData.diseases,
      rawResponse: analysisData.rawResponse,
    },
  });
}
