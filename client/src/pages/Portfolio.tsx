import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Briefcase, Settings2 } from 'lucide-react';
import { Link } from 'wouter';
import { PortfolioList } from '@/components/PortfolioList';
import { useMarketSignals } from '@/hooks/useMarketSignals';

export default function Portfolio() {
  const { analysis } = useMarketSignals();
  const [diversificationCount, setDiversificationCount] = useState<number>(5);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  return (
    <div className="min-h-screen bg-background grid-pattern">
      {/* Header */}
      <div className="bg-card/50 border-b border-border backdrop-blur-sm sticky top-0 z-50">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <button className="p-2 rounded-lg hover:bg-secondary transition-colors">
                  <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                </button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Briefcase className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-foreground">推奨銘柄リスト</h1>
                  <p className="text-xs text-muted-foreground">
                    現在の市場環境に基づく具体的な銘柄選定
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* Settings Toggle */}
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  showSettings 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-secondary hover:bg-secondary/80 text-foreground'
                }`}
              >
                <Settings2 className="w-4 h-4" />
                <span className="text-sm font-medium">分散数設定</span>
              </button>
              
              {analysis && (
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">現在の市場環境</div>
                  <div 
                    className="font-mono font-semibold"
                    style={{ 
                      color: analysis.regime === 'bull' 
                        ? 'oklch(0.75 0.2 145)' 
                        : analysis.regime === 'bear'
                        ? 'oklch(0.65 0.25 25)'
                        : 'oklch(0.7 0.15 220)'
                    }}
                  >
                    {analysis.regimeJapanese}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container py-6">
        {/* Settings Panel */}
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6"
          >
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="text-purple-400">📊</span>
                分散数設定
              </h3>
              <p className="text-muted-foreground text-sm mb-4">
                攻撃型ポートフォリオの銘柄数を設定します。分散数を増やすと個別銘柄リスクは低下しますが、モメンタム効果も薄まります。
              </p>
              <div className="flex items-center gap-6">
                <input
                  type="range"
                  min="3"
                  max="10"
                  value={diversificationCount}
                  onChange={(e) => setDiversificationCount(parseInt(e.target.value))}
                  className="flex-1 h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <div className="bg-secondary px-4 py-2 rounded-lg min-w-[80px] text-center">
                  <span className="text-2xl font-bold text-purple-400">{diversificationCount}</span>
                  <span className="text-muted-foreground text-sm ml-1">銘柄</span>
                </div>
              </div>
              <div className="flex justify-between text-muted-foreground text-xs mt-2">
                <span>3銘柄（集中投資）</span>
                <span>10銘柄（分散投資）</span>
              </div>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <p className="text-muted-foreground text-sm">
            市場環境に応じて、攻撃型（モメンタム戦略）と防御型（低ボラティリティ戦略）の
            具体的な銘柄リストを提案します。各銘柄のウェイトは戦略に基づいて計算されています。
          </p>
        </motion.div>

        {/* Portfolio Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PortfolioList type="aggressive" diversificationCount={diversificationCount} />
          <PortfolioList type="defensive" />
        </div>

        {/* Disclaimer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 p-4 rounded-lg bg-muted/50 border border-border"
        >
          <p className="text-xs text-muted-foreground">
            ※ 本システムは投資助言を目的としたものではありません。
            表示される銘柄リストは過去のデータに基づく参考情報であり、
            将来のパフォーマンスを保証するものではありません。
            投資判断は自己責任でお願いします。
          </p>
        </motion.div>
      </main>
    </div>
  );
}
