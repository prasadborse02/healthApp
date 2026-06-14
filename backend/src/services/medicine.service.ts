import { Medicine, Reminder } from '@prisma/client';
import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';

type MedicineWithReminders = Medicine & { reminders: Reminder[] };

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

function getTimeOfDayHint(frequency: string, instructions: string): string | null {
  const text = `${frequency} ${instructions}`.toLowerCase();
  if (text.includes('bedtime') || text.includes('before bed') || text.includes('at night'))
    return 'night';
  if (text.includes('morning')) return 'morning';
  if (text.includes('evening')) return 'evening';
  if (text.includes('after lunch') || text.includes('afternoon')) return 'afternoon';
  return null;
}

function getReminderTimes(timesPerDay: number, frequency: string, instructions: string): number[] {
  if (timesPerDay === 3) return [9, 14, 21];
  if (timesPerDay === 2) {
    const text = `${frequency} ${instructions}`.toLowerCase();
    const times: number[] = [];
    if (text.includes('morning')) times.push(9);
    if (text.includes('afternoon') || text.includes('lunch')) times.push(14);
    if (text.includes('evening')) times.push(18);
    if (text.includes('night') || text.includes('bedtime') || text.includes('before bed'))
      times.push(21);
    if (times.length === 2) return times.sort((a, b) => a - b);
    return [9, 21]; // default morning & night
  }
  // Once daily — use time-of-day hint from instructions
  const hint = getTimeOfDayHint(frequency, instructions);
  if (hint === 'night') return [21];
  if (hint === 'evening') return [18];
  if (hint === 'afternoon') return [14];
  return [9]; // default to morning
}

export async function createFromAnalysis(
  analysisId: string,
  userId: string,
  timezoneOffset: number = 0,
): Promise<MedicineWithReminders[]> {
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
    const localHours = getReminderTimes(timesPerDay, med.frequency, med.instructions ?? '');

    // Convert local hours to UTC by applying timezone offset
    // timezoneOffset is minutes from UTC (e.g., -330 for IST = UTC+5:30)
    // So UTC hour = local hour + (offset / 60)
    const offsetMinutes = timezoneOffset;

    const reminderData: { scheduledAt: Date }[] = [];
    for (let day = 0; day < durationDays; day++) {
      for (const localHour of localHours) {
        const scheduledAt = new Date(now);
        scheduledAt.setUTCDate(scheduledAt.getUTCDate() + day);
        // Set the time in UTC that corresponds to localHour in user's timezone
        const utcMinutes = localHour * 60 + offsetMinutes;
        scheduledAt.setUTCHours(0, 0, 0, 0);
        scheduledAt.setUTCMinutes(utcMinutes);
        // Skip time slots that are already past
        if (scheduledAt.getTime() <= now.getTime()) {
          continue;
        }
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

export async function listByUser(userId: string): Promise<MedicineWithReminders[]> {
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
): Promise<Reminder> {
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
