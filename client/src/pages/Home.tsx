/**
 * Design Style: Financial Terminal (Bloomberg-inspired)
 * - Dark theme with neon green (#00ff88) and cyan (#00d4ff) accents
 * - High data density with grid-based widget layout
 * - Real-time feel with pulse animations and scanline effects
 * - Professional, institutional-grade appearance
 */

import { motion } from 'framer-motion';
import { Loader2, AlertCircle } from 'lucide-react';
import { useMarketSignals } from '@/hooks/useMarketSignals';
import { StatusBar } from '@/components/StatusBar';
import { RegimeIndicator } from '@/components/RegimeIndicator';
import { SignalCard } from '@/components/SignalCard';
import { AllocationCard } from '@/components/AllocationCard';
import { StatsCard } from '@/components/StatsCard';
import { RulesCard } from '@/components/RulesCard';

export default function Home() {
  const { analysis, loading, error, refresh } = useMarketSignals();

  if (loading && !analysis) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground font-mono text-sm">
            市場データを分析中...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-4" />
          <p className="text-destructive font-mono text-sm">{error}</p>
          <button 
            onClick={refresh}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm"
          >
            再試行
          </button>
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className="min-h-screen bg-background grid-pattern">
      {/* Status Bar */}
      <StatusBar
        regime={analysis.regime}
        regimeJapanese={analysis.regimeJapanese}
        confidence={analysis.confidence}
        lastUpdated={analysis.lastUpdated}
        onRefresh={refresh}
        loading={loading}
      />

      {/* Main Content */}
      <main className="container py-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl font-bold text-foreground mb-2">
            市場環境適応型ポートフォリオ提案システム
          </h1>
          <p className="text-muted-foreground text-sm">
            好況・不況シグナルに基づいて市場環境を判定し、最適なポートフォリオ構成を提案します
          </p>
        </motion.div>

        {/* Main Grid */}
        <div className="grid grid-cols-12 gap-4">
          {/* Left Column - Regime Indicator */}
          <div className="col-span-12 lg:col-span-8">
            <RegimeIndicator
              regime={analysis.regime}
              regimeJapanese={analysis.regimeJapanese}
              confidence={analysis.confidence}
              bullCount={analysis.bullCount}
              bearCount={analysis.bearCount}
            />
          </div>

          {/* Right Column - Stats */}
          <div className="col-span-12 lg:col-span-4 space-y-4">
            <StatsCard
              title="バックテスト実績"
              icon="chart"
              stats={[
                { label: '年率リターン', value: '+18.8%', color: 'oklch(0.75 0.2 145)' },
                { label: 'シャープレシオ', value: '1.29' },
                { label: '最大DD', value: '-22.5%', color: 'oklch(0.65 0.25 25)' },
              ]}
            />
            <StatsCard
              title="統計的検証"
              icon="target"
              stats={[
                { label: '好況シグナル感度', value: '84.5%' },
                { label: '不況シグナル特異度', value: '91.8%' },
                { label: 'F1スコア', value: '0.866' },
              ]}
            />
          </div>

          {/* Signal Cards Row */}
          <div className="col-span-12 lg:col-span-6">
            <SignalCard
              title="好況シグナル"
              subtitle="高感度（機会損失の最小化）"
              signals={analysis.bullSignals}
              type="bull"
              activeCount={analysis.bullCount}
              totalCount={3}
            />
          </div>
          <div className="col-span-12 lg:col-span-6">
            <SignalCard
              title="不況シグナル"
              subtitle="高特異度（リスク回避）"
              signals={analysis.bearSignals}
              type="bear"
              activeCount={analysis.bearCount}
              totalCount={5}
            />
          </div>

          {/* Allocation Card */}
          <div className="col-span-12 lg:col-span-8">
            <AllocationCard
              allocation={analysis.allocation}
              regime={analysis.regime}
            />
          </div>

          {/* Rules Card */}
          <div className="col-span-12 lg:col-span-4">
            <RulesCard />
          </div>
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 pt-6 border-t border-border"
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div>
              <p>※ 本システムは投資助言を目的としたものではありません。投資判断は自己責任でお願いします。</p>
            </div>
            <div className="font-mono">
              v1.0.0 | CPCV検証済み
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
