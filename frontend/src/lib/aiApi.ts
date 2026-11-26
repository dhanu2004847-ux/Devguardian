import { api } from './api';

interface AIResponse {
  response: string;
}

const AI_TIMEOUT = { timeout: 120000 }; // Gemini can take a while, especially when it retries

export async function explainFinding(findingId: number): Promise<string> {
  const { data } = await api.post<AIResponse>(`/ai/explain/${findingId}`, null, AI_TIMEOUT);
  return data.response;
}

export async function suggestFix(findingId: number): Promise<string> {
  const { data } = await api.post<AIResponse>(`/ai/suggest-fix/${findingId}`, null, AI_TIMEOUT);
  return data.response;
}

export async function askAboutFinding(findingId: number, question: string): Promise<string> {
  const { data } = await api.post<AIResponse>(`/ai/ask/${findingId}`, { question }, AI_TIMEOUT);
  return data.response;
}