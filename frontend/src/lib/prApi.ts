import { api } from './api';

export interface PullRequestRecord {
  id: number;
  findingId: number;
  repoId: number;
  diffContent: string | null;
  status: 'PROPOSED' | 'APPROVED' | 'REJECTED';
  githubPrUrl: string | null;
  createdAt: string;
  approvedAt: string | null;
}

export async function fetchPRs(repoId: number): Promise<PullRequestRecord[]> {
  const { data } = await api.get(`/pr/${repoId}`);
  return data;
}

export async function approvePR(prRecordId: number): Promise<PullRequestRecord> {
  const { data } = await api.post(`/pr/${prRecordId}/approve`);
  return data;
}

export async function rejectPR(prRecordId: number): Promise<PullRequestRecord> {
  const { data } = await api.post(`/pr/${prRecordId}/reject`);
  return data;
}
export async function proposePR(findingId: number): Promise<PullRequestRecord> {
  const { data } = await api.post(`/pr/propose/${findingId}`);
  return data;
}