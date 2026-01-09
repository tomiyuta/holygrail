# Portfolio Advisor システム構成図

## システム概要

Portfolio Advisorは、市場環境に応じて最適なポートフォリオを提案する投資支援システムです。元の「聖杯ダッシュボード」のロジックを完全に再現しています。

## アーキテクチャ図

```mermaid
graph TB
    subgraph "クライアント層"
        UI[React Frontend<br/>Vite + TypeScript]
        Charts[Recharts<br/>データ可視化]
        TanStack[TanStack Query<br/>クライアントキャッシュ]
    end

    subgraph "API層"
        tRPC[tRPC Router<br/>型安全なAPI]
        Auth[認証モジュール<br/>OAuth + JWT]
    end

    subgraph "ビジネスロジック層"
        Signal[シグナル計算<br/>好況/不況判定]
        Portfolio[ポートフォリオ選定<br/>攻撃型/防御型]
        Backtest[バックテスト<br/>過去データ検証]
        Cache[サーバーキャッシュ<br/>API呼び出し最適化]
    end

    subgraph "データ層"
        DB[(PostgreSQL<br/>Drizzle ORM)]
        S3[(S3 Storage<br/>ファイル保存)]
    end

    subgraph "外部サービス"
        Yahoo[Yahoo Finance API<br/>Forge API経由]
    end

    UI --> TanStack
    UI --> Charts
    TanStack --> tRPC
    tRPC --> Auth
    tRPC --> Signal
    tRPC --> Portfolio
    tRPC --> Backtest
    Signal --> Cache
    Portfolio --> Cache
    Backtest --> Cache
    Cache --> Yahoo
    Signal --> DB
    Portfolio --> DB
    Auth --> DB
    tRPC --> S3
```

## データフロー図

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant UI as フロントエンド
    participant API as tRPC API
    participant Cache as キャッシュ
    participant Yahoo as Yahoo Finance
    participant DB as PostgreSQL

    User->>UI: ページアクセス
    UI->>API: 市場分析リクエスト
    API->>Cache: キャッシュ確認
    
    alt キャッシュヒット
        Cache-->>API: キャッシュデータ
    else キャッシュミス
        API->>Yahoo: 市場データ取得
        Yahoo-->>API: 株価データ
        API->>Cache: キャッシュ保存
    end
    
    API->>DB: シグナル履歴保存
    API-->>UI: 市場分析結果
    UI-->>User: ダッシュボード表示
```

## コンポーネント構成

```mermaid
graph LR
    subgraph "フロントエンド"
        App[App.tsx]
        Dashboard[Dashboard.tsx<br/>メインダッシュボード]
        StockList[StockList.tsx<br/>銘柄リスト]
        Performance[Performance.tsx<br/>パフォーマンス]
        Backtest[BacktestPage.tsx<br/>バックテスト]
    end

    subgraph "バックエンド"
        MarketData[marketData.ts<br/>市場データ取得]
        PortfolioSel[portfolioSelection.ts<br/>銘柄選定]
        BacktestSvc[backtestService.ts<br/>バックテスト]
        CacheMod[cache.ts<br/>キャッシュ管理]
    end

    App --> Dashboard
    App --> StockList
    App --> Performance
    App --> Backtest
    
    Dashboard --> MarketData
    StockList --> PortfolioSel
    Performance --> BacktestSvc
    Backtest --> BacktestSvc
    
    MarketData --> CacheMod
    PortfolioSel --> CacheMod
    BacktestSvc --> CacheMod
```

## 聖杯ロジック詳細

```mermaid
flowchart TD
    subgraph "市場環境判定"
        A[市場データ取得] --> B{好況シグナル}
        B -->|3/3点灯| C[BULL - 好況]
        B -->|0-2点灯| D{不況シグナル}
        D -->|3/5以上点灯| E[BEAR - 不況]
        D -->|0-2点灯| F[NEUTRAL - 中立]
    end

    subgraph "攻撃型聖杯"
        G[100銘柄ユニバース] --> H[6か月モメンタム計算]
        H --> I[モメンタム降順ソート]
        I --> J[上位5銘柄選定]
        J --> K[リスク逆数ウェイト]
    end

    subgraph "防御型聖杯"
        L[14 ETFユニバース] --> M[6か月モメンタム計算]
        M --> N[モメンタム降順ソート]
        N --> O[上位5銘柄選定]
        O --> P[リスク逆数ウェイト]
    end

    C --> G
    C --> L
    E --> G
    E --> L
    F --> G
    F --> L
```

## キャッシュ戦略

| データ種別 | キャッシュTTL | 理由 |
|-----------|-------------|------|
| 市場分析 | 5分 | リアルタイム性が重要 |
| 個別銘柄 | 15分 | 適度な鮮度を維持 |
| ポートフォリオ推奨 | 1時間 | 計算コストが高い |
| バックテスト | 24時間 | 過去データは不変 |

## 技術スタック

### フロントエンド
- **React 18** - UIフレームワーク
- **TypeScript** - 型安全な開発
- **Vite** - 高速ビルドツール
- **TailwindCSS** - ユーティリティファーストCSS
- **Shadcn/ui** - UIコンポーネント
- **Recharts** - チャートライブラリ
- **TanStack Query** - データフェッチング

### バックエンド
- **Node.js** - ランタイム
- **tRPC** - 型安全なAPI
- **Drizzle ORM** - データベースORM
- **PostgreSQL** - データベース

### インフラ
- **Manus Platform** - ホスティング
- **S3** - ファイルストレージ
- **Forge API** - 外部API連携

## ディレクトリ構造

```
portfolio-advisor/
├── src/                    # フロントエンドソース
│   ├── components/         # UIコンポーネント
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
│   └── architecture.md     # 本ファイル
└── public/                 # 静的ファイル
```
