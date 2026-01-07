import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, CheckCircle2, XCircle } from 'lucide-react';
import { Signal } from '@/hooks/useMarketSignals';

interface SignalCardProps {
  title: string;
  subtitle: string;
  signals: Signal[];
  type: 'bull' | 'bear';
  activeCount: number;
  totalCount: number;
}

export function SignalCard({ title, subtitle, signals, type, activeCount, totalCount }: SignalCardProps) {
  const isBull = type === 'bull';
  const primaryColor = isBull ? 'oklch(0.75 0.2 145)' : 'oklch(0.65 0.25 25)';
  const Icon = isBull ? TrendingUp : TrendingDown;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="terminal-card"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div 
            className="p-2 rounded-lg"
            style={{ backgroundColor: `color-mix(in oklch, ${primaryColor} 15%, transparent)` }}
          >
            <Icon className="w-5 h-5" style={{ color: primaryColor }} />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <div className="text-right">
          <div 
            className="text-2xl font-mono font-bold"
            style={{ color: primaryColor }}
          >
            {activeCount}/{totalCount}
          </div>
          <p className="text-xs text-muted-foreground">点灯中</p>
        </div>
      </div>

      {/* Signals List */}
      <div className="space-y-2">
        {signals.map((signal, index) => {
          const isActive = signal.active;
          
          return (
            <motion.div
              key={signal.name}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                isActive 
                  ? 'bg-secondary/50 border-border' 
                  : 'bg-transparent border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                {isActive ? (
                  <CheckCircle2 className="w-4 h-4" style={{ color: primaryColor }} />
                ) : (
                  <XCircle className="w-4 h-4 text-muted-foreground/50" />
                )}
                <div>
                  <p className={`text-sm font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {signal.name}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {signal.value}
                  </p>
                </div>
              </div>
              <div 
                className={`px-2 py-0.5 rounded text-xs font-mono ${
                  isActive 
                    ? 'bg-opacity-20' 
                    : 'bg-muted text-muted-foreground'
                }`}
                style={isActive ? { 
                  backgroundColor: `color-mix(in oklch, ${primaryColor} 20%, transparent)`,
                  color: primaryColor 
                } : {}}
              >
                {isActive ? (isBull ? '好況' : '不況') : '非点灯'}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
