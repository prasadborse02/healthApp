import axios from 'axios';

export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  `${window.location.protocol}//${window.location.hostname}:3000/api`;

export const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('hc_token') : null;
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error?.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('hc_token');
      localStorage.removeItem('hc_user');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export function fileUrl(filePath: string) {
  const origin = API_BASE_URL.replace(/\/api\/?$/, '');
  // Extract filename from absolute or relative path and serve via /uploads/
  const fileName = filePath.split('/').pop();
  return `${origin}/uploads/${fileName}`;
}

export interface User {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface Medicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export interface Analysis {
  id: string;
  submissionId: string;
  medicines: Medicine[];
  doctorAdvice: string;
  lifestyle: string[];
  diseases: string[];
  rawResponse?: string;
  createdAt: string;
}

export interface Submission {
  id: string;
  userId: string;
  filePath: string;
  fileType: string;
  fileName: string;
  symptoms: string;
  createdAt: string;
  analysis: Analysis | null;
}

export interface Reminder {
  id: string;
  medicineId: string;
  scheduledAt: string;
  status: 'pending' | 'taken' | 'skipped';
  createdAt: string;
}

export interface MedicineRecord {
  id: string;
  analysisId: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  startDate: string;
  reminders: Reminder[];
}
