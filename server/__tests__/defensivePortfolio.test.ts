import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the fetchStockChart function
vi.mock('../marketData', async () => {
  const actual = await vi.importActual('../marketData');
  return {
    ...actual,
    fetchStockChart: vi.fn().mockImplementation(async (symbol: string) => {
      // Simulate API returning null for some ETFs (rate limiting)
      if (['IWM', 'EFA', 'DBC'].includes(symbol)) {
        return null;
      }
      
      // Return mock data for other ETFs
      const mockData: Record<string, any> = {
        GLD: { symbol: 'GLD', name: 'SPDR Gold Shares', prices: generateMockPrices(150, 0.25, 0.22) },
        EEM: { symbol: 'EEM', name: 'iShares MSCI Emerging Markets', prices: generateMockPrices(150, 0.15, 0.15) },
        QQQ: { symbol: 'QQQ', name: 'Invesco QQQ Trust', prices: generateMockPrices(150, 0.10, 0.16) },
        SPY: { symbol: 'SPY', name: 'SPDR S&P 500 ETF', prices: generateMockPrices(150, 0.08, 0.12) },
        AGG: { symbol: 'AGG', name: 'iShares Core US Aggregate Bond', prices: generateMockPrices(150, 0.03, 0.03) },
        TLT: { symbol: 'TLT', name: 'iShares 20+ Year Treasury', prices: generateMockPrices(150, 0.02, 0.09) },
        IEF: { symbol: 'IEF', name: 'iShares 7-10 Year Treasury', prices: generateMockPrices(150, 0.04, 0.04) },
        LQD: { symbol: 'LQD', name: 'iShares Investment Grade Corporate', prices: generateMockPrices(150, 0.04, 0.05) },
        TIP: { symbol: 'TIP', name: 'iShares TIPS Bond', prices: generateMockPrices(150, 0.02, 0.03) },
        SHY: { symbol: 'SHY', name: 'iShares 1-3 Year Treasury', prices: generateMockPrices(150, 0.02, 0.01) },
        IYR: { symbol: 'IYR', name: 'iShares US Real Estate', prices: generateMockPrices(150, 0.01, 0.12) },
      };
      
      return mockData[symbol] || null;
    }),
  };
});

function generateMockPrices(count: number, momentum: number, volatility: number) {
  const prices = [];
  let price = 100;
  const dailyReturn = momentum / count;
  const dailyVol = volatility / Math.sqrt(252);
  
  for (let i = 0; i < count; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (count - i));
    
    // Add some randomness
    const randomReturn = (Math.random() - 0.5) * dailyVol * 2;
    price = price * (1 + dailyReturn + randomReturn);
    
    prices.push({
      date,
      open: price * 0.99,
      high: price * 1.01,
      low: price * 0.98,
      close: price,
      adjClose: price,
      volume: 1000000,
    });
  }
  
  return prices;
}

describe('Defensive Portfolio Selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 5 ETFs even when some data is unavailable', async () => {
    // Import after mocking
    const { selectDefensivePortfolio } = await import('../portfolioSelection');
    
    const result = await selectDefensivePortfolio('bull');
    
    expect(result).toBeDefined();
    expect(result.type).toBe('defensive');
    expect(result.holdings.length).toBe(5);
    expect(result.totalHoldings).toBe(5);
  });

  it('should calculate risk-inverse weights correctly', async () => {
    const { selectDefensivePortfolio } = await import('../portfolioSelection');
    
    const result = await selectDefensivePortfolio('bull');
    
    // Total weight should be 100%
    const totalWeight = result.holdings.reduce((sum, h) => sum + h.weight, 0);
    expect(totalWeight).toBeCloseTo(100, 1);
    
    // Each holding should have positive weight
    result.holdings.forEach(h => {
      expect(h.weight).toBeGreaterThan(0);
      expect(h.weight).toBeLessThanOrEqual(100);
    });
  });

  it('should include category information for each ETF', async () => {
    const { selectDefensivePortfolio } = await import('../portfolioSelection');
    
    const result = await selectDefensivePortfolio('bull');
    
    result.holdings.forEach(h => {
      expect(h.category).toBeDefined();
      expect(typeof h.category).toBe('string');
    });
  });

  it('should sort holdings by weight descending', async () => {
    const { selectDefensivePortfolio } = await import('../portfolioSelection');
    
    const result = await selectDefensivePortfolio('bull');
    
    for (let i = 0; i < result.holdings.length - 1; i++) {
      expect(result.holdings[i].weight).toBeGreaterThanOrEqual(result.holdings[i + 1].weight);
    }
  });
});
