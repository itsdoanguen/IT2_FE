import axios from 'axios';
import { Student, Regulation, DocStep, DocDetail, EvaluationResult, ChatResponse, AcademicEvent } from '../types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const studentApi = {
  getCurrentStudent: async (): Promise<Student> => {
    const res = await api.get('/students/me');
    return res.data;
  },
};

export const regulationApi = {
  search: async (category = 'ALL', keyword = '', signal?: AbortSignal): Promise<Regulation[]> => {
    const res = await api.get('/regulations', {
      params: { category, keyword },
      signal,
    });
    return res.data;
  },
  getById: async (id: number): Promise<Regulation> => {
    const res = await api.get(`/regulations/${id}`);
    return res.data;
  },
};

export const docApi = {
  getById: async (id: number): Promise<DocDetail> => {
    const res = await api.get(`/docs/${id}`);
    return res.data;
  },
};

export const procedureApi = {
  evaluate: async (studentCode: string): Promise<EvaluationResult> => {
    const res = await api.get(`/procedures/evaluate/${studentCode}`);
    return res.data;
  },
  submitTicket: async (data: { studentCode: string; procedureName: string; reason: string }) => {
    const res = await api.post('/procedures/tickets', data);
    return res.data;
  },
};

export const chatApi = {
  ask: async (message: string, studentCode?: string): Promise<ChatResponse> => {
    const res = await api.post('/ai-chat/query', { message, studentCode });
    return res.data;
  },
};

export const eventApi = {
  getEvents: async (eventType = 'ALL', faculty = '', className = ''): Promise<AcademicEvent[]> => {
    const res = await api.get('/events', {
      params: { eventType, faculty, className },
    });
    return res.data;
  },
};

export default api;
