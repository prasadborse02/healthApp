import { Submission, Analysis } from '@prisma/client';
import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';

export async function create(
  userId: string,
  filePath: string,
  fileType: string,
  fileName: string,
  symptoms: string,
): Promise<Submission> {
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

export async function listByUser(
  userId: string,
): Promise<(Submission & { analysis: Pick<Analysis, 'id' | 'createdAt'> | null })[]> {
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

export async function getById(
  id: string,
  userId: string,
): Promise<Submission & { analysis: Analysis | null }> {
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
