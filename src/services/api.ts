import { MenuResponse } from '@/types';

export interface ServerTimeResponse {
  serverTime: string;
  serverOffsetMs: number;
}

export async function fetchMenu(): Promise<MenuResponse> {
  const response = await fetch('/api/menu');
  if (!response.ok) {
    throw new Error(`Failed to fetch menu: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export async function fetchServerTime(): Promise<ServerTimeResponse> {
  const response = await fetch('/api/time');
  if (!response.ok) {
    throw new Error(`Failed to fetch server time: ${response.status} ${response.statusText}`);
  }
  return response.json();
}
