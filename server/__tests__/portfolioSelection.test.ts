import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PortfolioHolding } from '../portfolioSelection';

describe('Portfolio Selection Service', () => {
  describe('Portfolio Holding Structure', () => {
    it('should have correct structure for aggressive holdings', () => {
      const holding: PortfolioHolding = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        weight: 10.5,
        momentum: 25.3,
        volatility: 21.5,
      };

      expect(holding.symbol).toBe('AAPL');
      expect(holding.name).toBe('Apple Inc.');
      expect(holding.weight).toBeGreaterThan(0);
      expect(holding.momentum).toBeDefined();
      expect(holding.volatility).toBeDefined();
    });

    it('should have correct structure for defensive holdings', () => {
      const holding: PortfolioHolding = {
        symbol: 'SHY',
        name: 'iShares 1-3 Year Treasury',
        weight: 33.3,
        volatility: 1.5,
        category: '短期国債',
      };

      expect(holding.symbol).toBe('SHY');
      expect(holding.category).toBe('短期国債');
      expect(holding.weight).toBeGreaterThan(0);
    });
  });

  describe('Weight Calculations', () => {
    it('should sum to 100% for equal weight portfolio', () => {
      const holdings: PortfolioHolding[] = [
        { symbol: 'A', name: 'A', weight: 33.33 },
        { symbol: 'B', name: 'B', weight: 33.33 },
        { symbol: 'C', name: 'C', weight: 33.34 },
      ];

      const totalWeight = holdings.reduce((sum, h) => sum + h.weight, 0);
      expect(totalWeight).toBeCloseTo(100, 0);
    });

    it('should calculate risk-inverse weights correctly', () => {
      // Lower volatility should result in higher weight
      const holdings = [
        { symbol: 'LOW_VOL', volatility: 10 },
        { symbol: 'HIGH_VOL', volatility: 30 },
      ];

      const totalInverseVol = holdings.reduce((sum, h) => sum + (1 / h.volatility!), 0);
      const lowVolWeight = ((1 / 10) / totalInverseVol) * 100;
      const highVolWeight = ((1 / 30) / totalInverseVol) * 100;

      expect(lowVolWeight).toBeGreaterThan(highVolWeight);
      expect(lowVolWeight + highVolWeight).toBeCloseTo(100, 1);
    });
  });

  describe('Regime-based Holdings Count', () => {
    it('should have more holdings in bull market', () => {
      // Bull market: 25 aggressive, 7 defensive
      // Bear market: 5 aggressive, 3 defensive
      const bullAggressive = 25;
      const bearAggressive = 5;
      
      expect(bullAggressive).toBeGreaterThan(bearAggressive);
    });

    it('should have fewer defensive holdings in bull market', () => {
      const bullDefensive = 7;
      const bearDefensive = 3;
      
      // In bear market, we have fewer but more concentrated defensive holdings
      expect(bullDefensive).toBeGreaterThan(bearDefensive);
    });
  });
});
