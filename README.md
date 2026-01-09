# Portfolio Advisor

市場環境適応型ポートフォリオ提案システム

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.0-blue.svg)](https://reactjs.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## 概要

Portfolio Advisorは、市場環境（好況・不況・中立）を自動判定し、最適なポートフォリオ構成を提案する投資支援システムです。元の「聖杯ダッシュボード」のロジックを完全に再現しています。

![システム構成図](docs/architecture-diagram.png)

## 主な機能

### 1. 市場環境判定
- **好況シグナル（3指標）**: SPY vs 10ヶ月移動平均、イールドカーブ、クレジットスプレッド
- **不況シグナル（5指標）**: SPY vs 10ヶ月MA、6ヶ月モメンタム、VIX、イールドカーブ、クレジットスプレッド
- **統計的検証**: 感度84.5%、特異度91.8%、F1スコア0.866

### 2. ポートフォリオ選定

#### 攻撃型聖杯
- **ユニバース**: S&P1500から抽出した100銘柄
- **選定ロジック**: 6か月モメンタム降順でTop5を選定
- **ウェイト**: リスク逆数ウェイト（傾斜配分）

#### 防御型聖杯
- **ユニバース**: 14種類のETF（株式、債券、コモディティ、金）
- **選定ロジック**: 6か月モメンタム降順でTop5を選定
- **ウェイト**: リスク逆数ウェイト（傾斜配分）

### 3. バックテスト
- 過去の市場データを使用したパフォーマンス検証
- 月次リターンの推移グラフ
- 累計リターンの比較

### 4. パフォーマンス追跡
- 月次パフォーマンスの記録
- 攻撃型・防御型の比較分析

## 技術スタック

### フロントエンド
| 技術 | バージョン | 用途 |
|------|-----------|------|
| React | 18.x | UIフレームワーク |
| TypeScript | 5.x | 型安全な開発 |
| Vite | 5.x | ビルドツール |
| TailwindCSS | 3.x | スタイリング |
| Shadcn/ui | - | UIコンポーネント |
| Recharts | 2.x | データ可視化 |
| TanStack Query | 5.x | データフェッチング |

### バックエンド
| 技術 | バージョン | 用途 |
|------|-----------|------|
| Node.js | 22.x | ランタイム |
| tRPC | 11.x | 型安全なAPI |
| Drizzle ORM | - | データベースORM |
| PostgreSQL | 15.x | データベース |

### インフラ
| サービス | 用途 |
|----------|------|
| Manus Platform | ホスティング |
| S3 | ファイルストレージ |
| Forge API | 外部API連携 |

## セットアップ

### 前提条件
- Node.js 22.x以上
- pnpm 9.x以上
- PostgreSQL 15.x以上

### インストール

```bash
# リポジトリをクローン
git clone https://github.com/your-username/portfolio-advisor.git
cd portfolio-advisor

# 依存関係をインストール
pnpm install

# 環境変数を設定
cp .env.example .env
# .envファイルを編集して必要な値を設定

# データベースをセットアップ
pnpm db:push

# 開発サーバーを起動
pnpm dev
```

### 環境変数

```env
# データベース
DATABASE_URL=postgresql://user:password@localhost:5432/portfolio_advisor

# 認証
JWT_SECRET=your-jwt-secret
OAUTH_SERVER_URL=https://your-oauth-server.com

# API
BUILT_IN_FORGE_API_KEY=your-forge-api-key
BUILT_IN_FORGE_API_URL=https://api.forge.com

# フロントエンド
VITE_APP_TITLE=Portfolio Advisor
VITE_FRONTEND_FORGE_API_KEY=your-frontend-api-key
```

## 使用方法

### ダッシュボード
1. トップページで現在の市場環境を確認
2. 好況/不況シグナルの点灯状況を確認
3. 推奨ポジション（攻撃的/防御的）を確認

### 銘柄リスト
1. 「銘柄リスト」タブをクリック
2. 攻撃型聖杯または防御型聖杯を選択
3. 推奨銘柄とウェイトを確認

### バックテスト
1. 「バックテスト」タブをクリック
2. 期間を選択
3. 過去のパフォーマンスを確認

## プロジェクト構造

```
portfolio-advisor/
├── src/                    # フロントエンドソース
│   ├── components/         # UIコンポーネント
│   │   ├── ui/             # 基本UIコンポーネント
│   │   └── ...             # 機能コンポーネント
│   ├── pages/              # ページコンポーネント
│   ├── hooks/              # カスタムフック
│   └── lib/                # ユーティリティ
├── server/                 # バックエンドソース
│   ├── marketData.ts       # 市場データ取得
│   ├── portfolioSelection.ts # 銘柄選定ロジック
│   ├── backtestService.ts  # バックテスト
│   ├── cache.ts            # キャッシュ管理
│   └── __tests__/          # テスト
├── db/                     # データベース
│   └── schema.ts           # スキーマ定義
├── docs/                   # ドキュメント
│   ├── architecture.md     # アーキテクチャ詳細
│   └── architecture-diagram.png # 構成図
└── public/                 # 静的ファイル
```

## 聖杯ロジックの詳細

### 銘柄選定アルゴリズム

```typescript
// 1. 6か月モメンタムを計算
const momentum = (currentPrice - priceAt6MonthsAgo) / priceAt6MonthsAgo;

// 2. リスク（90日最大レンジ比率）を計算
const risk = max(high - low) / close over 90 days;

// 3. モメンタム降順でソート
stocks.sort((a, b) => b.momentum - a.momentum);

// 4. 上位5銘柄を選定
const selected = stocks.slice(0, 5);

// 5. リスク逆数ウェイトを計算
const totalInverseRisk = selected.reduce((sum, s) => sum + 1/s.risk, 0);
const weights = selected.map(s => (1/s.risk) / totalInverseRisk * 100);
```

### キャッシュ戦略

| データ種別 | TTL | 理由 |
|-----------|-----|------|
| 市場分析 | 5分 | リアルタイム性が重要 |
| 個別銘柄 | 15分 | 適度な鮮度を維持 |
| ポートフォリオ推奨 | 1時間 | 計算コストが高い |
| バックテスト | 24時間 | 過去データは不変 |

## テスト

```bash
# 全テストを実行
pnpm test

# テストをウォッチモードで実行
pnpm test:watch

# カバレッジレポートを生成
pnpm test:coverage
```

## API呼び出し状況

キャッシュ実装により、API呼び出しは最小限に抑えられています。

| 項目 | 1日あたり | 月間（22営業日） |
|------|----------|-----------------|
| 市場分析API | 468回 | 10,296回 |
| ポートフォリオAPI | 741回 | 16,302回 |
| **合計** | **1,209回** | **約26,600回** |

## ライセンス

MIT License - 詳細は [LICENSE](LICENSE) を参照してください。

## 貢献

プルリクエストを歓迎します。大きな変更を行う場合は、まずissueを作成して変更内容を議論してください。

## 免責事項

このシステムは投資助言を目的としたものではありません。投資判断は自己責任で行ってください。過去のパフォーマンスは将来の結果を保証するものではありません。
