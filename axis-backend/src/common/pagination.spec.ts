import {
  clampPage,
  clampPageSize,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from './pagination';

describe('clampPageSize', () => {
  it('returns the default when value is missing', () => {
    expect(clampPageSize(undefined)).toBe(DEFAULT_PAGE_SIZE);
    expect(clampPageSize(null)).toBe(DEFAULT_PAGE_SIZE);
  });

  it('caps an oversized request at the hard ceiling', () => {
    expect(clampPageSize(10_000_000)).toBe(MAX_PAGE_SIZE);
    expect(clampPageSize(101)).toBe(MAX_PAGE_SIZE);
  });

  it('passes through a valid in-range request', () => {
    expect(clampPageSize(20)).toBe(20);
    expect(clampPageSize(100)).toBe(100);
  });

  it('floors fractional requests', () => {
    expect(clampPageSize(20.9)).toBe(20);
  });

  it('falls back to the default for zero or negative values', () => {
    expect(clampPageSize(0)).toBe(DEFAULT_PAGE_SIZE);
    expect(clampPageSize(-5)).toBe(DEFAULT_PAGE_SIZE);
  });

  it('ignores non-finite values', () => {
    expect(clampPageSize(NaN)).toBe(DEFAULT_PAGE_SIZE);
    expect(clampPageSize(Infinity)).toBe(DEFAULT_PAGE_SIZE);
  });

  it('honours custom default and max', () => {
    expect(clampPageSize(undefined, 50, 200)).toBe(50);
    expect(clampPageSize(500, 50, 200)).toBe(200);
    expect(clampPageSize(150, 50, 200)).toBe(150);
  });

  it('never exceeds max even when default is larger', () => {
    expect(clampPageSize(undefined, 999, 100)).toBe(100);
  });
});

describe('clampPage', () => {
  it('defaults to 1 for missing or invalid input', () => {
    expect(clampPage(undefined)).toBe(1);
    expect(clampPage(null)).toBe(1);
    expect(clampPage(0)).toBe(1);
    expect(clampPage(-3)).toBe(1);
    expect(clampPage(NaN)).toBe(1);
  });

  it('passes through and floors valid page numbers', () => {
    expect(clampPage(1)).toBe(1);
    expect(clampPage(7)).toBe(7);
    expect(clampPage(3.9)).toBe(3);
  });
});
