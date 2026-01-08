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
    getRecommendations: publicProcedure.query(async () => {
      // First get current market regime
      const indicators = await fetchSignalIndicators();
      
      if (!indicators) {
        throw new Error("市場データの取得に失敗しました");
      }

      const regimeData = determineMarketRegime(indicators);
      
      // Get portfolio recommendations
      const recommendations = await getPortfolioRecommendations(regimeData.regime);

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
