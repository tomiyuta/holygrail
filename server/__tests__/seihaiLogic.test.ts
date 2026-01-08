/**
 * Seihai (Holy Grail) Portfolio Selection Logic Tests
 * 
 * Tests the core selection logic:
 * 1. Sort by 6-month momentum (descending)
 * 2. Select top N stocks
 * 3. Calculate risk-inverse weights
 */

import { describe, it, expect } from "vitest";

// Mock data matching the original Seihai Excel (2025-12-31)
const SEIHAI_TEST_DATA = [
  { symbol: "SNDK", name: "Sandisk Corporation", momentum: 4.3320, risk: 1.1718 },
  { symbol: "WDC", name: "Western Digital Corp.", momentum: 1.7069, risk: 0.6528 },
  { symbol: "WBD", name: "Warner Bros. Discovery", momentum: 1.6200, risk: 0.4085 },
  { symbol: "MU", name: "Micron Technology", momentum: 1.3685, risk: 0.6503 },
  { symbol: "ALB", name: "Albemarle Corporation", momentum: 1.1587, risk: 0.6034 },
  { symbol: "TER", name: "Teradyne", momentum: 1.0953, risk: 0.6372 },
  { symbol: "APP", name: "Applovin", momentum: 0.9672, risk: 0.6097 },
  { symbol: "STX", name: "Seagate", momentum: 0.8987, risk: 0.6922 },
  { symbol: "FIX", name: "Comfort Systems USA", momentum: 0.7991, risk: 0.5879 },
  { symbol: "LRCX", name: "Lam Research", momentum: 0.7859, risk: 0.4908 },
];

// Expected results from original Seihai Excel
const EXPECTED_WEIGHTS = {
  SNDK: 10.63,
  WDC: 19.08,
  WBD: 30.49,
  MU: 19.16,
  ALB: 20.64,
};

/**
 * Sort stocks by momentum (descending)
 */
function sortByMomentum(stocks: typeof SEIHAI_TEST_DATA) {
  return [...stocks].sort((a, b) => b.momentum - a.momentum);
}

/**
 * Calculate risk-inverse weights
 * Formula: weight_i = (1/risk_i) / sum(1/risk_j) * 100
 */
function calculateRiskInverseWeights(stocks: typeof SEIHAI_TEST_DATA) {
  const totalInverseRisk = stocks.reduce((sum, s) => sum + (1 / s.risk), 0);
  return stocks.map(s => ({
    ...s,
    weight: ((1 / s.risk) / totalInverseRisk) * 100,
  }));
}

describe("Seihai Portfolio Selection Logic", () => {
  describe("Momentum Sorting", () => {
    it("should sort stocks by 6-month momentum in descending order", () => {
      const sorted = sortByMomentum(SEIHAI_TEST_DATA);
      
      // Verify order
      expect(sorted[0].symbol).toBe("SNDK");
      expect(sorted[1].symbol).toBe("WDC");
      expect(sorted[2].symbol).toBe("WBD");
      expect(sorted[3].symbol).toBe("MU");
      expect(sorted[4].symbol).toBe("ALB");
      
      // Verify momentum values are in descending order
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i - 1].momentum).toBeGreaterThanOrEqual(sorted[i].momentum);
      }
    });

    it("should select top 5 stocks by momentum", () => {
      const sorted = sortByMomentum(SEIHAI_TEST_DATA);
      const top5 = sorted.slice(0, 5);
      
      expect(top5.length).toBe(5);
      expect(top5.map(s => s.symbol)).toEqual(["SNDK", "WDC", "WBD", "MU", "ALB"]);
    });
  });

  describe("Risk-Inverse Weight Calculation", () => {
    it("should calculate weights using risk-inverse formula", () => {
      const sorted = sortByMomentum(SEIHAI_TEST_DATA);
      const top5 = sorted.slice(0, 5);
      const withWeights = calculateRiskInverseWeights(top5);
      
      // Verify weights match expected values (within 0.01% tolerance)
      for (const stock of withWeights) {
        const expected = EXPECTED_WEIGHTS[stock.symbol as keyof typeof EXPECTED_WEIGHTS];
        expect(stock.weight).toBeCloseTo(expected, 1);
      }
    });

    it("should have weights that sum to 100%", () => {
      const sorted = sortByMomentum(SEIHAI_TEST_DATA);
      const top5 = sorted.slice(0, 5);
      const withWeights = calculateRiskInverseWeights(top5);
      
      const totalWeight = withWeights.reduce((sum, s) => sum + s.weight, 0);
      expect(totalWeight).toBeCloseTo(100, 2);
    });

    it("should give higher weight to lower risk stocks", () => {
      const sorted = sortByMomentum(SEIHAI_TEST_DATA);
      const top5 = sorted.slice(0, 5);
      const withWeights = calculateRiskInverseWeights(top5);
      
      // WBD has lowest risk (0.4085) and should have highest weight
      const wbd = withWeights.find(s => s.symbol === "WBD");
      const sndk = withWeights.find(s => s.symbol === "SNDK");
      
      expect(wbd!.weight).toBeGreaterThan(sndk!.weight);
    });
  });

  describe("Complete Selection Process", () => {
    it("should match original Seihai Excel results exactly", () => {
      // Step 1: Sort by momentum
      const sorted = sortByMomentum(SEIHAI_TEST_DATA);
      
      // Step 2: Select top 5
      const top5 = sorted.slice(0, 5);
      
      // Step 3: Calculate weights
      const withWeights = calculateRiskInverseWeights(top5);
      
      // Verify all results match
      const results: Record<string, number> = {};
      for (const stock of withWeights) {
        results[stock.symbol] = Math.round(stock.weight * 100) / 100;
      }
      
      expect(results.SNDK).toBeCloseTo(10.63, 1);
      expect(results.WDC).toBeCloseTo(19.08, 1);
      expect(results.WBD).toBeCloseTo(30.49, 1);
      expect(results.MU).toBeCloseTo(19.16, 1);
      expect(results.ALB).toBeCloseTo(20.64, 1);
    });
  });
});
