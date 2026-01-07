import { motion } from 'framer-motion';
import { ArrowLeft, History as HistoryIcon } from 'lucide-react';
import { Link } from 'wouter';
import { HistoryCard } from '@/components/HistoryCard';
import { AlertSettings } from '@/components/AlertSettings';

export default function History() {
  return (
    <div className="min-h-screen bg-background grid-pattern">
      {/* Header */}
      <div className="bg-card/50 border-b border-border backdrop-blur-sm sticky top-0 z-50">
        <div className="container py-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <button className="p-2 rounded-lg hover:bg-secondary transition-colors">
                <ArrowLeft className="w-5 h-5 text-muted-foreground" />
              </button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <HistoryIcon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">履歴・アラート</h1>
                <p className="text-xs text-muted-foreground">
                  過去のシグナル履歴と通知設定
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <p className="text-muted-foreground text-sm">
            過去の市場環境判定の履歴を確認できます。
            また、市場環境が変化した際に通知を受け取る設定も可能です。
          </p>
        </motion.div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* History - Takes 2 columns */}
          <div className="lg:col-span-2">
            <HistoryCard />
          </div>

          {/* Alert Settings - Takes 1 column */}
          <div>
            <AlertSettings />
          </div>
        </div>

        {/* Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 p-4 rounded-lg bg-muted/50 border border-border"
        >
          <p className="text-xs text-muted-foreground">
            ※ 履歴データは市場分析が実行されるたびに自動的に保存されます。
            通知機能を有効にすると、市場環境が好況から不況、または不況から好況に
            変化した際にお知らせを受け取ることができます。
          </p>
        </motion.div>
      </main>
    </div>
  );
}
