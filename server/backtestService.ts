/**
 * Backtest Service
 * Provides historical portfolio selection based on past data
 * and allows simulation with different diversification settings
 * 
 * Updated to support arbitrary date selection using Yahoo Finance API
 * キャッシュ統合済み - バックテスト結果をキャッシュ（過去データは変わらないため24時間）
 */

import { callDataApi } from "./_core/dataApi";
import { SEIHAI_SYMBOLS } from "./marketData";
import { serverCache, CACHE_TTL, createCacheKey } from "./cache";

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

// Yahoo Finance API response types
interface YahooFinanceQuote {
  open?: number[];
  high?: number[];
  low?: number[];
  close?: number[];
  volume?: number[];
}

interface YahooFinanceAdjClose {
  adjclose?: number[];
}

interface YahooFinanceMeta {
  longName?: string;
  shortName?: string;
  regularMarketPrice?: number;
}

interface YahooFinanceResult {
  meta: YahooFinanceMeta;
  timestamp?: number[];
  indicators?: {
    quote?: YahooFinanceQuote[];
    adjclose?: YahooFinanceAdjClose[];
  };
}

interface YahooFinanceResponse {
  chart?: {
    result?: YahooFinanceResult[];
  };
}

/**
 * Fetch historical stock data from Yahoo Finance for a specific date range (キャッシュ付き)
 */
async function fetchHistoricalData(
  symbol: string,
  endDate: Date
): Promise<{
  symbol: string;
  name: string;
  prices: { date: Date; high: number; low: number; close: number; adjClose: number }[];
} | null> {
  // Create cache key based on symbol and date (rounded to day)
  const dateKey = endDate.toISOString().split('T')[0];
  const cacheKey = createCacheKey("historical", symbol, dateKey);
  
  return serverCache.getOrFetch(
    cacheKey,
    () => fetchHistoricalDataInternal(symbol, endDate),
    CACHE_TTL.BACKTEST_RESULTS  // 24 hours - historical data doesn't change
  );
}

/**
 * Fetch historical stock data from Yahoo Finance (内部関数)
 */
async function fetchHistoricalDataInternal(
  symbol: string,
  endDate: Date
): Promise<{
  symbol: string;
  name: string;
  prices: { date: Date; high: number; low: number; close: number; adjClose: number }[];
} | null> {
  try {
    // Calculate period1 (9 months before endDate) and period2 (endDate)
    const period2 = Math.floor(endDate.getTime() / 1000);
    const startDate = new Date(endDate);
    startDate.setMonth(startDate.getMonth() - 9); // 9 months for 6-month momentum + 90-day risk
    const period1 = Math.floor(startDate.getTime() / 1000);

    const rawResponse = await callDataApi("YahooFinance/get_stock_chart", {
      query: {
        symbol,
        region: "US",
        interval: "1d",
        period1: period1.toString(),
        period2: period2.toString(),
        includeAdjustedClose: "true",
      },
    });

    const response = rawResponse as YahooFinanceResponse;

    if (!response?.chart?.result?.[0]) {
      return null;
    }

    const result = response.chart.result[0];
    const meta = result.meta;
    const timestamps = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0] || {};
    const adjCloseData = result.indicators?.adjclose?.[0]?.adjclose || [];

    const prices = timestamps.map((ts: number, i: number) => ({
      date: new Date(ts * 1000),
      high: quotes.high?.[i] || 0,
      low: quotes.low?.[i] || 0,
      close: quotes.close?.[i] || 0,
      adjClose: adjCloseData[i] || quotes.close?.[i] || 0,
    })).filter((p: { close: number }) => p.close > 0);

    return {
      symbol,
      name: meta.longName || meta.shortName || symbol,
      prices,
    };
  } catch (error) {
    console.error(`Error fetching historical data for ${symbol}:`, error);
    return null;
  }
}

/**
 * Calculate 6-month momentum at a specific date
 */
function calculateMomentumAtDate(
  prices: { date: Date; adjClose: number }[],
  targetDate: Date
): number {
  // Find prices up to target date
  const relevantPrices = prices.filter(p => p.date <= targetDate);
  if (relevantPrices.length < 126) return 0; // Need ~6 months of data

  // Get price 6 months ago and current price
  const endPrice = relevantPrices[relevantPrices.length - 1].adjClose;
  const startIndex = Math.max(0, relevantPrices.length - 126);
  const startPrice = relevantPrices[startIndex].adjClose;

  if (startPrice === 0) return 0;
  return (endPrice - startPrice) / startPrice;
}

/**
 * Calculate risk (90-day max range) at a specific date
 */
function calculateRiskAtDate(
  prices: { date: Date; high: number; low: number; close: number }[],
  targetDate: Date
): number {
  // Find prices up to target date
  const relevantPrices = prices.filter(p => p.date <= targetDate);
  if (relevantPrices.length < 2) return 0;

  // Get last 90 days
  const recentPrices = relevantPrices.slice(-90);
  
  const maxHigh = Math.max(...recentPrices.map(p => p.high));
  const minLow = Math.min(...recentPrices.map(p => p.low));
  const currentPrice = recentPrices[recentPrices.length - 1].close;

  if (currentPrice === 0) return 0;
  
  // MaxRangePct * sqrt(12) for annualization
  return ((maxHigh - minLow) / currentPrice) * Math.sqrt(12);
}

/**
 * Run backtest for any arbitrary date (内部関数)
 */
async function runBacktestForDateInternal(
  dateStr: string,
  diversificationCount: number = 5
): Promise<BacktestResult | null> {
  const count = Math.max(3, Math.min(10, diversificationCount));
  const targetDate = new Date(dateStr + "T23:59:59Z");

  // Fetch data for all symbols in parallel (in batches to avoid rate limiting)
  const batchSize = 20;
  const allStocks: BacktestStock[] = [];

  for (let i = 0; i < SEIHAI_SYMBOLS.length; i += batchSize) {
    const batch = SEIHAI_SYMBOLS.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (symbol) => {
        const data = await fetchHistoricalData(symbol, targetDate);
        if (!data || data.prices.length < 126) return null;

        const momentum = calculateMomentumAtDate(data.prices, targetDate);
        const risk = calculateRiskAtDate(data.prices, targetDate);
        const lastPrice = data.prices[data.prices.length - 1];

        if (risk === 0 || momentum === 0) return null;

        return {
          symbol,
          name: data.name,
          momentum,
          risk,
          price: lastPrice.close,
          rank: 0,
        };
      })
    );

    allStocks.push(...batchResults.filter((s): s is BacktestStock => s !== null));
    
    // Small delay between batches to avoid rate limiting
    if (i + batchSize < SEIHAI_SYMBOLS.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  if (allStocks.length === 0) {
    return null;
  }

  // Sort by momentum descending
  allStocks.sort((a, b) => b.momentum - a.momentum);
  allStocks.forEach((stock, idx) => {
    stock.rank = idx + 1;
  });

  // Select top N stocks
  const selectedStocks = allStocks.slice(0, count);

  // Calculate risk-inverse weights
  const totalInverseRisk = selectedStocks.reduce(
    (sum, s) => sum + (1 / s.risk),
    0
  );

  const holdings = selectedStocks.map(stock => ({
    symbol: stock.symbol,
    name: stock.name,
    weight: ((1 / stock.risk) / totalInverseRisk) * 100,
    momentum: stock.momentum * 100,
    risk: stock.risk,
    price: stock.price,
  }));

  // Sort by weight descending
  holdings.sort((a, b) => b.weight - a.weight);

  return {
    date: dateStr,
    holdings,
    totalHoldings: holdings.length,
    diversificationCount: count,
  };
}

/**
 * Run backtest for any arbitrary date (キャッシュ付き)
 * Fetches real data from Yahoo Finance API
 */
export async function runBacktestForDate(
  dateStr: string,
  diversificationCount: number = 5
): Promise<BacktestResult | null> {
  const cacheKey = createCacheKey("backtest", dateStr, diversificationCount);
  
  return serverCache.getOrFetch(
    cacheKey,
    () => runBacktestForDateInternal(dateStr, diversificationCount),
    CACHE_TTL.BACKTEST_RESULTS  // 24 hours
  );
}

/**
 * Get available backtest dates (for backward compatibility)
 * Now returns a list of suggested dates
 */
export function getAvailableDates(): string[] {
  const dates: string[] = [];
  const today = new Date();
  
  // Generate dates for past 24 months (end of each month)
  for (let i = 1; i <= 24; i++) {
    const date = new Date(today);
    date.setMonth(date.getMonth() - i);
    // Set to last day of month
    date.setDate(0);
    dates.push(date.toISOString().split('T')[0]);
  }
  
  return dates.sort().reverse();
}

/**
 * Legacy function - kept for backward compatibility
 */
export function runBacktest(
  date: string,
  diversificationCount: number = 5
): BacktestResult | null {
  // This is now a sync wrapper that returns null
  // The actual implementation is in runBacktestForDate
  return null;
}
