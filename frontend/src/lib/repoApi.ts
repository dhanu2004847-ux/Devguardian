import { api } from './api';

export interface Repo {
  id: number;
  name: string;
  url: string;
}

export async function fetchRepos(): Promise<Repo[]> {
  const { data } = await api.get('/repos');
  return data;
}
export async function connectRepo(fullName: string): Promise<Repo> {
  // Sends both fields; Spring ignores whichever one your DTO doesn't use.
  const { data } = await api.post('/repos/connect', {
    fullName,
    url: `https://github.com/${fullName}.git`,
  });
  return data;
}

export async function disconnectRepo(id: number): Promise<void> {
  await api.delete(`/repos/${id}`);
}