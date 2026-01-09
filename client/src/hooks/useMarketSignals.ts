import { trpc } from '@/lib/trpc';
import { useState } from 'react';

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
 * 月次リバランス対応:
 * - staleTime: 1時間（サーバーサイドは24時間キャッシュ）
 * - refetchInterval: 無効（自動更新なし、手動更新のみ）
 * - 手動更新機能: 全ユーザーが任意のタイミングで更新可能
 */
export function useMarketSignals() {
  const utils = trpc.useUtils();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const { data, isLoading, error, refetch } = trpc.market.getAnalysis.useQuery(undefined, {
    // 1時間はAPIを呼び出さない（サーバーサイドは24時間キャッシュ）
    staleTime: 60 * 60 * 1000,
    // 自動更新なし（手動更新のみ）
    refetchInterval: false,
    // リトライ回数
    retry: 2,
  });

  // 手動更新API
  const refreshSignalsMutation = trpc.refresh.signals.useMutation({
    onSuccess: () => {
      // キャッシュを無効化して再取得
      utils.market.getAnalysis.invalidate();
    },
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

  // 通常の再取得（キャッシュから）
  const refresh = () => {
    utils.market.getAnalysis.invalidate();
    refetch();
  };

  // 手動更新（サーバーキャッシュをクリアして最新データを取得）
  const forceRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshSignalsMutation.mutateAsync();
    } finally {
      setIsRefreshing(false);
    }
  };

  return {
    analysis,
    loading: isLoading,
    error: error?.message || null,
    refresh,
    forceRefresh,
    isRefreshing,
  };
}
