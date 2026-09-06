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

const DEMO_ARCHIVE = [
  ['Bach Invention No. 8', '15–18', 'Separate the left-hand turn at 72 bpm', 'The turn stayed even twice.'],
  ['Debussy · Clair de lune', '27–28', 'Balance each rolled chord under the top note', 'The melody stayed clear at half tempo.'],
  ['Mozart Sonata K. 545', '11–14', 'Land each scale turn without lifting the wrist', 'The second pass felt loose.'],
  ['Miles Davis · Solar', 'A section', 'Clap the off-beat entries before playing', 'All four entries landed after clapping.'],
  ['Villa-Lobos Prelude No. 1', '33–36', 'Place the chord shift silently three times', 'The third shift needed no correction.'],
] as const;

/** A fresh, realistic sandbox. The fixed records make reset and claim checks deterministic. */
export function createDemoData(): AppData {
  const queued: PracticeCard[] = [
    {
      id: 'demo-queue-bach', piece: 'Bach Invention No. 8', measure: '37–40',
      action: 'Loop the left-hand turn at 72 bpm three even times',
      createdAt: '2026-09-05T09:00:00.000Z', updatedAt: '2026-09-05T09:00:00.000Z',
      status: 'queued', accumulatedSeconds: 0, attempts: []
    },
    {
      id: 'demo-queue-debussy', piece: 'Debussy · Clair de lune', measure: '27–28',
      action: 'Play the rolled chords alone and keep the top note clear',
      createdAt: '2026-09-05T09:05:00.000Z', updatedAt: '2026-09-05T09:05:00.000Z',
      status: 'queued', accumulatedSeconds: 0, attempts: []
    },
    {
      id: 'demo-queue-solar', piece: 'Miles Davis · Solar', measure: 'A section',
      action: 'Clap the off-beat entries, then play the phrase twice',
      createdAt: '2026-09-05T09:10:00.000Z', updatedAt: '2026-09-05T09:10:00.000Z',
      status: 'queued', accumulatedSeconds: 0, attempts: []
    }
  ];
  const completed: PracticeCard[] = Array.from({ length: 32 }, (_, index) => {
    const sample = DEMO_ARCHIVE[index % DEMO_ARCHIVE.length];
    const at = new Date(Date.parse('2026-09-04T18:00:00.000Z') - index * 86_400_000).toISOString();
    return {
      id: `demo-archive-${index + 1}`,
      piece: sample[0],
      measure: index < DEMO_ARCHIVE.length ? sample[1] : `${12 + index}–${13 + index}`,
      action: sample[2],
      createdAt: at,
      updatedAt: at,
      status: 'completed',
      accumulatedSeconds: 90 + index * 7,
      attempts: [{
        id: `demo-attempt-${index + 1}`,
        at,
        seconds: 90 + index * 7,
        outcome: index % 3 === 0 ? 'Still rough' : index % 3 === 1 ? 'More even' : 'Ready to move on',
        evidence: sample[3]
      }]
    };
  });
  return { version: 1, cards: [...queued, ...completed] };
}

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

export function hasCardDetails(piece: string, measure: string, action: string): boolean {
  return [piece, measure, action].every(value => value.trim().length > 0);
}

export function validateImport(value: unknown): AppData {
  if (!value || typeof value !== 'object') throw new Error('That file does not contain Practice Next Card data.');
  const candidate = value as Partial<AppData>;
  if (candidate.version !== 1 || !Array.isArray(candidate.cards)) throw new Error('This backup version is not supported.');
  for (const card of candidate.cards) {
    if (!card || typeof card !== 'object' || typeof card.id !== 'string' || typeof card.piece !== 'string' ||
      typeof card.measure !== 'string' || typeof card.action !== 'string' || !hasCardDetails(card.piece, card.measure, card.action) || !['queued', 'completed'].includes(card.status) ||
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
