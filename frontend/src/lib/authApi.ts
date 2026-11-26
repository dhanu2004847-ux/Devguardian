import { api } from './api';

export interface UserProfile {
  id: number;
  email: string;
  role: 'ADMIN' | 'DEVELOPER';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export async function registerUser(email: string, password: string): Promise<AuthTokens> {
  const { data } = await api.post('/auth/register', { email, password });
  return data.data ?? data;
}

export async function loginUser(email: string, password: string): Promise<AuthTokens> {
  const { data } = await api.post('/auth/login', { email, password });
  return data.data ?? data;
}

export async function logoutUser(refreshToken: string): Promise<void> {
  await api.post('/auth/logout', { refreshToken });
}

export async function fetchCurrentUser(): Promise<UserProfile> {
  const { data } = await api.get('/auth/me');
  return data.data ?? data;
}
