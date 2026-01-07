import { motion } from 'framer-motion';
import { Activity, Clock, RefreshCw } from 'lucide-react';
import { MarketRegime } from '@/hooks/useMarketSignals';

interface StatusBarProps {
  regime: MarketRegime;
  regimeJapanese: string;
  confidence: number;
  lastUpdated: Date;
  onRefresh: () => void;
  loading: boolean;
}

export function StatusBar({ 
  regime, 
  regimeJapanese, 
  confidence, 
  lastUpdated, 
  onRefresh,
  loading 
}: StatusBarProps) {
  const getRegimeColor = () => {
    switch (regime) {
      case 'BULL': return 'text-[oklch(0.75_0.2_145)]';
      case 'BEAR': return 'text-[oklch(0.65_0.25_25)]';
      default: return 'text-[oklch(0.7_0.15_220)]';
    }
  };

  const getRegimeBgColor = () => {
    switch (regime) {
      case 'BULL': return 'bg-[oklch(0.75_0.2_145)]/10 border-[oklch(0.75_0.2_145)]/30';
      case 'BEAR': return 'bg-[oklch(0.65_0.25_25)]/10 border-[oklch(0.65_0.25_25)]/30';
      default: return 'bg-[oklch(0.7_0.15_220)]/10 border-[oklch(0.7_0.15_220)]/30';
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
                {regime} - {regimeJapanese}
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
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-1.5 rounded hover:bg-secondary transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
