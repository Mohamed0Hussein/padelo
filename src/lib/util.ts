import type { TeamRef } from './types';

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const teamLabel = (t: TeamRef) => t.players.filter(Boolean).join(' / ');
export const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('') || '?';
export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;
export const playerId = (name: string) => name.trim().toLowerCase();

export function timeAgo(ts: number): string {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'Yesterday' : `${d} days ago`;
}

export const mmss = (ms: number) => {
  const m = Math.floor(ms / 60000);
  return m >= 60 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m` : `${m} min`;
};

export const FORMAT_NAME: Record<string, string> = {
  ROUND_ROBIN: 'Round robin',
  GROUPS_KNOCKOUT: 'Groups + knockout',
  KNOCKOUT: 'Knockout',
  AMERICANO: 'Americano',
};
