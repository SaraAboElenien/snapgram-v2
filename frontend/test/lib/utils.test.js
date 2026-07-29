import { describe, it, expect, vi, afterEach } from 'vitest';
import { getUserHandle, checkIsLiked, multiFormatDateString } from '@/lib/utils';

describe('getUserHandle', () => {
  it('lowercases and concatenates first/last name with no space', () => {
    expect(getUserHandle({ firstName: 'Lewis', lastName: 'Hamilton' })).toBe('lewishamilton');
  });

  it('handles missing fields without throwing', () => {
    expect(getUserHandle({})).toBe('');
    expect(getUserHandle(undefined)).toBe('');
  });
});

describe('checkIsLiked', () => {
  it('returns true when the userId is in the like list', () => {
    expect(checkIsLiked(['a', 'b', 'c'], 'b')).toBe(true);
  });

  it('returns false when the userId is not in the like list', () => {
    expect(checkIsLiked(['a', 'b', 'c'], 'z')).toBe(false);
  });
});

describe('multiFormatDateString', () => {
  const NOW = new Date('2026-07-22T12:00:00.000Z');

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "Just now" for a timestamp seconds ago', () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const tenSecondsAgo = new Date(NOW.getTime() - 10 * 1000).toISOString();
    expect(multiFormatDateString(tenSecondsAgo)).toBe('Just now');
  });

  it('returns "N minutes ago" within the last hour', () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const fiveMinutesAgo = new Date(NOW.getTime() - 5 * 60 * 1000).toISOString();
    expect(multiFormatDateString(fiveMinutesAgo)).toBe('5 minutes ago');
  });

  it('returns "N hours ago" within the last day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const threeHoursAgo = new Date(NOW.getTime() - 3 * 60 * 60 * 1000).toISOString();
    expect(multiFormatDateString(threeHoursAgo)).toBe('3 hours ago');
  });

  it('returns "1 day ago" for exactly one day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const oneDayAgo = new Date(NOW.getTime() - 25 * 60 * 60 * 1000).toISOString();
    expect(multiFormatDateString(oneDayAgo)).toBe('1 day ago');
  });

  it('falls back to an absolute date after 30 days', () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const overThirtyDaysAgo = new Date(NOW.getTime() - 35 * 24 * 60 * 60 * 1000).toISOString();
    const result = multiFormatDateString(overThirtyDaysAgo);
    expect(result).not.toContain('ago');
    expect(result).toContain('at');
  });
});
