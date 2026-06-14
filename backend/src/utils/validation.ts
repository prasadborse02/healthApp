import { ZodError } from 'zod';

export function formatZodErrors(error: ZodError): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const field = issue.path.join('.');
    if (!formatted[field]) {
      formatted[field] = [];
    }
    formatted[field].push(issue.message);
  }
  return formatted;
}
