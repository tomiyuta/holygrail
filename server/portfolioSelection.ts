/**
 * Portfolio Selection Service
 * Implements the original Seihai (Holy Grail) portfolio selection logic
 * 
 * Selection Logic:
 * 1. Sort stocks by 6-month momentum (descending)
 * 2. Select top N stocks based on regime
 * 3. Calculate weights using risk-inverse weighting (1/risk)
 */

import {
  fetchStockChart,
  calculateMomentum,
  calculateRisk,
  SEIHAI_SYMBOLS,
  DEFENSIVE_ETFS,
} from "./marketData";

export interface PortfolioHolding {
  symbol: string;
  name: string;
  weight: number;
  momentum?: number;
  volatility?: number;  // This is actually "risk" in Seihai terminology
  category?: string;
}

export interface PortfolioSelection {
  type: "aggressive" | "defensive";
  holdings: PortfolioHolding[];
  totalHoldings: number;
  calculatedAt: Date;
}

/**
 * Select aggressive portfolio holdings based on Seihai methodology
 * 
 * Original Seihai Logic:
 * 1. Calculate 6-month momentum for all stocks in universe
 * 2. Sort by momentum (descending)
 * 3. Select top N stocks (N = 分散数, typically 5)
 * 4. Calculate risk-inverse weights: weight_i = (1/risk_i) / sum(1/risk_j)
 */
export async function selectAggressivePortfolio(
  regime: "bull" | "bear" | "neutral",
  maxSymbols: number = 100,  // Increased to cover more of the Seihai universe
  customDiversificationCount?: number  // User-specified diversification count (3-10)
): Promise<PortfolioSelection> {
  // Use custom diversification count if provided, otherwise use regime-based default
  let targetHoldings: number;
  if (customDiversificationCount !== undefined) {
    // Clamp to valid range (3-10)
    targetHoldings = Math.max(3, Math.min(10, customDiversificationCount));
  } else {
    // Original Seihai uses 5 stocks as default
    switch (regime) {
      case "bull":
        targetHoldings = 5;  // Match original Seihai default
        break;
      case "bear":
        targetHoldings = 3;
        break;
      case "neutral":
      default:
        targetHoldings = 5;
    }
  }

  // Fetch data for Seihai universe stocks
  const symbolsToFetch = SEIHAI_SYMBOLS.slice(0, maxSymbols);
  const stockDataPromises = symbolsToFetch.map(symbol => 
    fetchStockChart(symbol, "6mo", "1d")
  );

  const stockDataResults = await Promise.all(stockDataPromises);
  
  // Calculate momentum and risk for each stock
  const stockMetrics: {
    symbol: string;
    name: string;
    momentum: number;  // 6-month return as decimal
    risk: number;      // MaxRangePct-based risk
  }[] = [];

  for (const data of stockDataResults) {
    if (data && data.prices.length >= 20) {
      const momentum = calculateMomentum(data.prices);
      const risk = calculateRisk(data.prices);
      
      // Only include stocks with valid risk (avoid division by zero)
      if (risk > 0) {
        stockMetrics.push({
          symbol: data.symbol,
          name: data.name || data.symbol,
          momentum,
          risk,
        });
      }
    }
  }

  // Sort by momentum (descending) - this is the key Seihai logic
  stockMetrics.sort((a, b) => b.momentum - a.momentum);
  
  // Select top N stocks
  const selectedStocks = stockMetrics.slice(0, targetHoldings);

  // Calculate risk-inverse weights (original Seihai formula)
  // weight_i = (1/risk_i) / sum(1/risk_j) * 100
  const totalInverseRisk = selectedStocks.reduce(
    (sum, s) => sum + (1 / s.risk),
    0
  );

  const holdings: PortfolioHolding[] = selectedStocks.map(stock => ({
    symbol: stock.symbol,
    name: stock.name,
    weight: ((1 / stock.risk) / totalInverseRisk) * 100,
    momentum: stock.momentum * 100,  // Convert to percentage for display
    volatility: stock.risk,  // Store risk as volatility for display
  }));

  // Sort by weight descending for display
  holdings.sort((a, b) => b.weight - a.weight);

  return {
    type: "aggressive",
    holdings,
    totalHoldings: holdings.length,
    calculatedAt: new Date(),
  };
}

/**
 * Select defensive portfolio holdings based on low volatility
 * Uses volatility ranking with equal weighting
 */
export async function selectDefensivePortfolio(
  regime: "bull" | "bear" | "neutral"
): Promise<PortfolioSelection> {
  // Determine number of holdings based on regime
  let targetHoldings: number;
  switch (regime) {
    case "bull":
      targetHoldings = 7;
      break;
    case "bear":
      targetHoldings = 3;
      break;
    case "neutral":
    default:
      targetHoldings = 5;
  }

  // Fetch data for defensive ETFs
  const etfDataPromises = DEFENSIVE_ETFS.map(etf =>
    fetchStockChart(etf.symbol, "6mo", "1d")
  );

  const etfDataResults = await Promise.all(etfDataPromises);

  // Calculate risk for each ETF
  const etfMetrics: {
    symbol: string;
    name: string;
    category: string;
    risk: number;
  }[] = [];

  for (let i = 0; i < etfDataResults.length; i++) {
    const data = etfDataResults[i];
    const etfInfo = DEFENSIVE_ETFS[i];
    
    if (data && data.prices.length >= 20) {
      const risk = calculateRisk(data.prices);
      
      if (risk > 0) {
        etfMetrics.push({
          symbol: etfInfo.symbol,
          name: etfInfo.name,
          category: etfInfo.category,
          risk,
        });
      }
    }
  }

  // Sort by risk (ascending) and select lowest N
  etfMetrics.sort((a, b) => a.risk - b.risk);
  const selectedETFs = etfMetrics.slice(0, targetHoldings);

  // Equal weight allocation for defensive portfolio
  const equalWeight = 100 / selectedETFs.length;

  const holdings: PortfolioHolding[] = selectedETFs.map(etf => ({
    symbol: etf.symbol,
    name: etf.name,
    weight: equalWeight,
    volatility: etf.risk,
    category: etf.category,
  }));

  return {
    type: "defensive",
    holdings,
    totalHoldings: holdings.length,
    calculatedAt: new Date(),
  };
}

/**
 * Get complete portfolio recommendations for both strategies
 */
export async function getPortfolioRecommendations(
  regime: "bull" | "bear" | "neutral",
  diversificationCount?: number  // Optional user-specified diversification count
): Promise<{
  aggressive: PortfolioSelection;
  defensive: PortfolioSelection;
}> {
  const [aggressive, defensive] = await Promise.all([
    selectAggressivePortfolio(regime, 100, diversificationCount),
    selectDefensivePortfolio(regime),
  ]);

  return { aggressive, defensive };
}
