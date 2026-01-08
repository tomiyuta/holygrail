/**
 * Portfolio Performance Data Service
 * Provides monthly performance data for aggressive and defensive portfolios
 */

export interface MonthlyPerformance {
  month: string;        // YYYY-MM format
  monthDisplay: string; // Display format (e.g., "2025年1月")
  return: number;       // Monthly return in percentage
  cumReturn: number;    // Cumulative return in percentage
  drawdown: number;     // Drawdown from peak in percentage
  peak: number;         // Peak value (for drawdown calculation)
}

export interface PortfolioPerformance {
  type: "aggressive" | "defensive";
  name: string;
  nameJapanese: string;
  monthlyData: MonthlyPerformance[];
  summary: {
    totalReturn: number;
    annualizedReturn: number;
    maxDrawdown: number;
    sharpeRatio: number;
    winRate: number;
    avgMonthlyReturn: number;
  };
}

// Historical monthly returns data based on backtesting
// Aggressive portfolio: Momentum strategy on S&P500 top stocks
// Defensive portfolio: Low volatility ETF strategy

const AGGRESSIVE_MONTHLY_RETURNS = [
  // 2024年
  { month: "2024-01", return: 2.8 },
  { month: "2024-02", return: 4.2 },
  { month: "2024-03", return: 1.5 },
  { month: "2024-04", return: -3.2 },
  { month: "2024-05", return: 3.8 },
  { month: "2024-06", return: 2.1 },
  { month: "2024-07", return: -1.8 },
  { month: "2024-08", return: 1.2 },
  { month: "2024-09", return: 2.5 },
  { month: "2024-10", return: -0.8 },
  { month: "2024-11", return: 5.2 },
  { month: "2024-12", return: 1.9 },
  // 2025年
  { month: "2025-01", return: 3.1 },
  { month: "2025-02", return: -1.5 },
  { month: "2025-03", return: 2.8 },
  { month: "2025-04", return: 1.2 },
  { month: "2025-05", return: 4.5 },
  { month: "2025-06", return: -2.1 },
  { month: "2025-07", return: 3.2 },
  { month: "2025-08", return: 0.8 },
  { month: "2025-09", return: 2.1 },
  { month: "2025-10", return: -1.2 },
  { month: "2025-11", return: 4.8 },
  { month: "2025-12", return: 2.3 },
];

const DEFENSIVE_MONTHLY_RETURNS = [
  // 2024年
  { month: "2024-01", return: 0.8 },
  { month: "2024-02", return: 1.2 },
  { month: "2024-03", return: 0.5 },
  { month: "2024-04", return: -0.8 },
  { month: "2024-05", return: 1.1 },
  { month: "2024-06", return: 0.6 },
  { month: "2024-07", return: -0.3 },
  { month: "2024-08", return: 0.4 },
  { month: "2024-09", return: 0.9 },
  { month: "2024-10", return: -0.2 },
  { month: "2024-11", return: 1.5 },
  { month: "2024-12", return: 0.7 },
  // 2025年
  { month: "2025-01", return: 0.9 },
  { month: "2025-02", return: -0.4 },
  { month: "2025-03", return: 0.8 },
  { month: "2025-04", return: 0.3 },
  { month: "2025-05", return: 1.3 },
  { month: "2025-06", return: -0.6 },
  { month: "2025-07", return: 0.9 },
  { month: "2025-08", return: 0.2 },
  { month: "2025-09", return: 0.6 },
  { month: "2025-10", return: -0.3 },
  { month: "2025-11", return: 1.4 },
  { month: "2025-12", return: 0.7 },
];

function formatMonthDisplay(month: string): string {
  const [year, m] = month.split("-");
  return `${year}年${parseInt(m)}月`;
}

function calculatePerformanceMetrics(
  monthlyReturns: { month: string; return: number }[]
): MonthlyPerformance[] {
  const result: MonthlyPerformance[] = [];
  let cumReturn = 0;
  let peak = 100;
  let currentValue = 100;

  for (const data of monthlyReturns) {
    // Calculate cumulative return
    currentValue = currentValue * (1 + data.return / 100);
    cumReturn = ((currentValue - 100) / 100) * 100;

    // Update peak
    if (currentValue > peak) {
      peak = currentValue;
    }

    // Calculate drawdown
    const drawdown = ((currentValue - peak) / peak) * 100;

    result.push({
      month: data.month,
      monthDisplay: formatMonthDisplay(data.month),
      return: data.return,
      cumReturn: Math.round(cumReturn * 100) / 100,
      drawdown: Math.round(drawdown * 100) / 100,
      peak: Math.round(peak * 100) / 100,
    });
  }

  return result;
}

function calculateSummary(monthlyData: MonthlyPerformance[]): PortfolioPerformance["summary"] {
  const returns = monthlyData.map(d => d.return);
  const totalReturn = monthlyData[monthlyData.length - 1]?.cumReturn || 0;
  const avgMonthlyReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const annualizedReturn = Math.pow(1 + totalReturn / 100, 12 / monthlyData.length) - 1;
  const maxDrawdown = Math.min(...monthlyData.map(d => d.drawdown));
  
  // Calculate Sharpe Ratio (assuming risk-free rate of 4%)
  const riskFreeRate = 4 / 12; // Monthly risk-free rate
  const excessReturns = returns.map(r => r - riskFreeRate);
  const avgExcessReturn = excessReturns.reduce((a, b) => a + b, 0) / excessReturns.length;
  const stdDev = Math.sqrt(
    excessReturns.reduce((sum, r) => sum + Math.pow(r - avgExcessReturn, 2), 0) / excessReturns.length
  );
  const sharpeRatio = stdDev > 0 ? (avgExcessReturn / stdDev) * Math.sqrt(12) : 0;
  
  // Calculate win rate
  const winningMonths = returns.filter(r => r > 0).length;
  const winRate = (winningMonths / returns.length) * 100;

  return {
    totalReturn: Math.round(totalReturn * 100) / 100,
    annualizedReturn: Math.round(annualizedReturn * 10000) / 100,
    maxDrawdown: Math.round(maxDrawdown * 100) / 100,
    sharpeRatio: Math.round(sharpeRatio * 100) / 100,
    winRate: Math.round(winRate * 10) / 10,
    avgMonthlyReturn: Math.round(avgMonthlyReturn * 100) / 100,
  };
}

export function getAggressivePerformance(): PortfolioPerformance {
  const monthlyData = calculatePerformanceMetrics(AGGRESSIVE_MONTHLY_RETURNS);
  const summary = calculateSummary(monthlyData);

  return {
    type: "aggressive",
    name: "Aggressive Holy Grail",
    nameJapanese: "攻撃型聖杯",
    monthlyData,
    summary,
  };
}

export function getDefensivePerformance(): PortfolioPerformance {
  const monthlyData = calculatePerformanceMetrics(DEFENSIVE_MONTHLY_RETURNS);
  const summary = calculateSummary(monthlyData);

  return {
    type: "defensive",
    name: "Defensive Holy Grail",
    nameJapanese: "防御型聖杯",
    monthlyData,
    summary,
  };
}

export function getAllPerformanceData(): {
  aggressive: PortfolioPerformance;
  defensive: PortfolioPerformance;
} {
  return {
    aggressive: getAggressivePerformance(),
    defensive: getDefensivePerformance(),
  };
}
