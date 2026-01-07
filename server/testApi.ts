/**
 * Test API endpoint for debugging
 */

import { callDataApi } from "./_core/dataApi";

export async function testYahooFinanceApi() {
  console.log("[TestAPI] Testing Yahoo Finance API...");
  
  try {
    const response = await callDataApi("YahooFinance/get_stock_chart", {
      query: {
        symbol: "SPY",
        region: "US",
        interval: "1d",
        range: "5d",
        includeAdjustedClose: true,
      },
    });

    console.log("[TestAPI] Response received:", JSON.stringify(response).slice(0, 200));
    return response;
  } catch (error) {
    console.error("[TestAPI] Error:", error);
    throw error;
  }
}
