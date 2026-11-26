import { api } from './api';

export interface RiskScore {
  id: number;
  score: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  calculatedAt: string;
}

export async function fetchLatestRisk(repoId: number): Promise<RiskScore | null> {
  try {
    const { data } = await api.get(`/risk/${repoId}`);
    return data;
  } catch {
    return null; // no risk score calculated yet for this repo
  }
}
export async function recalculateRisk(repoId: number): Promise<RiskScore | null> {
  try {
    const { data } = await api.post(`/risk/${repoId}/recalculate`);
    return data;
  } catch {
    return null;
  }
}