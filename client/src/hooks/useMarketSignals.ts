import { trpc } from '@/lib/trpc';

// シグナルの型定義
export interface Signal {
  name: string;
  active: boolean;
  value: string;
  description: string;
}

export type MarketRegime = 'bull' | 'bear' | 'neutral';

export interface PortfolioAllocation {
  aggressive: number;
  defensive: number;
}

export interface MarketAnalysis {
  regime: MarketRegime;
  regimeJapanese: string;
  confidence: number;
  bullSignals: Signal[];
  bearSignals: Signal[];
  bullCount: number;
  bearCount: number;
  allocation: PortfolioAllocation;
  lastUpdated: Date;
  indicators?: {
    spyPrice: number;
    spyMA200: number;
    spy6MonthReturn: number;
    vix: number;
    yieldCurve: number;
  };
}

/**
 * 市場シグナルを取得するカスタムフック
 * 
 * キャッシュ設定を最適化してAPI呼び出しを削減:
 * - staleTime: 5分（この間はAPIを呼び出さない）
 * - refetchInterval: 5分（自動更新間隔を延長）
 * - サーバーサイドでも5分キャッシュがあるため、二重のキャッシュで効率化
 */
export function useMarketSignals() {
  const utils = trpc.useUtils();
  
  const { data, isLoading, error, refetch } = trpc.market.getAnalysis.useQuery(undefined, {
    // 5分間はAPIを呼び出さない（サーバーサイドキャッシュと同期）
    staleTime: 5 * 60 * 1000,
    // 5分ごとに自動更新（市場データは頻繁に変わらない）
    refetchInterval: 5 * 60 * 1000,
    // リトライ回数
    retry: 2,
  });

  const analysis: MarketAnalysis | null = data ? {
    regime: data.regime,
    regimeJapanese: data.regimeJapanese,
    confidence: data.confidence,
    bullSignals: data.bullSignals,
    bearSignals: data.bearSignals,
    bullCount: data.bullCount,
    bearCount: data.bearCount,
    allocation: data.allocation,
    lastUpdated: new Date(data.lastUpdated),
    indicators: data.indicators,
  } : null;

  const refresh = () => {
    utils.market.getAnalysis.invalidate();
    refetch();
  };

  return {
    analysis,
    loading: isLoading,
    error: error?.message || null,
    refresh,
  };
}
