import { api } from './api';

export interface Finding {
  id: number;
  title: string;
  severity: string;
  filePath?: string | null;
  startLine?: number | null;
  message?: string | null;
}

export interface ScanResult {
  id: number;
  repoId: number;
}

export async function fetchScanHistory(repoId: number): Promise<ScanResult[]> {
  const { data } = await api.get(`/repos/${repoId}/scans`);
  return data;
}

export async function fetchFindings(scanId: number): Promise<Finding[]> {
  const { data } = await api.get(`/scans/${scanId}/findings`);
  return data;
}
export async function startScan(repoId: number): Promise<ScanResult> {
  const { data } = await api.post(`/scans/start/${repoId}`, null, { timeout: 300000 });
  return data;
}