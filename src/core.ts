export type Outcome = 'Still rough' | 'More even' | 'Ready to move on';

export interface Attempt {
  id: string;
  at: string;
  seconds: number;
  outcome: Outcome;
  evidence?: string;
}

export interface PracticeCard {
  id: string;
  piece: string;
  measure: string;
  action: string;
  scoreLink?: string;
  scorePhoto?: string;
  createdAt: string;
  updatedAt: string;
  status: 'queued' | 'completed';
  accumulatedSeconds: number;
  timerStartedAt?: string;
  attempts: Attempt[];
}

export interface AppData {
  version: 1;
  cards: PracticeCard[];
}

export const EMPTY_DATA: AppData = { version: 1, cards: [] };

export function makeId(): string {
  return crypto.randomUUID();
}

export function elapsedSeconds(card: PracticeCard, now = Date.now()): number {
  const running = card.timerStartedAt ? Math.max(0, Math.floor((now - Date.parse(card.timerStartedAt)) / 1000)) : 0;
  return card.accumulatedSeconds + running;
}

export function formatTime(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  return `${String(minutes).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}

export function todayQueue(cards: PracticeCard[]): PracticeCard[] {
  return cards
    .filter(card => card.status === 'queued')
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
    .slice(0, 3);
}

export function isHttpUrl(value: string): boolean {
  if (!value) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function validateImport(value: unknown): AppData {
  if (!value || typeof value !== 'object') throw new Error('That file does not contain Practice Next Card data.');
  const candidate = value as Partial<AppData>;
  if (candidate.version !== 1 || !Array.isArray(candidate.cards)) throw new Error('This backup version is not supported.');
  for (const card of candidate.cards) {
    if (!card || typeof card !== 'object' || typeof card.id !== 'string' || typeof card.piece !== 'string' ||
      typeof card.measure !== 'string' || typeof card.action !== 'string' || !['queued', 'completed'].includes(card.status) ||
      !Array.isArray(card.attempts)) {
      throw new Error('One or more cards in that backup are incomplete.');
    }
    if (card.scorePhoto && !/^data:image\/(?:jpeg|png|webp);base64,/i.test(card.scorePhoto)) {
      throw new Error('A score photo in that backup is not a supported local image.');
    }
    if (card.scoreLink && !isHttpUrl(card.scoreLink)) throw new Error('A score link in that backup is not a web address.');
  }
  return candidate as AppData;
}
