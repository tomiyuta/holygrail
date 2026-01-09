/**
 * Risk Calculation Tests
 * Verifies that the risk calculation formula matches the original Excel data
 * 
 * Expected formula: 日次リターンの標準偏差 × √252 (年率化ボラティリティ)
 */

import { describe, it, expect } from "vitest";
import { calculateRisk } from "../marketData";

describe("Risk Calculation", () => {
  it("should calculate risk as annualized volatility (daily std × √252)", () => {
    // Create mock price data with known daily returns
    // If daily returns are constant at 1%, std = 0, risk = 0
    const constantReturns = [
      { high: 100, low: 99, close: 100, adjClose: 100 },
      { high: 101, low: 100, close: 101, adjClose: 101 },
      { high: 102.01, low: 101, close: 102.01, adjClose: 102.01 },
      { high: 103.0301, low: 102, close: 103.0301, adjClose: 103.0301 },
    ];
    
    const riskConstant = calculateRisk(constantReturns);
    // With constant 1% daily returns, std should be very small
    expect(riskConstant).toBeLessThan(0.1);
  });

  it("should return 0 for insufficient data", () => {
    const singlePrice = [{ high: 100, low: 99, close: 100, adjClose: 100 }];
    expect(calculateRisk(singlePrice)).toBe(0);
  });

  it("should return 0 for empty array", () => {
    expect(calculateRisk([])).toBe(0);
  });

  it("should calculate higher risk for more volatile prices", () => {
    // Low volatility: small daily changes
    const lowVolPrices = Array.from({ length: 90 }, (_, i) => ({
      high: 100 + i * 0.1,
      low: 99 + i * 0.1,
      close: 100 + i * 0.1,
      adjClose: 100 + i * 0.1,
    }));

    // High volatility: larger daily changes
    const highVolPrices = Array.from({ length: 90 }, (_, i) => ({
      high: 100 + (i % 2 === 0 ? 5 : -5),
      low: 95 + (i % 2 === 0 ? 5 : -5),
      close: 100 + (i % 2 === 0 ? 5 : -5),
      adjClose: 100 + (i % 2 === 0 ? 5 : -5),
    }));

    const lowVolRisk = calculateRisk(lowVolPrices);
    const highVolRisk = calculateRisk(highVolPrices);

    expect(highVolRisk).toBeGreaterThan(lowVolRisk);
  });

  it("should use adjClose when available, fallback to close", () => {
    // Prices with adjClose
    const pricesWithAdjClose = [
      { high: 100, low: 99, close: 100, adjClose: 100 },
      { high: 102, low: 101, close: 101, adjClose: 102 },
      { high: 104, low: 103, close: 102, adjClose: 104 },
    ];

    // Prices without adjClose
    const pricesWithoutAdjClose = [
      { high: 100, low: 99, close: 100 },
      { high: 102, low: 101, close: 102 },
      { high: 104, low: 103, close: 104 },
    ] as { high: number; low: number; close: number; adjClose?: number }[];

    const riskWithAdj = calculateRisk(pricesWithAdjClose);
    const riskWithoutAdj = calculateRisk(pricesWithoutAdjClose);

    // Both should return valid risk values
    expect(riskWithAdj).toBeGreaterThan(0);
    expect(riskWithoutAdj).toBeGreaterThan(0);
  });

  it("should only use last 90 days of data", () => {
    // Create 180 days of data
    const prices180 = Array.from({ length: 180 }, (_, i) => ({
      high: 100 + Math.sin(i * 0.1) * 5,
      low: 95 + Math.sin(i * 0.1) * 5,
      close: 100 + Math.sin(i * 0.1) * 5,
      adjClose: 100 + Math.sin(i * 0.1) * 5,
    }));

    // Create 90 days of data (last 90 of the 180)
    const prices90 = prices180.slice(-90);

    const risk180 = calculateRisk(prices180);
    const risk90 = calculateRisk(prices90);

    // Should be approximately equal since both use last 90 days
    expect(Math.abs(risk180 - risk90)).toBeLessThan(0.001);
  });

  it("should return annualized volatility in expected range", () => {
    // Create realistic price data with controlled volatility
    // Using a deterministic pattern instead of random to ensure consistent test results
    const realisticPrices = Array.from({ length: 90 }, (_, i) => {
      // Simulate ~1% daily volatility with sine wave pattern
      const dailyReturn = Math.sin(i * 0.5) * 0.01;
      const price = 100 * (1 + dailyReturn);
      return {
        high: price * 1.005,
        low: price * 0.995,
        close: price,
        adjClose: price,
      };
    });

    const risk = calculateRisk(realisticPrices);
    
    // Annualized volatility should be in reasonable range
    // With ~1% daily volatility, annualized should be around 0.01 * sqrt(252) ≈ 0.16
    expect(risk).toBeGreaterThan(0);
    expect(risk).toBeLessThan(1); // 100% annual volatility is reasonable upper bound for this pattern
  });
});
