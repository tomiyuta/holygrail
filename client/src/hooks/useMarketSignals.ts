import { useState, useEffect, useCallback } from 'react';

// シグナルの型定義
export interface Signal {
  name: string;
  value: number;
  threshold: number;
  condition: 'above' | 'below';
  status: 'bull' | 'bear';
  description: string;
}

export interface BullSignal extends Signal {
  type: 'bull';
}

export interface BearSignal extends Signal {
  type: 'bear';
}

export type MarketRegime = 'BULL' | 'BEAR' | 'NEUTRAL';

export interface PortfolioAllocation {
  attackRatio: number;
  defenseRatio: number;
  attackStocks: number;
  defenseStocks: number;
}

export interface MarketAnalysis {
  regime: MarketRegime;
  regimeJapanese: string;
  confidence: number;
  bullSignals: BullSignal[];
  bearSignals: BearSignal[];
  bullCount: number;
  bearCount: number;
  allocation: PortfolioAllocation;
  lastUpdated: Date;
}

// シミュレートされた市場データ（実際のAPIからデータを取得する場合はここを置き換え）
const generateSimulatedData = () => {
  // 現在の市場状況をシミュレート
  const spyPrice = 590 + Math.random() * 20;
  const spy10MA = 580 + Math.random() * 15;
  const momentum6M = -0.02 + Math.random() * 0.15;
  const momentum12M = -0.05 + Math.random() * 0.20;
  const vix = 12 + Math.random() * 20;
  const vixChange3M = -0.1 + Math.random() * 0.6;
  const spy2MA = 585 + Math.random() * 15;

  return {
    spyPrice,
    spy10MA,
    spy2MA,
    momentum6M,
    momentum12M,
    vix,
    vixChange3M,
  };
};

export function useMarketSignals() {
  const [analysis, setAnalysis] = useState<MarketAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const calculateSignals = useCallback(() => {
    try {
      const data = generateSimulatedData();

      // 好況シグナル（高感度）
      const bullSignals: BullSignal[] = [
        {
          type: 'bull',
          name: 'SPY vs 10ヶ月MA',
          value: data.spyPrice / data.spy10MA,
          threshold: 0.98,
          condition: 'above',
          status: data.spyPrice > data.spy10MA * 0.98 ? 'bull' : 'bear',
          description: `SPY: $${data.spyPrice.toFixed(2)} / MA: $${data.spy10MA.toFixed(2)}`,
        },
        {
          type: 'bull',
          name: '6ヶ月モメンタム',
          value: data.momentum6M,
          threshold: -0.05,
          condition: 'above',
          status: data.momentum6M > -0.05 ? 'bull' : 'bear',
          description: `${(data.momentum6M * 100).toFixed(1)}% (閾値: -5%)`,
        },
        {
          type: 'bull',
          name: 'VIX',
          value: data.vix,
          threshold: 25,
          condition: 'below',
          status: data.vix < 25 ? 'bull' : 'bear',
          description: `${data.vix.toFixed(1)} (閾値: 25)`,
        },
      ];

      // 不況シグナル（高特異度）
      const bearSignals: BearSignal[] = [
        {
          type: 'bear',
          name: 'SPY vs 10ヶ月MA (厳格)',
          value: data.spyPrice / data.spy10MA,
          threshold: 0.93,
          condition: 'below',
          status: data.spyPrice < data.spy10MA * 0.93 ? 'bear' : 'bull',
          description: `SPY: $${data.spyPrice.toFixed(2)} / MA×93%: $${(data.spy10MA * 0.93).toFixed(2)}`,
        },
        {
          type: 'bear',
          name: '6ヶ月モメンタム (厳格)',
          value: data.momentum6M,
          threshold: -0.08,
          condition: 'below',
          status: data.momentum6M < -0.08 ? 'bear' : 'bull',
          description: `${(data.momentum6M * 100).toFixed(1)}% (閾値: -8%)`,
        },
        {
          type: 'bear',
          name: '50日MA vs 200日MA',
          value: data.spy2MA / data.spy10MA,
          threshold: 0.95,
          condition: 'below',
          status: data.spy2MA < data.spy10MA * 0.95 ? 'bear' : 'bull',
          description: `比率: ${((data.spy2MA / data.spy10MA) * 100).toFixed(1)}%`,
        },
        {
          type: 'bear',
          name: '12ヶ月モメンタム',
          value: data.momentum12M,
          threshold: -0.12,
          condition: 'below',
          status: data.momentum12M < -0.12 ? 'bear' : 'bull',
          description: `${(data.momentum12M * 100).toFixed(1)}% (閾値: -12%)`,
        },
        {
          type: 'bear',
          name: 'VIX 3ヶ月変化率',
          value: data.vixChange3M,
          threshold: 0.40,
          condition: 'above',
          status: data.vixChange3M > 0.40 ? 'bear' : 'bull',
          description: `${(data.vixChange3M * 100).toFixed(1)}% (閾値: 40%)`,
        },
      ];

      // シグナルのカウント
      const bullCount = bullSignals.filter(s => s.status === 'bull').length;
      const bearCount = bearSignals.filter(s => s.status === 'bear').length;

      // 市場環境の判定（デュアル・シグナル戦略）
      let regime: MarketRegime;
      let regimeJapanese: string;
      let confidence: number;

      if (bearCount >= 3) {
        regime = 'BEAR';
        regimeJapanese = '不況期';
        confidence = (bearCount / 5) * 100;
      } else if (bullCount >= 2) {
        regime = 'BULL';
        regimeJapanese = '好況期';
        confidence = (bullCount / 3) * 100;
      } else {
        regime = 'NEUTRAL';
        regimeJapanese = '中立期';
        confidence = 50;
      }

      // ポートフォリオ配分の決定
      let allocation: PortfolioAllocation;
      switch (regime) {
        case 'BULL':
          allocation = {
            attackRatio: 60,
            defenseRatio: 40,
            attackStocks: 25,
            defenseStocks: 7,
          };
          break;
        case 'BEAR':
          allocation = {
            attackRatio: 20,
            defenseRatio: 80,
            attackStocks: 5,
            defenseStocks: 3,
          };
          break;
        default:
          allocation = {
            attackRatio: 40,
            defenseRatio: 60,
            attackStocks: 5,
            defenseStocks: 5,
          };
      }

      setAnalysis({
        regime,
        regimeJapanese,
        confidence,
        bullSignals,
        bearSignals,
        bullCount,
        bearCount,
        allocation,
        lastUpdated: new Date(),
      });
      setLoading(false);
    } catch (err) {
      setError('シグナルの計算中にエラーが発生しました');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    calculateSignals();
    // 30秒ごとに更新
    const interval = setInterval(calculateSignals, 30000);
    return () => clearInterval(interval);
  }, [calculateSignals]);

  const refresh = useCallback(() => {
    setLoading(true);
    calculateSignals();
  }, [calculateSignals]);

  return { analysis, loading, error, refresh };
}
