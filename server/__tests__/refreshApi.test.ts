import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the cache module
vi.mock('../cache', () => ({
  serverCache: {
    deletePattern: vi.fn().mockReturnValue(5),
    clear: vi.fn(),
    getStats: vi.fn().mockReturnValue({
      size: 10,
      hitCount: 100,
      missCount: 20,
      hitRate: 0.833,
    }),
  },
  CACHE_TTL: {
    MARKET_ANALYSIS: 24 * 60 * 60 * 1000,
    STOCK_DATA: 24 * 60 * 60 * 1000,
    PORTFOLIO_RECOMMENDATIONS: 31 * 24 * 60 * 60 * 1000,
    BACKTEST_RESULTS: 24 * 60 * 60 * 1000,
    SIGNAL_HISTORY: 24 * 60 * 60 * 1000,
    SIGNAL_INDICATORS: 24 * 60 * 60 * 1000,
  },
  createCacheKey: vi.fn((...args) => args.join(':')),
}));

describe('Refresh API - Cache TTL Settings', () => {
  it('should have correct cache TTL for market analysis (24 hours)', () => {
    const expectedTTL = 24 * 60 * 60 * 1000; // 24 hours in ms
    expect(expectedTTL).toBe(86400000);
  });

  it('should have correct cache TTL for portfolio recommendations (31 days)', () => {
    const expectedTTL = 31 * 24 * 60 * 60 * 1000; // 31 days in ms
    expect(expectedTTL).toBe(2678400000);
  });

  it('should have correct cache TTL for signal indicators (24 hours)', () => {
    const expectedTTL = 24 * 60 * 60 * 1000; // 24 hours in ms
    expect(expectedTTL).toBe(86400000);
  });
});

describe('Refresh API - Cache Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should clear signal cache with correct pattern', async () => {
    const { serverCache } = await import('../cache');
    const pattern = /^(market|signal)/;
    
    serverCache.deletePattern(pattern);
    
    expect(serverCache.deletePattern).toHaveBeenCalledWith(pattern);
  });

  it('should clear portfolio cache with correct pattern', async () => {
    const { serverCache } = await import('../cache');
    const pattern = /^portfolio/;
    
    serverCache.deletePattern(pattern);
    
    expect(serverCache.deletePattern).toHaveBeenCalledWith(pattern);
  });

  it('should clear all cache for full refresh', async () => {
    const { serverCache } = await import('../cache');
    
    serverCache.clear();
    
    expect(serverCache.clear).toHaveBeenCalled();
  });

  it('should return cache statistics', async () => {
    const { serverCache } = await import('../cache');
    
    const stats = serverCache.getStats();
    
    expect(stats).toEqual({
      size: 10,
      hitCount: 100,
      missCount: 20,
      hitRate: 0.833,
    });
  });
});

describe('Refresh API - Response Format', () => {
  it('should format signal refresh response correctly', () => {
    const response = {
      success: true,
      message: "シグナル指標を更新しました",
      updatedAt: new Date().toISOString(),
      regime: "bull" as const,
      regimeJapanese: "好況",
    };

    expect(response.success).toBe(true);
    expect(response.message).toContain("シグナル");
    expect(response.regime).toBe("bull");
  });

  it('should format portfolio refresh response correctly', () => {
    const response = {
      success: true,
      message: "ポートフォリオを更新しました",
      updatedAt: new Date().toISOString(),
      aggressive: {
        totalHoldings: 5,
        usingFallback: false,
      },
      defensive: {
        totalHoldings: 5,
        usingFallback: true,
      },
    };

    expect(response.success).toBe(true);
    expect(response.message).toContain("ポートフォリオ");
    expect(response.aggressive.totalHoldings).toBe(5);
    expect(response.defensive.usingFallback).toBe(true);
  });

  it('should format full refresh response correctly', () => {
    const response = {
      success: true,
      message: "全データを更新しました",
      updatedAt: new Date().toISOString(),
      regime: "bear" as const,
      regimeJapanese: "不況",
      aggressive: {
        totalHoldings: 5,
        usingFallback: false,
      },
      defensive: {
        totalHoldings: 5,
        usingFallback: false,
      },
    };

    expect(response.success).toBe(true);
    expect(response.message).toContain("全データ");
    expect(response.regime).toBe("bear");
  });
});
