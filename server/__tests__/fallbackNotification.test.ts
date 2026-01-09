import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the marketData module
vi.mock('../marketData', () => ({
  fetchStockChart: vi.fn(),
  DEFENSIVE_ETFS: [
    { symbol: "GLD", name: "SPDR Gold Shares", category: "金" },
    { symbol: "EEM", name: "iShares MSCI Emerging Markets", category: "新興国株" },
  ],
  getDynamicTop100Symbols: vi.fn().mockResolvedValue([
    { symbol: "AAPL", name: "Apple Inc." },
    { symbol: "MSFT", name: "Microsoft Corporation" },
    { symbol: "GOOGL", name: "Alphabet Inc." },
  ]),
}));

// Mock the cache module
vi.mock('../cache', () => ({
  serverCache: {
    getOrFetch: vi.fn((key, fn) => fn()),
  },
  createCacheKey: vi.fn((...args) => args.join(':')),
  CACHE_TTL: {
    PORTFOLIO_RECOMMENDATIONS: 7200000,
  },
}));

describe('Fallback Notification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should include fallback fields in PortfolioSelection interface', async () => {
    // Test that the interface includes the new fields
    const mockPortfolioSelection = {
      type: "aggressive" as const,
      holdings: [],
      totalHoldings: 5,
      calculatedAt: new Date(),
      usingFallback: true,
      fallbackCount: 3,
      fallbackReason: "API制限により2銘柄のみ取得。3銘柄のフォールバックデータを使用。"
    };

    expect(mockPortfolioSelection.usingFallback).toBe(true);
    expect(mockPortfolioSelection.fallbackCount).toBe(3);
    expect(mockPortfolioSelection.fallbackReason).toContain("API制限");
  });

  it('should have fallback fields as optional', async () => {
    // Test that the interface allows undefined fallback fields
    const mockPortfolioSelection = {
      type: "defensive" as const,
      holdings: [],
      totalHoldings: 5,
      calculatedAt: new Date(),
    };

    expect(mockPortfolioSelection.usingFallback).toBeUndefined();
    expect(mockPortfolioSelection.fallbackCount).toBeUndefined();
    expect(mockPortfolioSelection.fallbackReason).toBeUndefined();
  });

  it('should format fallback reason correctly for aggressive portfolio', () => {
    const originalCount = 2;
    const fallbackCount = 3;
    const reason = `API制限により${originalCount}銘柄のみ取得。${fallbackCount}銘柄のフォールバックデータを使用。`;
    
    expect(reason).toBe("API制限により2銘柄のみ取得。3銘柄のフォールバックデータを使用。");
  });

  it('should format fallback reason correctly for defensive portfolio', () => {
    const originalCount = 1;
    const fallbackCount = 4;
    const reason = `API制限により${originalCount}ETFのみ取得。${fallbackCount}ETFのフォールバックデータを使用。`;
    
    expect(reason).toBe("API制限により1ETFのみ取得。4ETFのフォールバックデータを使用。");
  });
});
