import { runBacktestForDate } from "./server/backtestService.js";

async function main() {
  console.log("=== バックテスト実行（2025年12月31日時点） ===");
  
  try {
    const result = await runBacktestForDate("2025-12-31", 5);
    
    console.log("\n結果の構造:");
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.error("エラー:", e);
  }
}

main();
