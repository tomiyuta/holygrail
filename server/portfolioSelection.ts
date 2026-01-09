/**
 * Portfolio Selection Service
 * Implements the original Seihai (Holy Grail) portfolio selection logic
 * 
 * Selection Logic:
 * - Aggressive: Sort stocks by 6-month momentum (descending), risk-inverse weighting
 * - Defensive: Sort ETFs by 6-month momentum (descending), risk-inverse weighting
 * 
 * キャッシュ統合済み - ポートフォリオ推奨結果をキャッシュ
 */

import {
  fetchStockChart,
  calculateMomentum,
  calculateRisk,
  SEIHAI_SYMBOLS,
  DEFENSIVE_ETFS,
  getDynamicTop100Symbols,
  SP500_ALL_SYMBOLS,
} from "./marketData";
import { serverCache, CACHE_TTL, createCacheKey } from "./cache";

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
 * Select aggressive portfolio holdings based on Seihai methodology (内部関数)
 * 
 * 動的選定モード:
 * 1. S&P500全銘柄（497銘柄）から6か月モメンタムを計算
 * 2. モメンタム上位100銘柄を動的に選定
 * 3. その中からさらに上位5銘柄を最終選定
 * 4. リスク逆数ウェイトで配分
 */
async function selectAggressivePortfolioInternal(
  regime: "bull" | "bear" | "neutral",
  maxSymbols: number = 100,
  customDiversificationCount?: number
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

  // 動的選定: S&P500全銘柄から6か月モメンタム上位100銘柄を取得
  const top100Symbols = await getDynamicTop100Symbols();
  
  // Fetch data for top 100 stocks
  const symbolsToFetch = top100Symbols.slice(0, maxSymbols);
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
 * Select aggressive portfolio holdings based on Seihai methodology (キャッシュ付き)
 */
export async function selectAggressivePortfolio(
  regime: "bull" | "bear" | "neutral",
  maxSymbols: number = 100,
  customDiversificationCount?: number
): Promise<PortfolioSelection> {
  const cacheKey = createCacheKey(
    "portfolio",
    "aggressive",
    regime,
    maxSymbols,
    customDiversificationCount
  );
  
  return serverCache.getOrFetch(
    cacheKey,
    () => selectAggressivePortfolioInternal(regime, maxSymbols, customDiversificationCount),
    CACHE_TTL.PORTFOLIO_RECOMMENDATIONS
  );
}

/**
 * Select defensive portfolio holdings based on Seihai methodology (内部関数)
 * 
 * 元の聖杯ロジック:
 * 1. 14種類のETFユニバースから選定
 * 2. 6か月モメンタム降順でソート
 * 3. 上位5銘柄を選定
 * 4. リスク逆数ウェイト配分（攻撃型と同じ）
 */
async function selectDefensivePortfolioInternal(
  regime: "bull" | "bear" | "neutral"
): Promise<PortfolioSelection> {
  // Original Seihai defensive uses 5 ETFs as default (Top5)
  const targetHoldings = 5;

  // Fetch data for defensive ETFs
  const etfDataPromises = DEFENSIVE_ETFS.map(etf =>
    fetchStockChart(etf.symbol, "6mo", "1d")
  );

  const etfDataResults = await Promise.all(etfDataPromises);

  // Calculate momentum and risk for each ETF
  const etfMetrics: {
    symbol: string;
    name: string;
    category: string;
    momentum: number;  // 6-month return as decimal
    risk: number;
  }[] = [];

  for (let i = 0; i < etfDataResults.length; i++) {
    const data = etfDataResults[i];
    const etfInfo = DEFENSIVE_ETFS[i];
    
    if (data && data.prices.length >= 20) {
      const momentum = calculateMomentum(data.prices);
      const risk = calculateRisk(data.prices);
      
      if (risk > 0) {
        etfMetrics.push({
          symbol: etfInfo.symbol,
          name: etfInfo.name,
          category: etfInfo.category,
          momentum,
          risk,
        });
      }
    }
  }

  // Sort by 6-month momentum (descending) - matching original Seihai logic
  etfMetrics.sort((a, b) => b.momentum - a.momentum);
  
  // Select top N ETFs
  const selectedETFs = etfMetrics.slice(0, targetHoldings);

  // Calculate risk-inverse weights (original Seihai formula - same as aggressive)
  // weight_i = (1/risk_i) / sum(1/risk_j) * 100
  const totalInverseRisk = selectedETFs.reduce(
    (sum, etf) => sum + (1 / etf.risk),
    0
  );

  const holdings: PortfolioHolding[] = selectedETFs.map(etf => ({
    symbol: etf.symbol,
    name: etf.name,
    weight: ((1 / etf.risk) / totalInverseRisk) * 100,
    momentum: etf.momentum * 100,  // Convert to percentage for display
    volatility: etf.risk,
    category: etf.category,
  }));

  // Sort by weight descending for display
  holdings.sort((a, b) => b.weight - a.weight);

  return {
    type: "defensive",
    holdings,
    totalHoldings: holdings.length,
    calculatedAt: new Date(),
  };
}

/**
 * Select defensive portfolio holdings based on Seihai methodology (キャッシュ付き)
 */
export async function selectDefensivePortfolio(
  regime: "bull" | "bear" | "neutral"
): Promise<PortfolioSelection> {
  const cacheKey = createCacheKey("portfolio", "defensive", regime);
  
  return serverCache.getOrFetch(
    cacheKey,
    () => selectDefensivePortfolioInternal(regime),
    CACHE_TTL.PORTFOLIO_RECOMMENDATIONS
  );
}

/**
 * Get complete portfolio recommendations for both strategies (キャッシュ付き)
 */
export async function getPortfolioRecommendations(
  regime: "bull" | "bear" | "neutral",
  diversificationCount?: number
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
