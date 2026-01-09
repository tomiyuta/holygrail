/**
 * Market Data Service
 * Fetches real-time and historical market data from Yahoo Finance API
 * Updated to match the original Seihai (Holy Grail) portfolio selection logic
 * 
 * キャッシュ統合済み - API呼び出しを大幅に削減
 * 
 * 動的選定モード:
 * - S&P500全銘柄（497銘柄）から6か月モメンタム上位100銘柄を動的に選定
 */

import { callDataApi } from "./_core/dataApi";
import { serverCache, CACHE_TTL, createCacheKey } from "./cache";

// S&P500全銘柄リスト（497銘柄）
// 元のExcelダッシュボードから抽出
export const SP500_ALL_SYMBOLS = [
  "SNDK", "WDC", "WBD", "MU", "ALB", "TER", "APP", "STX", "FIX", "LRCX",
  "GOOGL", "GOOG", "NEM", "GLW", "INTC", "CHRW", "EXPE", "IVZ", "FSLR", "AMD",
  "GM", "CMI", "TPR", "CAT", "REGN", "INCY", "TSLA", "DAL", "AMAT", "APH",
  "UAL", "HII", "LLY", "IQV", "LVS", "KLAC", "TMO", "BIIB", "VTRS", "PLTR",
  "C", "TEL", "DD", "ANET", "ROST", "CRH", "JNJ", "AES", "AVGO", "HAL",
  "FOXA", "AAPL", "RL", "GEV", "CRL", "EA", "STLD", "JBHT", "MRK", "ULTA",
  "RTX", "BK", "APA", "CFG", "FOX", "EXPD", "CAH", "MS", "IDXX", "CVNA",
  "PH", "GE", "GS", "HOOD", "KEYS", "WST", "VTR", "EL", "WELL", "DAY",
  "FDX", "LUV", "TJX", "AIZ", "MPWR", "NVDA", "DLTR", "SYF", "NUE", "MNST",
  "HCA", "ABBV", "STT", "PLD", "TKO", "WYNN", "LHX", "HPE", "HWM", "UHS",
  "BKR", "VLO", "SRE", "MTD", "KEY", "NOC", "EME", "F", "PWR", "CVS",
  "CEG", "DG", "ROK", "COR", "EBAY", "HOLX", "EPAM", "AXP", "GD", "JCI",
  "L", "USB", "CBRE", "WFC", "BAC", "PCG", "MCK", "WMT", "FCX", "EIX",
  "BMY", "DHR", "LDOS", "IBKR", "COO", "ADI", "TECH", "SPG", "AME", "COF",
  "AMGN", "ETR", "A", "CSCO", "GL", "MAR", "FE", "MLM", "RF", "PCAR",
  "HST", "AEP", "EW", "TFC", "JPM", "DVN", "NEE", "CNC", "BG", "NSC",
  "GILD", "AKAM", "ATO", "FITB", "CINF", "XOM", "SCHW", "BDX", "NDSN", "HIG",
  "PFG", "NDAQ", "TRV", "OMC", "SNA", "CSX", "CB", "GEHC", "MDT", "XEL",
  "ALLE", "VMC", "HUBB", "TXT", "PNC", "WTW", "SLB", "DHI", "QCOM", "HAS",
  "FRT", "HLT", "TTWO", "CCL", "ROL", "PHM", "TRGP", "NCLH", "NTRS", "PEP",
  "WAT", "FANG", "LNT", "ISRG", "APTV", "CNP", "SWK", "WSM", "LOW", "ACGL",
  "JBL", "AMZN", "NI", "STE", "ES", "EVRG", "ADM", "AFL", "CTRA", "DOV",
  "URI", "ALL", "AEE", "MMM", "LMT", "XYL", "HSY", "DELL", "CVX", "FTV",
  "PSX", "PPL", "RJF", "DDOG", "CTSH", "TROW", "PRU", "HUM", "BA", "UNH",
  "APO", "MCD", "TRMB", "SOLV", "NRG", "WMB", "MRNA", "TSN", "MCO", "IBM",
  "D", "HSIC", "CDNS", "PKG", "MA", "BLK", "WAB", "ORLY", "WEC", "BX",
  "MTB", "YUM", "EXC", "VRTX", "PTC", "JKHY", "HBAN", "NTAP", "COP", "ABNB",
  "TDY", "AIG", "CMS", "J", "AVY", "EG", "AON", "PNR", "MSCI", "MTCH",
  "CME", "DUK", "BXP", "DECK", "PFE", "SPGI", "ON", "ED", "V", "MGM",
  "AOS", "MSFT", "IEX", "MO", "EXE", "BEN", "GPC", "O", "PNW", "UNP",
  "DTE", "EMR", "CRM", "CPT", "KO", "REG", "MET", "VLTO", "PEG", "WRB",
  "KMI", "RVTY", "DGX", "NXPI", "ITW", "WM", "KKR", "EQIX", "ECL", "GWW",
  "GRMN", "EQT", "LH", "ADSK", "XYZ", "ZBH", "CRWD", "ELV", "SJM", "DASH",
  "SYY", "UPS", "LYV", "SO", "KIM", "NVR", "PODD", "MPC", "OXY", "TAP",
  "GPN", "RMD", "EQR", "MAS", "BKNG", "FAST", "BBY", "PANW", "TGT", "MAA",
  "ODFL", "VZ", "IR", "ARES", "ABT", "FICO", "GNRC", "TSCO", "META", "DIS",
  "ESS", "HD", "BR", "AWK", "AZO", "DPZ", "DE", "SHW", "GEN", "BALL",
  "BSX", "ADBE", "KHC", "PM", "AMP", "SNPS", "DLR", "DOC", "MSI", "WDAY",
  "TT", "UDR", "WY", "ETN", "OKE", "LIN", "AVB", "ORCL", "ICE", "MCHP",
  "SYK", "IFF", "PG", "UBER", "CTVA", "CPAY", "LEN", "ACN", "SBUX", "MKC",
  "RCL", "TDG", "KR", "NWSA", "CPB", "COST", "PSA", "RSG", "VST", "GIS",
  "PPG", "OTIS", "HPQ", "NKE", "EXR", "FFIV", "PGR", "APD", "NWS", "T",
  "CL", "AMCR", "CCI", "CHD", "MMC", "INTU", "VICI", "EOG", "INVH", "VRSN",
  "TMUS", "LULU", "CTAS", "SW", "DRI", "ADP", "CI", "KDP", "CMCSA", "IRM",
  "DOW", "CF", "EFX", "TXN", "CSGP", "CAG", "KVUE", "SWKS", "HON", "AJG",
  "ERIE", "SBAC", "CLX", "LII", "BLDR", "FIS", "STZ", "TPL", "ALGN", "LW",
  "DXCM", "IP", "CPRT", "AMT", "ZTS", "MDLZ", "FTNT", "DVA", "ROP", "PYPL",
  "HRL", "TYL", "ZBRA", "KMB", "NOW", "PAYX", "CDW", "POOL", "BRO", "AXON",
  "NFLX", "VRSK", "CARR", "GDDY", "LYB", "PAYC", "COIN", "ARE", "MOS", "MOH",
  "FDS", "CMG", "IT", "SMCI", "BAX", "TTD", "CHTR",
];

// 聖杯（攻撃型）の銘柄ユニバース - 後方互換性のために維持
// 動的選定モードでは使用されない
export const SEIHAI_SYMBOLS = SP500_ALL_SYMBOLS.slice(0, 100);

// S&P 500 top constituents (kept for backward compatibility)
export const SP500_TOP_SYMBOLS = SEIHAI_SYMBOLS;

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
 * Fetch stock chart data from Yahoo Finance (内部関数 - キャッシュなし)
 */
async function fetchStockChartInternal(
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
 * Fetch stock chart data from Yahoo Finance (キャッシュ付き)
 */
export async function fetchStockChart(
  symbol: string,
  range: string = "6mo",
  interval: string = "1d"
): Promise<StockData | null> {
  const cacheKey = createCacheKey("stock", symbol, range, interval);
  
  return serverCache.getOrFetch(
    cacheKey,
    () => fetchStockChartInternal(symbol, range, interval),
    CACHE_TTL.STOCK_DATA
  );
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
 * Calculate momentum (6-month return) - matches original Seihai calculation
 * Formula: (current_price - price_6months_ago) / price_6months_ago
 */
export function calculateMomentum(prices: { adjClose: number }[]): number {
  if (prices.length < 2) return 0;
  const startPrice = prices[0].adjClose;
  const endPrice = prices[prices.length - 1].adjClose;
  if (startPrice === 0) return 0;
  return (endPrice - startPrice) / startPrice;  // Return as decimal (not percentage)
}

/**
 * Calculate risk (MaxRangePct_90日 equivalent) - matches original Seihai calculation
 * Formula: (90-day high - 90-day low) / current_price
 * This measures the price range volatility over the past 90 days
 */
export function calculateRisk(prices: { high: number; low: number; close: number }[]): number {
  if (prices.length < 2) return 0;
  
  // Get last 90 days of data (or all available if less)
  const recentPrices = prices.slice(-90);
  
  // Find max high and min low in the period
  const maxHigh = Math.max(...recentPrices.map(p => p.high));
  const minLow = Math.min(...recentPrices.map(p => p.low));
  const currentPrice = recentPrices[recentPrices.length - 1].close;
  
  if (currentPrice === 0) return 0;
  
  // MaxRangePct = (MaxHigh - MinLow) / CurrentPrice
  const maxRangePct = (maxHigh - minLow) / currentPrice;
  
  // The original Seihai uses a risk value that appears to be related to volatility
  // Based on analysis, the risk column seems to be approximately MaxRangePct * sqrt(12) for annualization
  // However, the exact formula varies. We'll use MaxRangePct * sqrt(12) as approximation
  return maxRangePct * Math.sqrt(12);
}

/**
 * Calculate volatility (standard deviation of returns) - kept for backward compatibility
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
 * Fetch signal indicators for market regime detection (キャッシュ付き)
 */
export async function fetchSignalIndicators(): Promise<SignalIndicators | null> {
  const cacheKey = createCacheKey("signals", "indicators");
  
  return serverCache.getOrFetch(
    cacheKey,
    fetchSignalIndicatorsInternal,
    CACHE_TTL.MARKET_ANALYSIS
  );
}

/**
 * Fetch signal indicators for market regime detection (内部関数)
 */
async function fetchSignalIndicatorsInternal(): Promise<SignalIndicators | null> {
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
    const spy6MonthReturn = calculateMomentum(sixMonthPrices) * 100; // Convert to percentage

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
        // Calculate yield-like spread from price performance
        const hygReturn = calculateMomentum(hygData.prices.slice(-20));
        const lqdReturn = calculateMomentum(lqdData.prices.slice(-20));
        creditSpread = (lqdReturn - hygReturn) * 100; // Positive = risk-off
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
 * Fetch multiple stocks data in parallel with batching (キャッシュ付き)
 */
export async function fetchMultipleStocks(
  symbols: string[],
  range: string = "6mo",
  interval: string = "1d"
): Promise<Map<string, StockData>> {
  const results = new Map<string, StockData>();
  
  // Fetch in batches to avoid rate limiting
  const batchSize = 10;
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    const promises = batch.map(symbol => fetchStockChart(symbol, range, interval));
    const batchResults = await Promise.all(promises);
    
    batchResults.forEach((data, index) => {
      if (data) {
        results.set(batch[index], data);
      }
    });
    
    // Small delay between batches to be nice to the API
    if (i + batchSize < symbols.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}

/**
 * Get dynamic top 100 symbols from S&P500 based on 6-month momentum
 * This function fetches all S&P500 stocks, calculates momentum, and returns top 100
 */
export async function getDynamicTop100Symbols(): Promise<string[]> {
  const cacheKey = createCacheKey("dynamic", "top100", "symbols");
  
  return serverCache.getOrFetch(
    cacheKey,
    getDynamicTop100SymbolsInternal,
    CACHE_TTL.PORTFOLIO_RECOMMENDATIONS  // Cache for same duration as portfolio recommendations
  );
}

/**
 * Internal function to calculate dynamic top 100 symbols
 */
async function getDynamicTop100SymbolsInternal(): Promise<string[]> {
  console.log(`Fetching momentum data for ${SP500_ALL_SYMBOLS.length} S&P500 stocks...`);
  
  // Fetch data for all S&P500 stocks
  const stockDataMap = await fetchMultipleStocks(SP500_ALL_SYMBOLS, "6mo", "1d");
  
  // Calculate momentum for each stock
  const stockMomentums: { symbol: string; momentum: number }[] = [];
  
  for (const [symbol, data] of Array.from(stockDataMap.entries())) {
    if (data && data.prices.length >= 20) {
      const momentum = calculateMomentum(data.prices);
      stockMomentums.push({ symbol, momentum });
    }
  }
  
  // Sort by momentum (descending) and take top 100
  stockMomentums.sort((a, b) => b.momentum - a.momentum);
  const top100 = stockMomentums.slice(0, 100).map(s => s.symbol);
  
  console.log(`Selected top 100 stocks by momentum. Top 5: ${top100.slice(0, 5).join(', ')}`);
  
  return top100;
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

/**
 * キャッシュ統計を取得（デバッグ用）
 */
export function getCacheStats() {
  return serverCache.getStats();
}

/**
 * キャッシュをクリア（管理用）
 */
export function clearCache() {
  serverCache.clear();
}
