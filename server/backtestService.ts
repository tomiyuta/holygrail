/**
 * Backtest Service
 * Provides historical portfolio selection based on past data
 * and allows simulation with different diversification settings
 */

import backtestData from "./backtestData.json";

export interface BacktestStock {
  symbol: string;
  name: string;
  momentum: number;
  risk: number;
  price: number;
  rank: number;
}

export interface BacktestResult {
  date: string;
  holdings: {
    symbol: string;
    name: string;
    weight: number;
    momentum: number;
    risk: number;
    price: number;
  }[];
  totalHoldings: number;
  diversificationCount: number;
}

// Type assertion for imported JSON
const historicalData = backtestData as Record<string, BacktestStock[]>;

/**
 * Get available backtest dates
 */
export function getAvailableDates(): string[] {
  return Object.keys(historicalData).sort();
}

/**
 * Run backtest for a specific date with given diversification count
 * 
 * @param date - Target date in YYYY-MM-DD format
 * @param diversificationCount - Number of stocks to select (3-10)
 */
export function runBacktest(
  date: string,
  diversificationCount: number = 5
): BacktestResult | null {
  // Validate diversification count
  const count = Math.max(3, Math.min(10, diversificationCount));
  
  // Get data for the specified date
  const stocks = historicalData[date];
  if (!stocks || stocks.length === 0) {
    return null;
  }

  // Sort by momentum (descending) - should already be sorted, but ensure
  const sortedStocks = [...stocks].sort((a, b) => b.momentum - a.momentum);

  // Select top N stocks
  const selectedStocks = sortedStocks.slice(0, count);

  // Calculate risk-inverse weights
  const totalInverseRisk = selectedStocks.reduce(
    (sum, s) => sum + (1 / s.risk),
    0
  );

  const holdings = selectedStocks.map(stock => ({
    symbol: stock.symbol,
    name: stock.name,
    weight: ((1 / stock.risk) / totalInverseRisk) * 100,
    momentum: stock.momentum * 100, // Convert to percentage
    risk: stock.risk,
    price: stock.price,
  }));

  // Sort by weight descending for display
  holdings.sort((a, b) => b.weight - a.weight);

  return {
    date,
    holdings,
    totalHoldings: holdings.length,
    diversificationCount: count,
  };
}

/**
 * Get all available stocks for a specific date
 */
export function getStocksForDate(date: string): BacktestStock[] | null {
  return historicalData[date] || null;
}

/**
 * Generate sample backtest data for demonstration
 * This creates synthetic historical data based on the current data
 */
export function generateSampleBacktestData(): Record<string, BacktestStock[]> {
  const baseDate = "2025-12-31";
  const baseStocks = historicalData[baseDate];
  
  if (!baseStocks) {
    return {};
  }

  const sampleData: Record<string, BacktestStock[]> = {};
  
  // Generate data for past 12 months
  const months = [
    "2025-01-31", "2025-02-28", "2025-03-31", "2025-04-30",
    "2025-05-31", "2025-06-30", "2025-07-31", "2025-08-31",
    "2025-09-30", "2025-10-31", "2025-11-30", "2025-12-31"
  ];

  for (const month of months) {
    // Create variation of base data
    const monthStocks = baseStocks.map((stock, idx) => {
      // Add some random variation to momentum and risk
      const monthIndex = months.indexOf(month);
      const variation = 1 + (Math.sin(monthIndex * 0.5 + idx * 0.1) * 0.3);
      
      return {
        ...stock,
        momentum: stock.momentum * variation,
        risk: stock.risk * (0.8 + Math.random() * 0.4),
        price: stock.price * variation,
      };
    });

    // Re-sort by momentum and update ranks
    monthStocks.sort((a, b) => b.momentum - a.momentum);
    monthStocks.forEach((stock, idx) => {
      stock.rank = idx + 1;
    });

    sampleData[month] = monthStocks;
  }

  return sampleData;
}
