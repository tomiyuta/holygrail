# コスト削減策の詳細実装ガイド

**作成日**: 2026年1月9日  
**作成者**: Manus AI

---

## 1. クライアントサイドキャッシュ

### 1.1 概要

ブラウザ側でAPIレスポンスをキャッシュし、同一ユーザーの連続アクセスでサーバーへのリクエストを削減します。

### 1.2 実装方法

現在のシステムはReact QueryとtRPCを使用しているため、React Queryのキャッシュ設定を最適化します。

**Step 1: QueryClientの設定変更**

```typescript
// client/src/main.tsx または trpc.ts

import { QueryClient } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // データが「新鮮」とみなされる時間（この間はAPIを呼び出さない）
      staleTime: 5 * 60 * 1000, // 5分
      
      // キャッシュがメモリに保持される時間
      gcTime: 60 * 60 * 1000, // 1時間（旧cacheTime）
      
      // バックグラウンドでの再取得を無効化
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      
      // リトライ回数を制限
      retry: 1,
    },
  },
});
```

**Step 2: エンドポイント別のキャッシュ設定**

```typescript
// 市場分析データ（5分キャッシュ）
const { data: marketData } = trpc.market.getAnalysis.useQuery(undefined, {
  staleTime: 5 * 60 * 1000,
});

// ポートフォリオ推奨（1時間キャッシュ）
const { data: portfolioData } = trpc.portfolio.getRecommendations.useQuery(
  { diversificationCount },
  {
    staleTime: 60 * 60 * 1000,
  }
);

// バックテスト結果（24時間キャッシュ - 過去データは変わらない）
const { data: backtestData } = trpc.backtest.run.useQuery(
  { date, diversificationCount },
  {
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 7 * 24 * 60 * 60 * 1000, // 1週間保持
  }
);
```

**Step 3: LocalStorageへの永続化（オプション）**

```typescript
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'portfolio-advisor-cache',
});

persistQueryClient({
  queryClient,
  persister,
  maxAge: 24 * 60 * 60 * 1000, // 24時間
});
```

### 1.3 メリット・デメリット

| 項目 | 内容 |
|------|------|
| **メリット** | |
| 実装が簡単 | 設定変更のみで実装可能（0.5日） |
| 即座に効果 | デプロイ後すぐに効果が現れる |
| UX向上 | ページ遷移が高速化 |
| オフライン対応 | LocalStorage永続化でオフラインでも表示可能 |
| **デメリット** | |
| 効果が限定的 | 同一ユーザーの連続アクセスのみ削減（30-50%） |
| 新規ユーザーには効果なし | 初回アクセス時は必ずAPIを呼び出す |
| データの鮮度 | キャッシュ期間中は古いデータが表示される可能性 |
| ブラウザ依存 | ブラウザを閉じるとキャッシュが消える（永続化しない場合） |

### 1.4 期待効果

| 指標 | 削減効果 |
|------|----------|
| 同一ユーザーの2回目以降のアクセス | 100%削減 |
| 全体のAPI呼び出し | 30-50%削減（リピートユーザー率に依存） |

---

## 2. 銘柄ユニバースの最適化

### 2.1 概要

100銘柄の全量取得から、段階的・優先度ベースの取得に変更し、必要最小限のAPI呼び出しに抑えます。

### 2.2 実装方法

**Step 1: 優先度別銘柄リストの定義**

```typescript
// server/marketData.ts

// Tier 1: 常に取得（過去の選定実績が高い銘柄）
export const TIER1_SYMBOLS = [
  "SNDK", "WDC", "WBD", "MU", "ALB", "TER", "APP", "STX", "FIX", "LRCX",
  "GOOGL", "GOOG", "NEM", "GLW", "INTC", "CHRW", "EXPE", "IVZ", "FSLR", "AMD"
]; // 20銘柄

// Tier 2: 詳細モードで取得
export const TIER2_SYMBOLS = [
  "GM", "CMI", "TPR", "CAT", "REGN", "INCY", "TSLA", "DAL", "AMAT", "APH",
  "UAL", "HII", "LLY", "IQV", "LVS", "KLAC", "TMO", "BIIB", "VTRS", "PLTR",
  "C", "TEL", "DD", "ANET", "ROST", "CRH", "JNJ", "AES", "AVGO", "HAL"
]; // 30銘柄

// Tier 3: フル分析モードでのみ取得
export const TIER3_SYMBOLS = SEIHAI_SYMBOLS.slice(50); // 残り50銘柄
```

**Step 2: 段階的取得ロジックの実装**

```typescript
// server/portfolioSelection.ts

export type FetchMode = 'quick' | 'standard' | 'full';

export async function selectAggressivePortfolio(
  regime: "bull" | "bear" | "neutral",
  diversificationCount: number = 5,
  fetchMode: FetchMode = 'standard'
): Promise<PortfolioSelection> {
  
  let symbolsToFetch: string[];
  
  switch (fetchMode) {
    case 'quick':
      // クイックモード: 上位20銘柄のみ（20 API呼び出し）
      symbolsToFetch = TIER1_SYMBOLS;
      break;
    case 'standard':
      // 標準モード: 上位50銘柄（50 API呼び出し）
      symbolsToFetch = [...TIER1_SYMBOLS, ...TIER2_SYMBOLS];
      break;
    case 'full':
      // フルモード: 全100銘柄（100 API呼び出し）
      symbolsToFetch = SEIHAI_SYMBOLS;
      break;
  }
  
  // 以下、既存のロジック
  const stockDataPromises = symbolsToFetch.map(symbol => 
    fetchStockChart(symbol, "6mo", "1d")
  );
  // ...
}
```

**Step 3: APIエンドポイントの修正**

```typescript
// server/routers.ts

portfolio: router({
  getRecommendations: publicProcedure
    .input(z.object({
      diversificationCount: z.number().min(3).max(10).optional(),
      fetchMode: z.enum(['quick', 'standard', 'full']).optional(),
    }).optional())
    .query(async ({ input }) => {
      const fetchMode = input?.fetchMode ?? 'standard';
      // ...
    }),
}),
```

**Step 4: UIの調整**

```tsx
// client/src/pages/Portfolio.tsx

const [fetchMode, setFetchMode] = useState<'quick' | 'standard' | 'full'>('standard');

return (
  <div>
    <select value={fetchMode} onChange={(e) => setFetchMode(e.target.value)}>
      <option value="quick">クイック（20銘柄）</option>
      <option value="standard">標準（50銘柄）</option>
      <option value="full">フル分析（100銘柄）</option>
    </select>
  </div>
);
```

### 2.3 メリット・デメリット

| 項目 | 内容 |
|------|------|
| **メリット** | |
| 大幅なコスト削減 | クイックモードで80%削減 |
| 柔軟性 | ユーザーが必要に応じてモードを選択可能 |
| レスポンス向上 | クイックモードは5倍高速 |
| 段階的な情報提供 | 必要な情報だけを取得 |
| **デメリット** | |
| 精度の低下リスク | クイックモードでは最適な銘柄を見逃す可能性 |
| UI複雑化 | モード選択のUIが必要 |
| 実装コスト | 中程度の実装工数（2-3日） |
| 銘柄選定の一貫性 | モードによって結果が異なる可能性 |

### 2.4 期待効果

| モード | API呼び出し | 削減率 | 精度 |
|--------|-------------|--------|------|
| クイック | 20回 | 80% | 中（上位銘柄のみ） |
| 標準 | 50回 | 50% | 高（主要銘柄カバー） |
| フル | 100回 | 0% | 最高（全銘柄分析） |

---

## 3. 定期バッチ処理

### 3.1 概要

市場データの取得をリアルタイムから定期バッチ処理に変更し、データベースに保存したデータを提供します。

### 3.2 実装方法

**Step 1: データベーススキーマの拡張**

```typescript
// drizzle/schema.ts

export const stockDataCache = pgTable("stock_data_cache", {
  id: serial("id").primaryKey(),
  symbol: varchar("symbol", { length: 10 }).notNull(),
  date: date("date").notNull(),
  openPrice: decimal("open_price", { precision: 10, scale: 4 }),
  highPrice: decimal("high_price", { precision: 10, scale: 4 }),
  lowPrice: decimal("low_price", { precision: 10, scale: 4 }),
  closePrice: decimal("close_price", { precision: 10, scale: 4 }),
  adjClose: decimal("adj_close", { precision: 10, scale: 4 }),
  volume: bigint("volume", { mode: "number" }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const calculatedMetrics = pgTable("calculated_metrics", {
  id: serial("id").primaryKey(),
  symbol: varchar("symbol", { length: 10 }).notNull(),
  calculationDate: date("calculation_date").notNull(),
  momentum6m: decimal("momentum_6m", { precision: 10, scale: 6 }),
  risk90d: decimal("risk_90d", { precision: 10, scale: 6 }),
  currentPrice: decimal("current_price", { precision: 10, scale: 4 }),
  createdAt: timestamp("created_at").defaultNow(),
});
```

**Step 2: バッチ処理スクリプトの作成**

```typescript
// server/batch/dailyDataFetch.ts

import { SEIHAI_SYMBOLS, DEFENSIVE_ETFS, fetchStockChart } from "../marketData";
import { db } from "../db";
import { stockDataCache, calculatedMetrics } from "../../drizzle/schema";

export async function runDailyDataFetch() {
  console.log("Starting daily data fetch...");
  const today = new Date().toISOString().split('T')[0];
  
  // 全銘柄のデータを取得
  const allSymbols = [...SEIHAI_SYMBOLS, ...DEFENSIVE_ETFS.map(e => e.symbol)];
  
  for (const symbol of allSymbols) {
    try {
      const data = await fetchStockChart(symbol, "9mo", "1d");
      if (!data) continue;
      
      // 価格データを保存
      for (const price of data.prices) {
        await db.insert(stockDataCache).values({
          symbol,
          date: price.date.toISOString().split('T')[0],
          openPrice: price.open.toString(),
          highPrice: price.high.toString(),
          lowPrice: price.low.toString(),
          closePrice: price.close.toString(),
          adjClose: price.adjClose.toString(),
          volume: price.volume,
        }).onConflictDoUpdate({
          target: [stockDataCache.symbol, stockDataCache.date],
          set: {
            closePrice: price.close.toString(),
            adjClose: price.adjClose.toString(),
          },
        });
      }
      
      // メトリクスを計算して保存
      const momentum = calculateMomentum(data.prices);
      const risk = calculateRisk(data.prices);
      
      await db.insert(calculatedMetrics).values({
        symbol,
        calculationDate: today,
        momentum6m: momentum.toString(),
        risk90d: risk.toString(),
        currentPrice: data.currentPrice.toString(),
      }).onConflictDoUpdate({
        target: [calculatedMetrics.symbol, calculatedMetrics.calculationDate],
        set: {
          momentum6m: momentum.toString(),
          risk90d: risk.toString(),
          currentPrice: data.currentPrice.toString(),
        },
      });
      
      // レート制限対策
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`Error fetching ${symbol}:`, error);
    }
  }
  
  console.log("Daily data fetch completed.");
}
```

**Step 3: cronジョブの設定**

```typescript
// server/batch/scheduler.ts

import cron from 'node-cron';
import { runDailyDataFetch } from './dailyDataFetch';

// 毎日6:00 AM（日本時間）に実行 = UTC 21:00
cron.schedule('0 21 * * *', async () => {
  console.log('Running scheduled daily data fetch...');
  await runDailyDataFetch();
});

// 手動実行用エンドポイント（管理者のみ）
export async function triggerManualFetch() {
  await runDailyDataFetch();
}
```

**Step 4: APIエンドポイントの修正**

```typescript
// server/portfolioSelection.ts

export async function selectAggressivePortfolioFromCache(
  regime: "bull" | "bear" | "neutral",
  diversificationCount: number = 5
): Promise<PortfolioSelection> {
  
  const today = new Date().toISOString().split('T')[0];
  
  // データベースからメトリクスを取得（API呼び出しなし）
  const metrics = await db.select()
    .from(calculatedMetrics)
    .where(eq(calculatedMetrics.calculationDate, today))
    .orderBy(desc(calculatedMetrics.momentum6m))
    .limit(diversificationCount);
  
  // ウェイト計算
  const totalInverseRisk = metrics.reduce(
    (sum, m) => sum + (1 / parseFloat(m.risk90d)),
    0
  );
  
  const holdings = metrics.map(m => ({
    symbol: m.symbol,
    name: m.symbol, // 別途名前を取得する必要あり
    weight: ((1 / parseFloat(m.risk90d)) / totalInverseRisk) * 100,
    momentum: parseFloat(m.momentum6m) * 100,
    volatility: parseFloat(m.risk90d),
  }));
  
  return {
    type: "aggressive",
    holdings,
    totalHoldings: holdings.length,
    calculatedAt: new Date(),
  };
}
```

### 3.3 メリット・デメリット

| 項目 | 内容 |
|------|------|
| **メリット** | |
| 最大のコスト削減 | 99%削減（1日1回のみAPI呼び出し） |
| 高速レスポンス | データベースからの読み取りは数ミリ秒 |
| 安定性 | APIの障害やレート制限の影響を受けにくい |
| 履歴データの蓄積 | 過去データが自動的に蓄積される |
| バックテスト高速化 | 過去データがDBにあるため即座に実行可能 |
| **デメリット** | |
| 実装コスト高 | 3-5日の実装期間が必要 |
| データの鮮度 | 最大24時間遅れのデータになる |
| ストレージコスト | データベース容量が増加 |
| 運用の複雑化 | バッチ処理の監視・エラーハンドリングが必要 |
| 初期データ投入 | 過去データの初期投入が必要 |

### 3.4 期待効果

| 指標 | 現在 | 導入後 | 削減率 |
|------|------|--------|--------|
| API呼び出し/日 | 8,600回 | 約120回 | 99% |
| レスポンス時間 | 5-10秒 | 50-100ms | 99% |
| データ鮮度 | リアルタイム | 最大24時間遅れ | - |

---

## 4. 比較サマリー

| 項目 | クライアントキャッシュ | 銘柄最適化 | 定期バッチ |
|------|----------------------|-----------|-----------|
| **削減効果** | 30-50% | 50-80% | 99% |
| **実装期間** | 0.5日 | 2-3日 | 3-5日 |
| **実装難易度** | 低 | 中 | 高 |
| **データ鮮度** | 5分〜1時間遅れ | リアルタイム | 最大24時間遅れ |
| **UX影響** | 向上 | 選択肢増加 | 大幅向上 |
| **運用負荷** | なし | なし | 監視必要 |
| **推奨ユースケース** | リピートユーザー多い | 精度と速度のバランス | 大規模運用 |

---

## 5. 推奨実装戦略

### 短期（1週間以内）

1. **サーバーサイドキャッシュ**（提案1）を実装
2. **クライアントサイドキャッシュ**を最適化

これにより、最小の労力で95%以上のコスト削減を達成できます。

### 中期（1ヶ月以内）

3. **銘柄ユニバースの最適化**を実装

ユーザーに選択肢を提供し、さらなるコスト削減と柔軟性を実現します。

### 長期（3ヶ月以内）

4. **定期バッチ処理**を実装

大規模運用に備え、最大限のコスト削減と安定性を確保します。

---

*本ガイドは現在のシステム構成に基づいて作成されました。実際の実装時には、システムの状態やビジネス要件に応じて調整が必要な場合があります。*
