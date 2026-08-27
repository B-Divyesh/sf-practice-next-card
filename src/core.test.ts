import { describe, expect, it } from 'vitest';
import { elapsedSeconds, formatTime, isHttpUrl, todayQueue, validateImport, type PracticeCard } from './core';

const card = (id: string, status: PracticeCard['status'], createdAt: string): PracticeCard => ({
  id, status, createdAt, updatedAt: createdAt, piece: 'Sonata', measure: '37', action: 'Slow the leap',
  accumulatedSeconds: 0, attempts: []
});

describe('practice card rules', () => {
  it('shows only the first three queued cards', () => {
    const cards = [card('4', 'queued', '2026-01-04'), card('1', 'queued', '2026-01-01'), card('x', 'completed', '2025-01-01'), card('3', 'queued', '2026-01-03'), card('2', 'queued', '2026-01-02')];
    expect(todayQueue(cards).map(item => item.id)).toEqual(['1', '2', '3']);
  });

  it('adds a running interval to saved timer time', () => {
    expect(elapsedSeconds({ ...card('1', 'queued', '2026-01-01'), accumulatedSeconds: 12, timerStartedAt: '2026-01-01T00:00:00Z' }, Date.parse('2026-01-01T00:00:08Z'))).toBe(20);
    expect(formatTime(65)).toBe('01:05');
  });

  it('accepts only web score links', () => {
    expect(isHttpUrl('https://example.com/my-score')).toBe(true);
    expect(isHttpUrl('javascript:alert(1)')).toBe(false);
  });

  it('rejects malformed backups', () => {
    expect(() => validateImport({ version: 2, cards: [] })).toThrow(/not supported/);
    expect(validateImport({ version: 1, cards: [] }).cards).toEqual([]);
  });
});
