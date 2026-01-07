/**
 * Portfolio Selection Service
 * Implements aggressive (momentum) and defensive (low-volatility) stock selection
 */

import {
  fetchStockChart,
  calculateMomentum,
  calculateVolatility,
  SP500_TOP_SYMBOLS,
  DEFENSIVE_ETFS,
  StockData,
} from "./marketData";

export interface PortfolioHolding {
  symbol: string;
  name: string;
  weight: number;
  momentum?: number;
  volatility?: number;
  category?: string;
}

export interface PortfolioSelection {
  type: "aggressive" | "defensive";
  holdings: PortfolioHolding[];
  totalHoldings: number;
  calculatedAt: Date;
}

/**
 * Select aggressive portfolio holdings based on momentum
 * Uses 6-month momentum ranking with risk-inverse weighting
 */
export async function selectAggressivePortfolio(
  regime: "bull" | "bear" | "neutral",
  maxSymbols: number = 50
): Promise<PortfolioSelection> {
  // Determine number of holdings based on regime
  let targetHoldings: number;
  switch (regime) {
    case "bull":
      targetHoldings = 25;
      break;
    case "bear":
      targetHoldings = 5;
      break;
    case "neutral":
    default:
      targetHoldings = 10;
  }

  // Fetch data for S&P 500 stocks (limited for performance)
  const symbolsToFetch = SP500_TOP_SYMBOLS.slice(0, maxSymbols);
  const stockDataPromises = symbolsToFetch.map(symbol => 
    fetchStockChart(symbol, "6mo", "1d")
  );

  const stockDataResults = await Promise.all(stockDataPromises);
  
  // Calculate momentum and volatility for each stock
  const stockMetrics: {
    symbol: string;
    name: string;
    momentum: number;
    volatility: number;
  }[] = [];

  for (const data of stockDataResults) {
    if (data && data.prices.length >= 20) {
      const momentum = calculateMomentum(data.prices);
      const volatility = calculateVolatility(data.prices);
      
      if (volatility > 0) {
        stockMetrics.push({
          symbol: data.symbol,
          name: data.name || data.symbol,
          momentum,
          volatility,
        });
      }
    }
  }

  // Sort by momentum (descending) and select top N
  stockMetrics.sort((a, b) => b.momentum - a.momentum);
  const selectedStocks = stockMetrics.slice(0, targetHoldings);

  // Calculate risk-inverse weights
  const totalInverseVol = selectedStocks.reduce(
    (sum, s) => sum + (1 / s.volatility),
    0
  );

  const holdings: PortfolioHolding[] = selectedStocks.map(stock => ({
    symbol: stock.symbol,
    name: stock.name,
    weight: ((1 / stock.volatility) / totalInverseVol) * 100,
    momentum: stock.momentum,
    volatility: stock.volatility,
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

  // Calculate volatility for each ETF
  const etfMetrics: {
    symbol: string;
    name: string;
    category: string;
    volatility: number;
  }[] = [];

  for (let i = 0; i < etfDataResults.length; i++) {
    const data = etfDataResults[i];
    const etfInfo = DEFENSIVE_ETFS[i];
    
    if (data && data.prices.length >= 20) {
      const volatility = calculateVolatility(data.prices);
      
      if (volatility > 0) {
        etfMetrics.push({
          symbol: etfInfo.symbol,
          name: etfInfo.name,
          category: etfInfo.category,
          volatility,
        });
      }
    }
  }

  // Sort by volatility (ascending) and select bottom N
  etfMetrics.sort((a, b) => a.volatility - b.volatility);
  const selectedETFs = etfMetrics.slice(0, targetHoldings);

  // Equal weight allocation
  const equalWeight = 100 / selectedETFs.length;

  const holdings: PortfolioHolding[] = selectedETFs.map(etf => ({
    symbol: etf.symbol,
    name: etf.name,
    weight: equalWeight,
    volatility: etf.volatility,
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
  regime: "bull" | "bear" | "neutral"
): Promise<{
  aggressive: PortfolioSelection;
  defensive: PortfolioSelection;
}> {
  const [aggressive, defensive] = await Promise.all([
    selectAggressivePortfolio(regime),
    selectDefensivePortfolio(regime),
  ]);

  return { aggressive, defensive };
}
