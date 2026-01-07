/**
 * Market Data Service
 * Fetches real-time and historical market data from Yahoo Finance API
 */

import { callDataApi } from "./_core/dataApi";

// S&P 500 top constituents (simplified list for demonstration)
export const SP500_TOP_SYMBOLS = [
  "AAPL", "MSFT", "AMZN", "NVDA", "GOOGL", "META", "TSLA", "BRK-B", "UNH", "XOM",
  "JNJ", "JPM", "V", "PG", "MA", "HD", "CVX", "MRK", "ABBV", "LLY",
  "PEP", "KO", "COST", "AVGO", "WMT", "MCD", "CSCO", "TMO", "ABT", "ACN",
  "DHR", "NKE", "ORCL", "VZ", "ADBE", "CRM", "INTC", "CMCSA", "NEE", "TXN",
  "PM", "WFC", "BMY", "UPS", "RTX", "HON", "QCOM", "LOW", "UNP", "SPGI"
];

// Defensive ETF universe
export const DEFENSIVE_ETFS = [
  { symbol: "GLD", name: "SPDR Gold Shares", category: "金" },
  { symbol: "EEM", name: "iShares MSCI Emerging Markets", category: "新興国株" },
  { symbol: "IWM", name: "iShares Russell 2000", category: "小型株" },
  { symbol: "EFA", name: "iShares MSCI EAFE", category: "先進国株" },
  { symbol: "QQQ", name: "Invesco QQQ Trust", category: "NASDAQ100" },
  { symbol: "SPY", name: "SPDR S&P 500 ETF", category: "S&P500" },
  { symbol: "DBC", name: "Invesco DB Commodity", category: "コモディティ" },
  { symbol: "IEF", name: "iShares 7-10 Year Treasury", category: "中期国債" },
  { symbol: "LQD", name: "iShares Investment Grade Corporate", category: "投資適格社債" },
  { symbol: "AGG", name: "iShares Core US Aggregate Bond", category: "総合債券" },
  { symbol: "TLT", name: "iShares 20+ Year Treasury", category: "長期国債" },
  { symbol: "TIP", name: "iShares TIPS Bond", category: "物価連動債" },
  { symbol: "SHY", name: "iShares 1-3 Year Treasury", category: "短期国債" },
  { symbol: "IYR", name: "iShares US Real Estate", category: "不動産" },
];

// Signal indicator symbols
export const SIGNAL_SYMBOLS = {
  SPY: "SPY",      // S&P 500 ETF
  VIX: "^VIX",     // Volatility Index
  TNX: "^TNX",     // 10-Year Treasury Yield
  TYX: "^TYX",     // 30-Year Treasury Yield
  IRX: "^IRX",     // 13-Week Treasury Bill
  HYG: "HYG",      // High Yield Corporate Bond ETF
  LQD: "LQD",      // Investment Grade Corporate Bond ETF
};

export interface StockData {
  symbol: string;
  name?: string;
  prices: {
    date: Date;
    open: number;
    high: number;
    low: number;
    close: number;
    adjClose: number;
    volume: number;
  }[];
  currentPrice: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
}

export interface SignalIndicators {
  spyPrice: number;
  spyMA10: number;
  spyMA50: number;
  spyMA200: number;
  spy6MonthReturn: number;
  vix: number;
  yieldCurve: number;  // 10Y - 3M spread
  creditSpread: number; // HYG - LQD spread
  lastUpdated: Date;
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
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
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
 * Fetch stock chart data from Yahoo Finance
 */
export async function fetchStockChart(
  symbol: string,
  range: string = "6mo",
  interval: string = "1d"
): Promise<StockData | null> {
  try {
    const rawResponse = await callDataApi("YahooFinance/get_stock_chart", {
      query: {
        symbol,
        region: "US",
        interval,
        range,
        includeAdjustedClose: "true",
      },
    });

    const response = rawResponse as YahooFinanceResponse;

    if (!response?.chart?.result?.[0]) {
      console.warn(`No data found for symbol: ${symbol}`);
      return null;
    }

    const result = response.chart.result[0];
    const meta = result.meta;
    const timestamps = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0] || {};
    const adjCloseData = result.indicators?.adjclose?.[0]?.adjclose || [];

    const prices = timestamps.map((ts: number, i: number) => ({
      date: new Date(ts * 1000),
      open: quotes.open?.[i] || 0,
      high: quotes.high?.[i] || 0,
      low: quotes.low?.[i] || 0,
      close: quotes.close?.[i] || 0,
      adjClose: adjCloseData[i] || quotes.close?.[i] || 0,
      volume: quotes.volume?.[i] || 0,
    })).filter((p: { close: number }) => p.close > 0);

    return {
      symbol,
      name: meta.longName || meta.shortName || symbol,
      prices,
      currentPrice: meta.regularMarketPrice || 0,
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh || 0,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow || 0,
    };
  } catch (error) {
    console.error(`Error fetching data for ${symbol}:`, error);
    return null;
  }
}

/**
 * Calculate moving average
 */
export function calculateMA(prices: number[], period: number): number {
  if (prices.length < period) return 0;
  const slice = prices.slice(-period);
  return slice.reduce((sum, p) => sum + p, 0) / period;
}

/**
 * Calculate momentum (6-month return)
 */
export function calculateMomentum(prices: { adjClose: number }[]): number {
  if (prices.length < 2) return 0;
  const startPrice = prices[0].adjClose;
  const endPrice = prices[prices.length - 1].adjClose;
  if (startPrice === 0) return 0;
  return ((endPrice - startPrice) / startPrice) * 100;
}

/**
 * Calculate volatility (standard deviation of returns)
 */
export function calculateVolatility(prices: { adjClose: number }[]): number {
  if (prices.length < 2) return 0;
  
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i - 1].adjClose > 0) {
      returns.push((prices[i].adjClose - prices[i - 1].adjClose) / prices[i - 1].adjClose);
    }
  }
  
  if (returns.length === 0) return 0;
  
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  
  // Annualized volatility
  return Math.sqrt(variance * 252) * 100;
}

/**
 * Fetch signal indicators for market regime detection
 */
export async function fetchSignalIndicators(): Promise<SignalIndicators | null> {
  try {
    // Fetch SPY data for price and moving averages
    const spyData = await fetchStockChart(SIGNAL_SYMBOLS.SPY, "1y", "1d");
    if (!spyData) return null;

    const closePrices = spyData.prices.map(p => p.adjClose);
    const spyPrice = closePrices[closePrices.length - 1];
    const spyMA10 = calculateMA(closePrices, 10);
    const spyMA50 = calculateMA(closePrices, 50);
    const spyMA200 = calculateMA(closePrices, 200);
    
    // Calculate 6-month return
    const sixMonthPrices = spyData.prices.slice(-126); // ~6 months of trading days
    const spy6MonthReturn = calculateMomentum(sixMonthPrices);

    // Fetch VIX
    let vix = 20; // Default value
    try {
      const vixData = await fetchStockChart(SIGNAL_SYMBOLS.VIX, "5d", "1d");
      if (vixData && vixData.prices.length > 0) {
        vix = vixData.prices[vixData.prices.length - 1].close;
      }
    } catch (e) {
      console.warn("Could not fetch VIX, using default");
    }

    // Fetch Treasury yields for yield curve
    let yieldCurve = 0;
    try {
      const tnxData = await fetchStockChart(SIGNAL_SYMBOLS.TNX, "5d", "1d");
      const irxData = await fetchStockChart(SIGNAL_SYMBOLS.IRX, "5d", "1d");
      if (tnxData && irxData && tnxData.prices.length > 0 && irxData.prices.length > 0) {
        const tenYear = tnxData.prices[tnxData.prices.length - 1].close;
        const threeMonth = irxData.prices[irxData.prices.length - 1].close;
        yieldCurve = tenYear - threeMonth;
      }
    } catch (e) {
      console.warn("Could not fetch yield curve data");
    }

    // Fetch credit spread (HYG - LQD)
    let creditSpread = 0;
    try {
      const hygData = await fetchStockChart(SIGNAL_SYMBOLS.HYG, "1mo", "1d");
      const lqdData = await fetchStockChart(SIGNAL_SYMBOLS.LQD, "1mo", "1d");
      if (hygData && lqdData && hygData.prices.length > 0 && lqdData.prices.length > 0) {
        // Calculate yield-like spread based on price movements
        const hygReturn = calculateMomentum(hygData.prices.slice(-20));
        const lqdReturn = calculateMomentum(lqdData.prices.slice(-20));
        creditSpread = lqdReturn - hygReturn; // Positive = risk-off
      }
    } catch (e) {
      console.warn("Could not fetch credit spread data");
    }

    return {
      spyPrice,
      spyMA10,
      spyMA50,
      spyMA200,
      spy6MonthReturn,
      vix,
      yieldCurve,
      creditSpread,
      lastUpdated: new Date(),
    };
  } catch (error) {
    console.error("Error fetching signal indicators:", error);
    return null;
  }
}

/**
 * Determine market regime based on signals
 */
export function determineMarketRegime(indicators: SignalIndicators): {
  regime: "bull" | "bear" | "neutral";
  regimeJapanese: string;
  confidence: number;
  bullCount: number;
  bearCount: number;
  bullSignals: { name: string; active: boolean; value: string; description: string }[];
  bearSignals: { name: string; active: boolean; value: string; description: string }[];
} {
  // Bull signals (high sensitivity - 2/3 threshold)
  const bullSignals = [
    {
      name: "SPY vs 10ヶ月移動平均",
      active: indicators.spyPrice > indicators.spyMA200,
      value: `${indicators.spyPrice.toFixed(2)} vs ${indicators.spyMA200.toFixed(2)}`,
      description: "SPYが200日移動平均を上回っている",
    },
    {
      name: "イールドカーブ",
      active: indicators.yieldCurve > 0,
      value: `${indicators.yieldCurve.toFixed(2)}%`,
      description: "10年国債利回りが3ヶ月国債利回りを上回っている",
    },
    {
      name: "クレジットリスク",
      active: indicators.creditSpread < 2,
      value: `${indicators.creditSpread.toFixed(2)}%`,
      description: "信用スプレッドが低水準",
    },
  ];

  // Bear signals (high specificity - 3/5 threshold)
  const bearSignals = [
    {
      name: "SPY vs 10ヶ月移動平均",
      active: indicators.spyPrice < indicators.spyMA200,
      value: `${indicators.spyPrice.toFixed(2)} vs ${indicators.spyMA200.toFixed(2)}`,
      description: "SPYが200日移動平均を下回っている",
    },
    {
      name: "6ヶ月モメンタム",
      active: indicators.spy6MonthReturn < 0,
      value: `${indicators.spy6MonthReturn.toFixed(2)}%`,
      description: "SPYの6ヶ月リターンがマイナス",
    },
    {
      name: "移動平均クロスオーバー",
      active: indicators.spyMA50 < indicators.spyMA200,
      value: `MA50: ${indicators.spyMA50.toFixed(2)} vs MA200: ${indicators.spyMA200.toFixed(2)}`,
      description: "50日移動平均が200日移動平均を下回っている（デッドクロス）",
    },
    {
      name: "VIX水準",
      active: indicators.vix > 25,
      value: `${indicators.vix.toFixed(2)}`,
      description: "VIXが25を超えている（高ボラティリティ）",
    },
    {
      name: "イールドカーブ逆転",
      active: indicators.yieldCurve < -0.5,
      value: `${indicators.yieldCurve.toFixed(2)}%`,
      description: "イールドカーブが大きく逆転している",
    },
  ];

  const bullCount = bullSignals.filter(s => s.active).length;
  const bearCount = bearSignals.filter(s => s.active).length;

  // Determine regime
  let regime: "bull" | "bear" | "neutral";
  let regimeJapanese: string;
  let confidence: number;

  if (bearCount >= 3) {
    regime = "bear";
    regimeJapanese = "不況";
    confidence = (bearCount / 5) * 100;
  } else if (bullCount >= 2) {
    regime = "bull";
    regimeJapanese = "好況";
    confidence = (bullCount / 3) * 100;
  } else {
    regime = "neutral";
    regimeJapanese = "中立";
    confidence = 50;
  }

  return {
    regime,
    regimeJapanese,
    confidence,
    bullCount,
    bearCount,
    bullSignals,
    bearSignals,
  };
}

/**
 * Calculate allocation based on market regime
 */
export function calculateAllocation(regime: "bull" | "bear" | "neutral"): {
  aggressive: number;
  defensive: number;
} {
  switch (regime) {
    case "bull":
      return { aggressive: 80, defensive: 20 };
    case "bear":
      return { aggressive: 20, defensive: 80 };
    case "neutral":
    default:
      return { aggressive: 50, defensive: 50 };
  }
}
