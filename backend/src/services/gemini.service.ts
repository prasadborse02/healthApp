import { promises as fs } from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Prisma } from '@prisma/client';
import { config } from '../config/env';
import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';

interface MedicineInfo {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface AnalysisResult {
  medicines: MedicineInfo[];
  doctorAdvice: string;
  lifestyle: string[];
  diseases: string[];
}

function getMimeType(fileType: string): string {
  // Multer provides full MIME types like "image/png" — return as-is
  if (fileType.includes('/')) return fileType;

  const mimeTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    pdf: 'application/pdf',
  };
  const normalized = fileType.toLowerCase().replace(/^\./, '');
  return mimeTypes[normalized] || `image/${normalized}`;
}

function buildPrompt(symptoms: string): string {
  return `Analyze this prescription and patient symptoms. Return ONLY valid JSON, no markdown.

Symptoms: ${symptoms}

JSON format:
{"medicines":[{"name":"","dosage":"","frequency":"","duration":"","instructions":""}],"doctorAdvice":"","lifestyle":[""],"diseases":[""]}

Extract medicines from prescription. Infer conditions from prescription+symptoms. Be concise.`;
}

function parseAIResponse(responseText: string): AnalysisResult {
  let cleaned = responseText.trim();

  // Strip markdown code fences if present
  const codeFenceRegex = /^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/;
  const match = cleaned.match(codeFenceRegex);
  if (match) {
    cleaned = match[1].trim();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new AppError(502, 'Failed to parse AI response');
  }

  const result = parsed as Record<string, unknown>;

  // Validate expected fields
  if (
    !Array.isArray(result.medicines) ||
    typeof result.doctorAdvice !== 'string' ||
    !Array.isArray(result.lifestyle) ||
    !Array.isArray(result.diseases)
  ) {
    throw new AppError(502, 'Failed to parse AI response');
  }

  return result as unknown as AnalysisResult;
}

export async function analyzeSubmission(submissionId: string, userId: string) {
  // Verify API key is configured
  if (!config.geminiApiKey) {
    throw new AppError(500, 'Gemini API key not configured');
  }

  // Fetch submission and verify ownership
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
  });

  if (!submission || submission.userId !== userId) {
    throw new AppError(404, 'Submission not found');
  }

  // Check if analysis already exists
  const existingAnalysis = await prisma.analysis.findUnique({
    where: { submissionId },
  });

  if (existingAnalysis) {
    throw new AppError(409, 'Analysis already exists');
  }

  // Read the uploaded file from disk
  const filePath = path.resolve(submission.filePath);

  let fileBuffer: Buffer;
  try {
    fileBuffer = await fs.readFile(filePath);
  } catch {
    throw new AppError(404, 'Uploaded file not found');
  }
  const base64Data = fileBuffer.toString('base64');
  const mimeType = getMimeType(submission.fileType);

  // Call Gemini API
  let responseText: string;

  try {
    const genAI = new GoogleGenerativeAI(config.geminiApiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-flash-latest',
      generationConfig: { responseMimeType: 'application/json' },
    });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType,
          data: base64Data,
        },
      },
      { text: buildPrompt(submission.symptoms) },
    ]);

    const response = result.response;
    responseText = response.text();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new AppError(502, `AI analysis failed: ${message}`);
  }

  // Parse the structured response
  const analysisResult = parseAIResponse(responseText);

  // Save to DB and return
  const analysis = await prisma.analysis.create({
    data: {
      submissionId,
      medicines: analysisResult.medicines as unknown as Prisma.InputJsonValue,
      doctorAdvice: analysisResult.doctorAdvice,
      lifestyle: analysisResult.lifestyle,
      diseases: analysisResult.diseases,
      rawResponse: JSON.stringify(JSON.parse(responseText)),
    },
  });

  return analysis;
}
