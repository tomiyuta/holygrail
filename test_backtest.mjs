import { runBacktestForDate } from "./server/backtestService.js";

async function main() {
  console.log("=== バックテスト実行（2025年12月31日時点） ===");
  
  try {
    const result = await runBacktestForDate("2025-12-31", 5);
    
    if (result) {
      console.log("\n【攻撃型聖杯の選定結果】");
      console.log(`計算日時: ${result.aggressive.calculatedAt}`);
      console.log(`選定銘柄数: ${result.aggressive.totalHoldings}`);
      console.log("\n銘柄\t\tモメンタム\tリスク\t\t投資割合");
      console.log("-".repeat(70));
      
      for (const h of result.aggressive.holdings) {
        console.log(`${h.symbol.padEnd(8)}\t${h.momentum?.toFixed(2)}%\t\t${h.volatility?.toFixed(4)}\t\t${h.weight.toFixed(2)}%`);
      }
    } else {
      console.log("データが取得できませんでした");
    }
  } catch (e) {
    console.error("エラー:", e);
  }
}

main();
