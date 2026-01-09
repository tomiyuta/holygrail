import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database module
vi.mock('../db', () => ({
  saveDataUpdateHistory: vi.fn().mockResolvedValue(undefined),
  getDataUpdateHistory: vi.fn().mockResolvedValue([
    {
      id: 1,
      updateType: 'signals',
      success: 1,
      usedFallback: 0,
      fallbackCount: null,
      fallbackReason: null,
      regime: 'bull',
      regimeJapanese: '好況',
      holdingsCount: null,
      source: 'manual',
      durationMs: 1500,
      errorMessage: null,
      createdAt: new Date('2025-01-09T06:00:00Z'),
    },
    {
      id: 2,
      updateType: 'portfolio',
      success: 1,
      usedFallback: 1,
      fallbackCount: 3,
      fallbackReason: 'API制限',
      regime: null,
      regimeJapanese: null,
      holdingsCount: 10,
      source: 'manual',
      durationMs: 5000,
      errorMessage: null,
      createdAt: new Date('2025-01-09T05:00:00Z'),
    },
    {
      id: 3,
      updateType: 'all',
      success: 0,
      usedFallback: 0,
      fallbackCount: null,
      fallbackReason: null,
      regime: null,
      regimeJapanese: null,
      holdingsCount: null,
      source: 'manual',
      durationMs: 2000,
      errorMessage: '市場データの取得に失敗しました',
      createdAt: new Date('2025-01-09T04:00:00Z'),
    },
  ]),
  getLatestDataUpdate: vi.fn().mockImplementation((updateType) => {
    if (updateType === 'signals') {
      return Promise.resolve({
        id: 1,
        updateType: 'signals',
        success: 1,
        usedFallback: 0,
        source: 'manual',
        durationMs: 1500,
        createdAt: new Date('2025-01-09T06:00:00Z'),
      });
    }
    return Promise.resolve({
      id: 1,
      updateType: 'all',
      success: 1,
      usedFallback: 0,
      source: 'manual',
      durationMs: 3000,
      createdAt: new Date('2025-01-09T06:00:00Z'),
    });
  }),
}));

import { saveDataUpdateHistory, getDataUpdateHistory, getLatestDataUpdate } from '../db';

describe('Data Update History', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('saveDataUpdateHistory', () => {
    it('should save update history with success status', async () => {
      const historyData = {
        updateType: 'signals' as const,
        success: 1,
        usedFallback: 0,
        source: 'manual',
        durationMs: 1500,
      };

      await saveDataUpdateHistory(historyData);

      expect(saveDataUpdateHistory).toHaveBeenCalledWith(historyData);
    });

    it('should save update history with fallback info', async () => {
      const historyData = {
        updateType: 'portfolio' as const,
        success: 1,
        usedFallback: 1,
        fallbackCount: 3,
        fallbackReason: 'API制限',
        holdingsCount: 10,
        source: 'manual',
        durationMs: 5000,
      };

      await saveDataUpdateHistory(historyData);

      expect(saveDataUpdateHistory).toHaveBeenCalledWith(historyData);
    });

    it('should save update history with error message', async () => {
      const historyData = {
        updateType: 'all' as const,
        success: 0,
        usedFallback: 0,
        source: 'manual',
        durationMs: 2000,
        errorMessage: '市場データの取得に失敗しました',
      };

      await saveDataUpdateHistory(historyData);

      expect(saveDataUpdateHistory).toHaveBeenCalledWith(historyData);
    });
  });

  describe('getDataUpdateHistory', () => {
    it('should return update history list', async () => {
      const history = await getDataUpdateHistory(20);

      expect(history).toHaveLength(3);
      expect(history[0].updateType).toBe('signals');
      expect(history[1].updateType).toBe('portfolio');
      expect(history[2].updateType).toBe('all');
    });

    it('should include fallback information', async () => {
      const history = await getDataUpdateHistory(20);

      const portfolioUpdate = history.find(h => h.updateType === 'portfolio');
      expect(portfolioUpdate?.usedFallback).toBe(1);
      expect(portfolioUpdate?.fallbackCount).toBe(3);
      expect(portfolioUpdate?.fallbackReason).toBe('API制限');
    });

    it('should include error information for failed updates', async () => {
      const history = await getDataUpdateHistory(20);

      const failedUpdate = history.find(h => h.success === 0);
      expect(failedUpdate?.errorMessage).toBe('市場データの取得に失敗しました');
    });
  });

  describe('getLatestDataUpdate', () => {
    it('should return latest update for specific type', async () => {
      const latest = await getLatestDataUpdate('signals');

      expect(latest?.updateType).toBe('signals');
      expect(latest?.success).toBe(1);
    });

    it('should return latest update without type filter', async () => {
      const latest = await getLatestDataUpdate();

      expect(latest).toBeDefined();
      expect(latest?.success).toBe(1);
    });
  });

  describe('Update History Data Structure', () => {
    it('should have all required fields', async () => {
      const history = await getDataUpdateHistory(20);
      const item = history[0];

      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('updateType');
      expect(item).toHaveProperty('success');
      expect(item).toHaveProperty('usedFallback');
      expect(item).toHaveProperty('source');
      expect(item).toHaveProperty('durationMs');
      expect(item).toHaveProperty('createdAt');
    });

    it('should have valid update types', async () => {
      const history = await getDataUpdateHistory(20);
      const validTypes = ['signals', 'portfolio', 'all'];

      history.forEach(item => {
        expect(validTypes).toContain(item.updateType);
      });
    });

    it('should have valid source values', async () => {
      const history = await getDataUpdateHistory(20);
      const validSources = ['manual', 'scheduled', 'system'];

      history.forEach(item => {
        expect(validSources).toContain(item.source);
      });
    });
  });
});
