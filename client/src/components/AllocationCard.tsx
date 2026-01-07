import { motion } from 'framer-motion';
import { PieChart, Swords, Shield } from 'lucide-react';
import { PortfolioAllocation, MarketRegime } from '@/hooks/useMarketSignals';

interface AllocationCardProps {
  allocation: PortfolioAllocation;
  regime: MarketRegime;
}

export function AllocationCard({ allocation, regime }: AllocationCardProps) {
  const attackColor = 'oklch(0.75 0.2 145)';
  const defenseColor = 'oklch(0.8 0.15 200)';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="terminal-card"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10">
          <PieChart className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">推奨ポートフォリオ配分</h3>
          <p className="text-xs text-muted-foreground">市場環境に基づく最適配分</p>
        </div>
      </div>

      {/* Allocation Bar */}
      <div className="mb-6">
        <div className="h-8 rounded-lg overflow-hidden flex">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${allocation.attackRatio}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="flex items-center justify-center"
            style={{ backgroundColor: attackColor }}
          >
            <span className="text-xs font-mono font-bold text-background">
              {allocation.attackRatio}%
            </span>
          </motion.div>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${allocation.defenseRatio}%` }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
            className="flex items-center justify-center"
            style={{ backgroundColor: defenseColor }}
          >
            <span className="text-xs font-mono font-bold text-background">
              {allocation.defenseRatio}%
            </span>
          </motion.div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Attack Strategy */}
        <div className="p-4 rounded-lg border border-border bg-secondary/30">
          <div className="flex items-center gap-2 mb-3">
            <Swords className="w-4 h-4" style={{ color: attackColor }} />
            <span className="text-sm font-medium">攻撃型聖杯</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">配分比率</span>
              <span className="font-mono font-bold" style={{ color: attackColor }}>
                {allocation.attackRatio}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">銘柄数</span>
              <span className="font-mono font-bold text-foreground">
                {allocation.attackStocks}銘柄
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border">
              S&P500からモメンタム上位銘柄を選定
            </div>
          </div>
        </div>

        {/* Defense Strategy */}
        <div className="p-4 rounded-lg border border-border bg-secondary/30">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4" style={{ color: defenseColor }} />
            <span className="text-sm font-medium">防御型聖杯</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">配分比率</span>
              <span className="font-mono font-bold" style={{ color: defenseColor }}>
                {allocation.defenseRatio}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">ETF数</span>
              <span className="font-mono font-bold text-foreground">
                {allocation.defenseStocks}銘柄
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border">
              低ボラティリティETFを選定
            </div>
          </div>
        </div>
      </div>

      {/* Regime-specific Note */}
      <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border">
        <p className="text-xs text-muted-foreground">
          {regime === 'BULL' && (
            <>
              <span className="font-semibold text-[oklch(0.75_0.2_145)]">好況期</span>
              の判定により、攻撃型への配分を増やしリターンを追求します。
            </>
          )}
          {regime === 'BEAR' && (
            <>
              <span className="font-semibold text-[oklch(0.65_0.25_25)]">不況期</span>
              の判定により、防御型への配分を増やしリスクを抑制します。
            </>
          )}
          {regime === 'NEUTRAL' && (
            <>
              <span className="font-semibold text-[oklch(0.7_0.15_220)]">中立期</span>
              の判定により、バランスの取れた配分を維持します。
            </>
          )}
        </p>
      </div>
    </motion.div>
  );
}
