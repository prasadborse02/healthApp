import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';

interface MedicineEntry {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

function parseFrequency(frequency: string): number {
  const lower = frequency.toLowerCase().trim();
  if (lower.includes('three') || lower.includes('thrice')) return 3;
  if (lower.includes('twice')) return 2;
  if (lower.includes('once')) return 1;
  return 1;
}

function parseDurationDays(duration: string): number {
  const lower = duration.toLowerCase().trim();
  const match = lower.match(/(\d+)/);
  if (!match) return 7;

  const num = parseInt(match[1], 10);
  if (lower.includes('week')) return num * 7;
  return num;
}

function getReminderTimes(timesPerDay: number): number[] {
  if (timesPerDay === 3) return [9, 14, 21];
  if (timesPerDay === 2) return [9, 21];
  return [9];
}

export async function createFromAnalysis(analysisId: string, userId: string) {
  const analysis = await prisma.analysis.findUnique({
    where: { id: analysisId },
    include: {
      submission: { select: { userId: true } },
      medicineRecords: { include: { reminders: true } },
    },
  });

  if (!analysis || analysis.submission.userId !== userId) {
    throw new AppError(404, 'Analysis not found');
  }

  // Idempotent: return existing medicines if already created
  if (analysis.medicineRecords.length > 0) {
    return analysis.medicineRecords;
  }

  const medicinesData = analysis.medicines as unknown as MedicineEntry[];
  if (!Array.isArray(medicinesData) || medicinesData.length === 0) {
    throw new AppError(400, 'No medicines found in analysis');
  }

  const now = new Date();

  for (const med of medicinesData) {
    const timesPerDay = parseFrequency(med.frequency);
    const durationDays = parseDurationDays(med.duration);
    const hours = getReminderTimes(timesPerDay);

    const reminderData: { scheduledAt: Date }[] = [];
    for (let day = 0; day < durationDays; day++) {
      for (const hour of hours) {
        const scheduledAt = new Date(now);
        scheduledAt.setDate(scheduledAt.getDate() + day);
        scheduledAt.setHours(hour, 0, 0, 0);
        reminderData.push({ scheduledAt });
      }
    }

    await prisma.medicine.create({
      data: {
        analysisId,
        name: med.name,
        dosage: med.dosage,
        frequency: med.frequency,
        duration: med.duration,
        instructions: med.instructions ?? '',
        startDate: now,
        reminders: {
          create: reminderData,
        },
      },
    });
  }

  return prisma.medicine.findMany({
    where: { analysisId },
    include: { reminders: { orderBy: { scheduledAt: 'asc' } } },
  });
}

export async function listByUser(userId: string) {
  return prisma.medicine.findMany({
    where: {
      analysis: {
        submission: { userId },
      },
    },
    include: {
      reminders: { orderBy: { scheduledAt: 'asc' } },
    },
    orderBy: { startDate: 'desc' },
  });
}

export async function updateReminderStatus(
  reminderId: string,
  userId: string,
  status: string,
) {
  if (status !== 'taken' && status !== 'skipped') {
    throw new AppError(400, 'Status must be "taken" or "skipped"');
  }

  const reminder = await prisma.reminder.findUnique({
    where: { id: reminderId },
    include: {
      medicine: {
        include: {
          analysis: {
            include: {
              submission: { select: { userId: true } },
            },
          },
        },
      },
    },
  });

  if (!reminder || reminder.medicine.analysis.submission.userId !== userId) {
    throw new AppError(404, 'Reminder not found');
  }

  return prisma.reminder.update({
    where: { id: reminderId },
    data: { status },
  });
}
