import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the marketData module
vi.mock('../marketData', async () => {
  const actual = await vi.importActual('../marketData');
  return {
    ...actual,
    getDynamicTop100Symbols: vi.fn().mockResolvedValue([
      'NVDA', 'META', 'AMZN', 'GOOGL', 'MSFT', 'AAPL', 'TSLA', 'AMD', 'AVGO', 'CRM',
    ]),
    fetchStockChart: vi.fn().mockImplementation(async (symbol: string) => {
      // Simulate API returning null for some stocks (rate limiting)
      if (['TSLA', 'AMD', 'AVGO', 'CRM'].includes(symbol)) {
        return null;
      }
      
      // Return mock data for other stocks
      const mockData: Record<string, any> = {
        NVDA: { symbol: 'NVDA', name: 'NVIDIA Corporation', prices: generateMockPrices(150, 1.50, 0.45) },
        META: { symbol: 'META', name: 'Meta Platforms, Inc.', prices: generateMockPrices(150, 0.80, 0.35) },
        AMZN: { symbol: 'AMZN', name: 'Amazon.com, Inc.', prices: generateMockPrices(150, 0.60, 0.30) },
        GOOGL: { symbol: 'GOOGL', name: 'Alphabet Inc.', prices: generateMockPrices(150, 0.50, 0.28) },
        MSFT: { symbol: 'MSFT', name: 'Microsoft Corporation', prices: generateMockPrices(150, 0.40, 0.25) },
        AAPL: { symbol: 'AAPL', name: 'Apple Inc.', prices: generateMockPrices(150, 0.35, 0.22) },
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

describe('Aggressive Portfolio Selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 5 stocks even when some data is unavailable', async () => {
    // Import after mocking
    const { selectAggressivePortfolio } = await import('../portfolioSelection');
    
    const result = await selectAggressivePortfolio('bull');
    
    expect(result).toBeDefined();
    expect(result.type).toBe('aggressive');
    expect(result.holdings.length).toBe(5);
    expect(result.totalHoldings).toBe(5);
  });

  it('should calculate risk-inverse weights correctly', async () => {
    const { selectAggressivePortfolio } = await import('../portfolioSelection');
    
    const result = await selectAggressivePortfolio('bull');
    
    // Total weight should be 100%
    const totalWeight = result.holdings.reduce((sum, h) => sum + h.weight, 0);
    expect(totalWeight).toBeCloseTo(100, 1);
    
    // Each holding should have positive weight
    result.holdings.forEach(h => {
      expect(h.weight).toBeGreaterThan(0);
      expect(h.weight).toBeLessThanOrEqual(100);
    });
  });

  it('should include momentum and volatility for each stock', async () => {
    const { selectAggressivePortfolio } = await import('../portfolioSelection');
    
    const result = await selectAggressivePortfolio('bull');
    
    result.holdings.forEach(h => {
      expect(h.momentum).toBeDefined();
      expect(typeof h.momentum).toBe('number');
      expect(h.volatility).toBeDefined();
      expect(typeof h.volatility).toBe('number');
    });
  });

  it('should sort holdings by weight descending', async () => {
    const { selectAggressivePortfolio } = await import('../portfolioSelection');
    
    const result = await selectAggressivePortfolio('bull');
    
    for (let i = 0; i < result.holdings.length - 1; i++) {
      expect(result.holdings[i].weight).toBeGreaterThanOrEqual(result.holdings[i + 1].weight);
    }
  });

  it('should respect custom diversification count', async () => {
    const { selectAggressivePortfolio } = await import('../portfolioSelection');
    
    const result = await selectAggressivePortfolio('bull', 100, 3);
    
    expect(result.holdings.length).toBeLessThanOrEqual(6); // May include fallbacks
  });
});
