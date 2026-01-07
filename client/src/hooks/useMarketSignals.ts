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

export function useMarketSignals() {
  const utils = trpc.useUtils();
  
  const { data, isLoading, error, refetch } = trpc.market.getAnalysis.useQuery(undefined, {
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000, // Consider data stale after 30 seconds
    retry: 3,
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
