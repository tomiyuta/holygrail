import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  signalHistory,
  InsertSignalHistory,
  portfolioRecommendations,
  InsertPortfolioRecommendation,
  alertSubscriptions,
  InsertAlertSubscription,
  dataUpdateHistory,
  InsertDataUpdateHistory,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Signal History Functions

export async function saveSignalHistory(data: Omit<InsertSignalHistory, "id" | "createdAt">): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot save signal history: database not available");
    return;
  }

  try {
    await db.insert(signalHistory).values(data);
  } catch (error) {
    console.error("[Database] Failed to save signal history:", error);
    throw error;
  }
}

export async function getSignalHistory(limit: number = 30) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get signal history: database not available");
    return [];
  }

  try {
    const result = await db
      .select()
      .from(signalHistory)
      .orderBy(desc(signalHistory.date))
      .limit(limit);
    return result;
  } catch (error) {
    console.error("[Database] Failed to get signal history:", error);
    return [];
  }
}

export async function getLatestSignalHistory() {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get latest signal: database not available");
    return null;
  }

  try {
    const result = await db
      .select()
      .from(signalHistory)
      .orderBy(desc(signalHistory.date))
      .limit(1);
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("[Database] Failed to get latest signal:", error);
    return null;
  }
}

// Portfolio Recommendation Functions

export async function savePortfolioRecommendation(
  data: Omit<InsertPortfolioRecommendation, "id" | "createdAt">
): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot save portfolio recommendation: database not available");
    return;
  }

  try {
    await db.insert(portfolioRecommendations).values(data);
  } catch (error) {
    console.error("[Database] Failed to save portfolio recommendation:", error);
    throw error;
  }
}

export async function getLatestPortfolioRecommendations() {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get portfolio recommendations: database not available");
    return { aggressive: null, defensive: null };
  }

  try {
    const aggressive = await db
      .select()
      .from(portfolioRecommendations)
      .where(eq(portfolioRecommendations.type, "aggressive"))
      .orderBy(desc(portfolioRecommendations.date))
      .limit(1);

    const defensive = await db
      .select()
      .from(portfolioRecommendations)
      .where(eq(portfolioRecommendations.type, "defensive"))
      .orderBy(desc(portfolioRecommendations.date))
      .limit(1);

    return {
      aggressive: aggressive.length > 0 ? aggressive[0] : null,
      defensive: defensive.length > 0 ? defensive[0] : null,
    };
  } catch (error) {
    console.error("[Database] Failed to get portfolio recommendations:", error);
    return { aggressive: null, defensive: null };
  }
}

// Alert Subscription Functions

export async function getAlertSubscription(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get alert subscription: database not available");
    return null;
  }

  try {
    const result = await db
      .select()
      .from(alertSubscriptions)
      .where(eq(alertSubscriptions.userId, userId))
      .limit(1);
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("[Database] Failed to get alert subscription:", error);
    return null;
  }
}

export async function updateAlertSubscription(userId: number, enabled: boolean): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update alert subscription: database not available");
    return;
  }

  try {
    const existing = await getAlertSubscription(userId);
    
    if (existing) {
      await db
        .update(alertSubscriptions)
        .set({ enabled: enabled ? 1 : 0 })
        .where(eq(alertSubscriptions.userId, userId));
    } else {
      await db.insert(alertSubscriptions).values({
        userId,
        enabled: enabled ? 1 : 0,
      });
    }
  } catch (error) {
    console.error("[Database] Failed to update alert subscription:", error);
    throw error;
  }
}

export async function updateLastNotifiedRegime(
  userId: number,
  regime: "bull" | "bear" | "neutral"
): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update last notified regime: database not available");
    return;
  }

  try {
    await db
      .update(alertSubscriptions)
      .set({
        lastNotifiedRegime: regime,
        lastNotifiedAt: new Date(),
      })
      .where(eq(alertSubscriptions.userId, userId));
  } catch (error) {
    console.error("[Database] Failed to update last notified regime:", error);
    throw error;
  }
}


// Data Update History Functions

export async function saveDataUpdateHistory(
  data: Omit<InsertDataUpdateHistory, "id" | "createdAt">
): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot save data update history: database not available");
    return;
  }

  try {
    await db.insert(dataUpdateHistory).values(data);
  } catch (error) {
    console.error("[Database] Failed to save data update history:", error);
    throw error;
  }
}

export async function getDataUpdateHistory(limit: number = 20) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get data update history: database not available");
    return [];
  }

  try {
    const result = await db
      .select()
      .from(dataUpdateHistory)
      .orderBy(desc(dataUpdateHistory.createdAt))
      .limit(limit);
    return result;
  } catch (error) {
    console.error("[Database] Failed to get data update history:", error);
    return [];
  }
}

export async function getLatestDataUpdate(updateType?: "signals" | "portfolio" | "all") {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get latest data update: database not available");
    return null;
  }

  try {
    let result;
    
    if (updateType) {
      result = await db
        .select()
        .from(dataUpdateHistory)
        .where(eq(dataUpdateHistory.updateType, updateType))
        .orderBy(desc(dataUpdateHistory.createdAt))
        .limit(1);
    } else {
      result = await db
        .select()
        .from(dataUpdateHistory)
        .orderBy(desc(dataUpdateHistory.createdAt))
        .limit(1);
    }

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("[Database] Failed to get latest data update:", error);
    return null;
  }
}
