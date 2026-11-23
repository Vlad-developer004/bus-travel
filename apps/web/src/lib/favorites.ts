'use client';

import { useCallback, useEffect, useState } from 'react';

const KEY = 'bt-favs';
const EVENT = 'bt-favs-changed';

const read = (): string[] => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
};

export function useFavorites() {
  const [favs, setFavs] = useState<string[]>([]);

  useEffect(() => {
    const sync = () => setFavs(read());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const toggle = useCallback((from: string, to: string) => {
    const id = `${from}>${to}`;
    const cur = read();
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [id, ...cur].slice(0, 12);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return { favs, has: (from: string, to: string) => favs.includes(`${from}>${to}`), toggle };
}

const RECENT = 'bt-recent';
export interface Recent {
  from: string;
  to: string;
  date: string;
  passengers: number;
  ret?: string;
}

export const readRecent = (): Recent[] => {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT) ?? '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};

export function saveRecent(r: Recent) {
  try {
    const next = [r, ...readRecent().filter((x) => !(x.from === r.from && x.to === r.to))].slice(0, 4);
    localStorage.setItem(RECENT, JSON.stringify(next));
  } catch {
  }
}
