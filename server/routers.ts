import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  fetchSignalIndicators,
  determineMarketRegime,
  calculateAllocation,
} from "./marketData";
import { serverCache } from "./cache";
import { getPortfolioRecommendations } from "./portfolioSelection";
import {
  saveSignalHistory,
  getSignalHistory,
  savePortfolioRecommendation,
  getLatestPortfolioRecommendations,
  getAlertSubscription,
  updateAlertSubscription,
} from "./db";
import { notifyOwner } from "./_core/notification";
import { getAllPerformanceData } from "./performanceData";
import {
  getAvailableDates,
  runBacktestForDate,
} from "./backtestService";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Market analysis router
  market: router({
    /**
     * Get current market analysis with signals and regime detection
     */
    getAnalysis: publicProcedure.query(async () => {
      const indicators = await fetchSignalIndicators();
      
      if (!indicators) {
        throw new Error("市場データの取得に失敗しました");
      }

      const regimeData = determineMarketRegime(indicators);
      const allocation = calculateAllocation(regimeData.regime);

      // Save to history
      await saveSignalHistory({
        date: new Date(),
        regime: regimeData.regime,
        regimeJapanese: regimeData.regimeJapanese,
        confidence: regimeData.confidence.toString(),
        bullCount: regimeData.bullCount,
        bearCount: regimeData.bearCount,
        bullSignals: regimeData.bullSignals,
        bearSignals: regimeData.bearSignals,
        allocation,
      });

      return {
        ...regimeData,
        allocation,
        indicators: {
          spyPrice: indicators.spyPrice,
          spyMA200: indicators.spyMA200,
          spy6MonthReturn: indicators.spy6MonthReturn,
          vix: indicators.vix,
          yieldCurve: indicators.yieldCurve,
        },
        lastUpdated: indicators.lastUpdated,
      };
    }),

    /**
     * Get signal history
     */
    getHistory: publicProcedure
      .input(z.object({
        limit: z.number().min(1).max(100).default(30),
      }).optional())
      .query(async ({ input }) => {
        const limit = input?.limit ?? 30;
        return await getSignalHistory(limit);
      }),
  }),

  // Portfolio router
  portfolio: router({
    /**
     * Get portfolio recommendations based on current market regime
     */
    getRecommendations: publicProcedure
      .input(z.object({
        diversificationCount: z.number().min(3).max(10).optional(),
      }).optional())
      .query(async ({ input }) => {
      // First get current market regime
      const indicators = await fetchSignalIndicators();
      
      if (!indicators) {
        throw new Error("市場データの取得に失敗しました");
      }

      const regimeData = determineMarketRegime(indicators);
      
      // Get portfolio recommendations with optional diversification count
      const recommendations = await getPortfolioRecommendations(
        regimeData.regime,
        input?.diversificationCount
      );

      // Save to database
      await savePortfolioRecommendation({
        date: new Date(),
        type: "aggressive",
        holdings: recommendations.aggressive.holdings,
        totalHoldings: recommendations.aggressive.totalHoldings,
      });

      await savePortfolioRecommendation({
        date: new Date(),
        type: "defensive",
        holdings: recommendations.defensive.holdings,
        totalHoldings: recommendations.defensive.totalHoldings,
      });

      return {
        regime: regimeData.regime,
        regimeJapanese: regimeData.regimeJapanese,
        allocation: calculateAllocation(regimeData.regime),
        aggressive: recommendations.aggressive,
        defensive: recommendations.defensive,
      };
    }),

    /**
     * Get latest saved portfolio recommendations
     */
    getLatest: publicProcedure.query(async () => {
      return await getLatestPortfolioRecommendations();
    }),
  }),

  // Performance data router
  performance: router({
    /**
     * Get monthly performance data for both portfolios
     */
    getMonthlyData: publicProcedure.query(() => {
      return getAllPerformanceData();
    }),
  }),

  // Backtest router
  backtest: router({
    /**
     * Get available dates for backtesting
     */
    getAvailableDates: publicProcedure.query(() => {
      return getAvailableDates();
    }),

    /**
     * Run backtest for a specific date with given diversification count
     */
    run: publicProcedure
      .input(z.object({
        date: z.string(),
        diversificationCount: z.number().min(3).max(10).default(5),
      }))
      .query(async ({ input }) => {
        const result = await runBacktestForDate(input.date, input.diversificationCount);
        if (!result) {
          throw new Error("指定された日付のデータが見つかりません。過去2年以内の日付を選択してください。");
        }
        return result;
      }),
  }),

  // Data refresh router (手動更新機能)
  refresh: router({
    /**
     * Refresh signal indicators (シグナル指標の手動更新)
     * キャッシュをクリアして最新データを取得
     */
    signals: publicProcedure.mutation(async () => {
      // シグナル関連のキャッシュをクリア
      const clearedCount = serverCache.deletePattern(/^(market|signal)/);
      console.log(`[Refresh] Cleared ${clearedCount} signal cache entries`);
      
      // 最新データを取得
      const indicators = await fetchSignalIndicators();
      
      if (!indicators) {
        throw new Error("シグナルデータの更新に失敗しました");
      }

      const regimeData = determineMarketRegime(indicators);
      const allocation = calculateAllocation(regimeData.regime);

      // Save to history
      await saveSignalHistory({
        date: new Date(),
        regime: regimeData.regime,
        regimeJapanese: regimeData.regimeJapanese,
        confidence: regimeData.confidence.toString(),
        bullCount: regimeData.bullCount,
        bearCount: regimeData.bearCount,
        bullSignals: regimeData.bullSignals,
        bearSignals: regimeData.bearSignals,
        allocation,
      });

      return {
        success: true,
        message: "シグナル指標を更新しました",
        updatedAt: new Date().toISOString(),
        regime: regimeData.regime,
        regimeJapanese: regimeData.regimeJapanese,
      };
    }),

    /**
     * Refresh portfolio recommendations (ポートフォリオの手動更新)
     * キャッシュをクリアして最新データを取得
     */
    portfolio: publicProcedure
      .input(z.object({
        diversificationCount: z.number().min(3).max(10).optional(),
      }).optional())
      .mutation(async ({ input }) => {
        // ポートフォリオ関連のキャッシュをクリア
        const clearedCount = serverCache.deletePattern(/^portfolio/);
        console.log(`[Refresh] Cleared ${clearedCount} portfolio cache entries`);
        
        // 最新の市場環境を取得
        const indicators = await fetchSignalIndicators();
        
        if (!indicators) {
          throw new Error("市場データの取得に失敗しました");
        }

        const regimeData = determineMarketRegime(indicators);
        
        // 最新のポートフォリオ推奨を取得
        const recommendations = await getPortfolioRecommendations(
          regimeData.regime,
          input?.diversificationCount
        );

        // Save to database
        await savePortfolioRecommendation({
          date: new Date(),
          type: "aggressive",
          holdings: recommendations.aggressive.holdings,
          totalHoldings: recommendations.aggressive.totalHoldings,
        });

        await savePortfolioRecommendation({
          date: new Date(),
          type: "defensive",
          holdings: recommendations.defensive.holdings,
          totalHoldings: recommendations.defensive.totalHoldings,
        });

        return {
          success: true,
          message: "ポートフォリオを更新しました",
          updatedAt: new Date().toISOString(),
          aggressive: {
            totalHoldings: recommendations.aggressive.totalHoldings,
            usingFallback: recommendations.aggressive.usingFallback,
          },
          defensive: {
            totalHoldings: recommendations.defensive.totalHoldings,
            usingFallback: recommendations.defensive.usingFallback,
          },
        };
      }),

    /**
     * Refresh all data (全データの手動更新)
     * シグナル指標とポートフォリオの両方を更新
     */
    all: publicProcedure
      .input(z.object({
        diversificationCount: z.number().min(3).max(10).optional(),
      }).optional())
      .mutation(async ({ input }) => {
        // 全キャッシュをクリア
        serverCache.clear();
        console.log(`[Refresh] Cleared all cache entries`);
        
        // 最新の市場環境を取得
        const indicators = await fetchSignalIndicators();
        
        if (!indicators) {
          throw new Error("市場データの取得に失敗しました");
        }

        const regimeData = determineMarketRegime(indicators);
        const allocation = calculateAllocation(regimeData.regime);

        // Save signal history
        await saveSignalHistory({
          date: new Date(),
          regime: regimeData.regime,
          regimeJapanese: regimeData.regimeJapanese,
          confidence: regimeData.confidence.toString(),
          bullCount: regimeData.bullCount,
          bearCount: regimeData.bearCount,
          bullSignals: regimeData.bullSignals,
          bearSignals: regimeData.bearSignals,
          allocation,
        });
        
        // 最新のポートフォリオ推奨を取得
        const recommendations = await getPortfolioRecommendations(
          regimeData.regime,
          input?.diversificationCount
        );

        // Save portfolio recommendations
        await savePortfolioRecommendation({
          date: new Date(),
          type: "aggressive",
          holdings: recommendations.aggressive.holdings,
          totalHoldings: recommendations.aggressive.totalHoldings,
        });

        await savePortfolioRecommendation({
          date: new Date(),
          type: "defensive",
          holdings: recommendations.defensive.holdings,
          totalHoldings: recommendations.defensive.totalHoldings,
        });

        return {
          success: true,
          message: "全データを更新しました",
          updatedAt: new Date().toISOString(),
          regime: regimeData.regime,
          regimeJapanese: regimeData.regimeJapanese,
          aggressive: {
            totalHoldings: recommendations.aggressive.totalHoldings,
            usingFallback: recommendations.aggressive.usingFallback,
          },
          defensive: {
            totalHoldings: recommendations.defensive.totalHoldings,
            usingFallback: recommendations.defensive.usingFallback,
          },
        };
      }),

    /**
     * Get cache statistics (キャッシュ統計情報)
     */
    getCacheStats: publicProcedure.query(() => {
      return serverCache.getStats();
    }),
  }),

  // Alert subscription router
  alerts: router({
    /**
     * Get user's alert subscription status
     */
    getSubscription: protectedProcedure.query(async ({ ctx }) => {
      return await getAlertSubscription(ctx.user.id);
    }),

    /**
     * Update alert subscription
     */
    updateSubscription: protectedProcedure
      .input(z.object({
        enabled: z.boolean(),
      }))
      .mutation(async ({ ctx, input }) => {
        await updateAlertSubscription(ctx.user.id, input.enabled);
        return { success: true };
      }),

    /**
     * Send test notification
     */
    testNotification: protectedProcedure.mutation(async ({ ctx }) => {
      const success = await notifyOwner({
        title: "ポートフォリオアドバイザー - テスト通知",
        content: `テスト通知が正常に送信されました。\nユーザー: ${ctx.user.name || ctx.user.email}`,
      });
      return { success };
    }),
  }),
});

export type AppRouter = typeof appRouter;
