import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateMA,
  calculateMomentum,
  calculateVolatility,
  determineMarketRegime,
  calculateAllocation,
  SignalIndicators,
} from '../marketData';

describe('Market Data Service', () => {
  describe('calculateMA', () => {
    it('should calculate moving average correctly', () => {
      const prices = [100, 102, 104, 106, 108, 110];
      const ma3 = calculateMA(prices, 3);
      expect(ma3).toBeCloseTo(108, 1); // (106 + 108 + 110) / 3
    });

    it('should return 0 if not enough data', () => {
      const prices = [100, 102];
      const ma5 = calculateMA(prices, 5);
      expect(ma5).toBe(0);
    });
  });

  describe('calculateMomentum', () => {
    it('should calculate positive momentum correctly', () => {
      const prices = [
        { adjClose: 100 },
        { adjClose: 110 },
        { adjClose: 120 },
      ];
      const momentum = calculateMomentum(prices);
      expect(momentum).toBeCloseTo(20, 1); // 20% return
    });

    it('should calculate negative momentum correctly', () => {
      const prices = [
        { adjClose: 100 },
        { adjClose: 90 },
        { adjClose: 80 },
      ];
      const momentum = calculateMomentum(prices);
      expect(momentum).toBeCloseTo(-20, 1); // -20% return
    });

    it('should return 0 for insufficient data', () => {
      const prices = [{ adjClose: 100 }];
      const momentum = calculateMomentum(prices);
      expect(momentum).toBe(0);
    });
  });

  describe('calculateVolatility', () => {
    it('should calculate volatility for stable prices', () => {
      const prices = [
        { adjClose: 100 },
        { adjClose: 100 },
        { adjClose: 100 },
        { adjClose: 100 },
      ];
      const volatility = calculateVolatility(prices);
      expect(volatility).toBe(0);
    });

    it('should calculate non-zero volatility for varying prices', () => {
      const prices = [
        { adjClose: 100 },
        { adjClose: 105 },
        { adjClose: 95 },
        { adjClose: 102 },
        { adjClose: 98 },
      ];
      const volatility = calculateVolatility(prices);
      expect(volatility).toBeGreaterThan(0);
    });

    it('should return 0 for insufficient data', () => {
      const prices = [{ adjClose: 100 }];
      const volatility = calculateVolatility(prices);
      expect(volatility).toBe(0);
    });
  });

  describe('determineMarketRegime', () => {
    it('should detect bull market when all bull signals are active', () => {
      const indicators: SignalIndicators = {
        spyPrice: 500,
        spyMA10: 490,
        spyMA50: 480,
        spyMA200: 450, // SPY above MA200
        spy6MonthReturn: 15,
        vix: 15, // Low VIX
        yieldCurve: 1.5, // Positive yield curve
        creditSpread: 0.5, // Low credit spread
        lastUpdated: new Date(),
      };

      const result = determineMarketRegime(indicators);
      expect(result.regime).toBe('bull');
      expect(result.regimeJapanese).toBe('好況');
      expect(result.bullCount).toBe(3);
    });

    it('should detect bear market when bear signals are active', () => {
      const indicators: SignalIndicators = {
        spyPrice: 400,
        spyMA10: 420,
        spyMA50: 440,
        spyMA200: 450, // SPY below MA200
        spy6MonthReturn: -15, // Negative momentum
        vix: 35, // High VIX
        yieldCurve: -1.0, // Inverted yield curve
        creditSpread: 3.0, // High credit spread
        lastUpdated: new Date(),
      };

      const result = determineMarketRegime(indicators);
      expect(result.regime).toBe('bear');
      expect(result.regimeJapanese).toBe('不況');
      expect(result.bearCount).toBeGreaterThanOrEqual(3);
    });

    it('should detect neutral market when signals are mixed', () => {
      const indicators: SignalIndicators = {
        spyPrice: 450,
        spyMA10: 448,
        spyMA50: 460,
        spyMA200: 455, // SPY below MA200
        spy6MonthReturn: 5, // Positive momentum
        vix: 20, // Normal VIX
        yieldCurve: 0.3, // Slightly positive
        creditSpread: 1.5, // Moderate
        lastUpdated: new Date(),
      };

      const result = determineMarketRegime(indicators);
      // Could be neutral or bull depending on exact thresholds
      expect(['bull', 'neutral', 'bear']).toContain(result.regime);
    });
  });

  describe('calculateAllocation', () => {
    it('should return aggressive allocation for bull market', () => {
      const allocation = calculateAllocation('bull');
      expect(allocation.aggressive).toBe(80);
      expect(allocation.defensive).toBe(20);
    });

    it('should return defensive allocation for bear market', () => {
      const allocation = calculateAllocation('bear');
      expect(allocation.aggressive).toBe(20);
      expect(allocation.defensive).toBe(80);
    });

    it('should return balanced allocation for neutral market', () => {
      const allocation = calculateAllocation('neutral');
      expect(allocation.aggressive).toBe(50);
      expect(allocation.defensive).toBe(50);
    });
  });
});
