import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, json, bigint } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Market data cache table - stores daily market data for signals calculation
 */
export const marketData = mysqlTable("market_data", {
  id: int("id").autoincrement().primaryKey(),
  symbol: varchar("symbol", { length: 10 }).notNull(),
  date: timestamp("date").notNull(),
  open: decimal("open", { precision: 12, scale: 4 }),
  high: decimal("high", { precision: 12, scale: 4 }),
  low: decimal("low", { precision: 12, scale: 4 }),
  close: decimal("close", { precision: 12, scale: 4 }).notNull(),
  volume: bigint("volume", { mode: "number" }),
  adjClose: decimal("adjClose", { precision: 12, scale: 4 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MarketData = typeof marketData.$inferSelect;
export type InsertMarketData = typeof marketData.$inferInsert;

/**
 * Signal history table - stores market regime signals over time
 */
export const signalHistory = mysqlTable("signal_history", {
  id: int("id").autoincrement().primaryKey(),
  date: timestamp("date").notNull(),
  regime: mysqlEnum("regime", ["bull", "bear", "neutral"]).notNull(),
  regimeJapanese: varchar("regimeJapanese", { length: 20 }).notNull(),
  confidence: decimal("confidence", { precision: 5, scale: 2 }).notNull(),
  bullCount: int("bullCount").notNull(),
  bearCount: int("bearCount").notNull(),
  bullSignals: json("bullSignals").$type<{
    name: string;
    active: boolean;
    value: string;
    description: string;
  }[]>().notNull(),
  bearSignals: json("bearSignals").$type<{
    name: string;
    active: boolean;
    value: string;
    description: string;
  }[]>().notNull(),
  allocation: json("allocation").$type<{
    aggressive: number;
    defensive: number;
  }>().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SignalHistory = typeof signalHistory.$inferSelect;
export type InsertSignalHistory = typeof signalHistory.$inferInsert;

/**
 * Portfolio recommendations table - stores selected stocks/ETFs for each regime
 */
export const portfolioRecommendations = mysqlTable("portfolio_recommendations", {
  id: int("id").autoincrement().primaryKey(),
  date: timestamp("date").notNull(),
  type: mysqlEnum("type", ["aggressive", "defensive"]).notNull(),
  holdings: json("holdings").$type<{
    symbol: string;
    name: string;
    weight: number;
    momentum?: number;
    volatility?: number;
  }[]>().notNull(),
  totalHoldings: int("totalHoldings").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PortfolioRecommendation = typeof portfolioRecommendations.$inferSelect;
export type InsertPortfolioRecommendation = typeof portfolioRecommendations.$inferInsert;

/**
 * Alert subscriptions table - stores user notification preferences
 */
export const alertSubscriptions = mysqlTable("alert_subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  enabled: int("enabled").default(1).notNull(),
  lastNotifiedRegime: mysqlEnum("lastNotifiedRegime", ["bull", "bear", "neutral"]),
  lastNotifiedAt: timestamp("lastNotifiedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AlertSubscription = typeof alertSubscriptions.$inferSelect;
export type InsertAlertSubscription = typeof alertSubscriptions.$inferInsert;
