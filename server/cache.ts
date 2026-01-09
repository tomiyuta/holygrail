/**
 * サーバーサイドキャッシュモジュール
 * 
 * メモリベースのキャッシュを提供し、API呼び出しを大幅に削減します。
 * キャッシュの有効期限は用途に応じて設定可能です。
 */

interface CacheEntry<T> {
  data: T;
  expiry: number;
  createdAt: number;
}

class ServerCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private hitCount: number = 0;
  private missCount: number = 0;

  /**
   * キャッシュからデータを取得
   * @param key キャッシュキー
   * @returns キャッシュされたデータ、または null
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.missCount++;
      return null;
    }
    
    if (Date.now() > entry.expiry) {
      // 期限切れの場合は削除
      this.cache.delete(key);
      this.missCount++;
      return null;
    }
    
    this.hitCount++;
    return entry.data as T;
  }

  /**
   * データをキャッシュに保存
   * @param key キャッシュキー
   * @param data 保存するデータ
   * @param ttlMs 有効期限（ミリ秒）
   */
  set<T>(key: string, data: T, ttlMs: number): void {
    const entry: CacheEntry<T> = {
      data,
      expiry: Date.now() + ttlMs,
      createdAt: Date.now(),
    };
    this.cache.set(key, entry);
  }

  /**
   * キャッシュからデータを削除
   * @param key キャッシュキー
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * パターンに一致するキーをすべて削除
   * @param pattern 正規表現パターン
   */
  deletePattern(pattern: RegExp): number {
    let deletedCount = 0;
    for (const key of Array.from(this.cache.keys())) {
      if (pattern.test(key)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }
    return deletedCount;
  }

  /**
   * すべてのキャッシュをクリア
   */
  clear(): void {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }

  /**
   * 期限切れのエントリを削除
   */
  cleanup(): number {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (now > entry.expiry) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }
    
    return cleanedCount;
  }

  /**
   * キャッシュ統計を取得
   */
  getStats(): {
    size: number;
    hitCount: number;
    missCount: number;
    hitRate: number;
  } {
    const total = this.hitCount + this.missCount;
    return {
      size: this.cache.size,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate: total > 0 ? this.hitCount / total : 0,
    };
  }

  /**
   * キャッシュまたはフェッチ
   * キャッシュにデータがあれば返し、なければfetchFnを実行してキャッシュに保存
   */
  async getOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlMs: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fetchFn();
    if (data !== null && data !== undefined) {
      this.set(key, data, ttlMs);
    }
    return data;
  }
}

// シングルトンインスタンス
export const serverCache = new ServerCache();

// キャッシュTTL定数（ミリ秒）
// 月次リバランス対応: ポートフォリオは月31日、シグナルは24時間
export const CACHE_TTL = {
  // 市場分析データ: 24時間（毎日06:30に自動更新）
  MARKET_ANALYSIS: 24 * 60 * 60 * 1000,
  
  // 個別銘柄データ: 24時間（毎日06:30に自動更新）
  STOCK_DATA: 24 * 60 * 60 * 1000,
  
  // ポートフォリオ推奨: 31日（毎月1日06:30に自動更新）
  PORTFOLIO_RECOMMENDATIONS: 31 * 24 * 60 * 60 * 1000,
  
  // バックテスト結果: 24時間（過去データは変わらない）
  BACKTEST_RESULTS: 24 * 60 * 60 * 1000,
  
  // シグナル履歴: 24時間（毎日06:30に自動更新）
  SIGNAL_HISTORY: 24 * 60 * 60 * 1000,
  
  // シグナル指標: 24時間（毎日06:30に自動更新）
  SIGNAL_INDICATORS: 24 * 60 * 60 * 1000,
};

// 定期的なクリーンアップ（1時間ごと）
setInterval(() => {
  const cleaned = serverCache.cleanup();
  if (cleaned > 0) {
    console.log(`[Cache] Cleaned up ${cleaned} expired entries`);
  }
}, 60 * 60 * 1000);

// キャッシュキー生成ヘルパー
export function createCacheKey(prefix: string, ...parts: (string | number | undefined)[]): string {
  const validParts = parts.filter(p => p !== undefined);
  return `${prefix}:${validParts.join(':')}`;
}
