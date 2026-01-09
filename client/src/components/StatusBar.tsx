import { motion } from 'framer-motion';
import { Activity, Clock, RefreshCw, Download } from 'lucide-react';
import { MarketRegime } from '@/hooks/useMarketSignals';

interface StatusBarProps {
  regime: MarketRegime;
  regimeJapanese: string;
  confidence: number;
  lastUpdated: Date;
  onRefresh: () => void;
  onForceRefresh?: () => void;
  loading: boolean;
  isRefreshing?: boolean;
}

export function StatusBar({ 
  regime, 
  regimeJapanese, 
  confidence, 
  lastUpdated, 
  onRefresh,
  onForceRefresh,
  loading,
  isRefreshing = false,
}: StatusBarProps) {
  const getRegimeColor = () => {
    switch (regime) {
      case 'bull': return 'text-[oklch(0.75_0.2_145)]';
      case 'bear': return 'text-[oklch(0.65_0.25_25)]';
      default: return 'text-[oklch(0.7_0.15_220)]';
    }
  };

  const getRegimeBgColor = () => {
    switch (regime) {
      case 'bull': return 'bg-[oklch(0.75_0.2_145)]/10 border-[oklch(0.75_0.2_145)]/30';
      case 'bear': return 'bg-[oklch(0.65_0.25_25)]/10 border-[oklch(0.65_0.25_25)]/30';
      default: return 'bg-[oklch(0.7_0.15_220)]/10 border-[oklch(0.7_0.15_220)]/30';
    }
  };

  const getRegimeDisplay = () => {
    switch (regime) {
      case 'bull': return 'BULL';
      case 'bear': return 'BEAR';
      default: return 'NEUTRAL';
    }
  };

  return (
    <div className="bg-card/50 border-b border-border backdrop-blur-sm sticky top-0 z-50">
      <div className="container py-3">
        <div className="flex items-center justify-between">
          {/* Left: System Title */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              <span className="font-mono text-sm text-muted-foreground">PORTFOLIO ADVISOR</span>
            </div>
            <div className="h-4 w-px bg-border" />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`px-3 py-1 rounded border ${getRegimeBgColor()}`}
            >
              <span className={`font-mono text-sm font-semibold ${getRegimeColor()}`}>
                {getRegimeDisplay()} - {regimeJapanese}
              </span>
            </motion.div>
          </div>

          {/* Right: Status Info */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="text-xs font-mono">信頼度:</span>
              <span className={`text-sm font-mono font-semibold ${getRegimeColor()}`}>
                {confidence.toFixed(0)}%
              </span>
            </div>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-mono">
                {lastUpdated.toLocaleTimeString('ja-JP')}
              </span>
            </div>
            {/* 通常の再読み込み（キャッシュから） */}
            <button
              onClick={onRefresh}
              disabled={loading || isRefreshing}
              className="p-1.5 rounded hover:bg-secondary transition-colors disabled:opacity-50"
              title="キャッシュから再読み込み"
            >
              <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
            </button>
            {/* 手動更新（サーバーキャッシュをクリアして最新データを取得） */}
            {onForceRefresh && (
              <button
                onClick={onForceRefresh}
                disabled={loading || isRefreshing}
                className="flex items-center gap-1.5 px-2 py-1 rounded bg-primary/10 hover:bg-primary/20 border border-primary/30 transition-colors disabled:opacity-50"
                title="最新データを取得（サーバーキャッシュをクリア）"
              >
                <Download className={`w-3.5 h-3.5 text-primary ${isRefreshing ? 'animate-bounce' : ''}`} />
                <span className="text-xs font-mono text-primary">
                  {isRefreshing ? '更新中...' : 'データ更新'}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
