import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "../lib/trpc";

export default function Backtest() {
  // Default to yesterday's date (markets need time to update)
  const getDefaultDate = () => {
    const today = new Date();
    today.setDate(today.getDate() - 1);
    return today.toISOString().split('T')[0];
  };

  const [selectedDate, setSelectedDate] = useState<string>(getDefaultDate());
  const [diversificationCount, setDiversificationCount] = useState<number>(5);

  // Fetch backtest results
  const { data: backtestResult, isLoading, error } = trpc.backtest.run.useQuery(
    { date: selectedDate, diversificationCount },
    { enabled: !!selectedDate }
  );

  // Calculate min and max dates for the date picker
  // Min: 6 months ago (need 6 months of historical data for momentum calculation)
  // Max: yesterday (today's data may not be complete)
  const getMinDate = () => {
    const date = new Date();
    date.setMonth(date.getMonth() - 24); // Allow up to 2 years back
    return date.toISOString().split('T')[0];
  };

  const getMaxDate = () => {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return date.toISOString().split('T')[0];
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <a className="text-gray-400 hover:text-white transition-colors">
                ← 戻る
              </a>
            </Link>
            <h1 className="text-xl font-bold">バックテスト</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Description */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">過去データでのシミュレーション</h2>
          <p className="text-gray-400">
            任意の日付を選択し、分散数を変更して、その時点での銘柄選定結果をシミュレーションできます。
          </p>
        </div>

        {/* Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Date Selection - Calendar Picker */}
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="text-blue-400">📅</span>
              日付選択
            </h3>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={getMinDate()}
              max={getMaxDate()}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer [color-scheme:dark]"
            />
            <p className="text-gray-500 text-sm mt-2">
              シミュレーション対象の日付を選択してください（過去2年間から選択可能）
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => {
                  const date = new Date();
                  date.setDate(date.getDate() - 1);
                  setSelectedDate(date.toISOString().split('T')[0]);
                }}
                className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors"
              >
                昨日
              </button>
              <button
                onClick={() => {
                  const date = new Date();
                  date.setDate(date.getDate() - 7);
                  setSelectedDate(date.toISOString().split('T')[0]);
                }}
                className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors"
              >
                1週間前
              </button>
              <button
                onClick={() => {
                  const date = new Date();
                  date.setMonth(date.getMonth() - 1);
                  setSelectedDate(date.toISOString().split('T')[0]);
                }}
                className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors"
              >
                1ヶ月前
              </button>
              <button
                onClick={() => {
                  const date = new Date();
                  date.setMonth(date.getMonth() - 3);
                  setSelectedDate(date.toISOString().split('T')[0]);
                }}
                className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors"
              >
                3ヶ月前
              </button>
              <button
                onClick={() => {
                  const date = new Date();
                  date.setMonth(date.getMonth() - 6);
                  setSelectedDate(date.toISOString().split('T')[0]);
                }}
                className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors"
              >
                6ヶ月前
              </button>
              <button
                onClick={() => setSelectedDate("2025-12-31")}
                className="px-3 py-1 bg-purple-800 hover:bg-purple-700 rounded-lg text-sm text-purple-200 transition-colors"
              >
                元の聖杯日付
              </button>
            </div>
          </div>

          {/* Diversification Count */}
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="text-green-400">📊</span>
              分散数設定
            </h3>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="3"
                max="10"
                value={diversificationCount}
                onChange={(e) => setDiversificationCount(parseInt(e.target.value))}
                className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
              />
              <div className="bg-gray-800 px-4 py-2 rounded-lg min-w-[60px] text-center">
                <span className="text-2xl font-bold text-green-400">{diversificationCount}</span>
                <span className="text-gray-500 text-sm ml-1">銘柄</span>
              </div>
            </div>
            <div className="flex justify-between text-gray-500 text-sm mt-2">
              <span>3銘柄（集中）</span>
              <span>10銘柄（分散）</span>
            </div>
          </div>
        </div>

        {/* Results */}
        {isLoading && (
          <div className="bg-gray-900 rounded-xl p-8 border border-gray-800 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-400">シミュレーション中...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-900/20 rounded-xl p-6 border border-red-800 text-red-400">
            エラー: {error.message}
          </div>
        )}

        {backtestResult && (
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            {/* Result Header */}
            <div className="p-6 border-b border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <span className="text-yellow-400">⚡</span>
                  攻撃型聖杯ポートフォリオ
                </h3>
                <p className="text-gray-400 text-sm mt-1">
                  {backtestResult.date} 時点 | {backtestResult.diversificationCount}銘柄分散
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-green-400">
                  {backtestResult.totalHoldings}
                </div>
                <div className="text-gray-500 text-sm">銘柄</div>
              </div>
            </div>

            {/* Holdings Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800/50">
                  <tr>
                    <th className="text-left px-6 py-3 text-gray-400 font-medium">銘柄</th>
                    <th className="text-right px-6 py-3 text-gray-400 font-medium">ウェイト</th>
                    <th className="text-right px-6 py-3 text-gray-400 font-medium">モメンタム</th>
                    <th className="text-right px-6 py-3 text-gray-400 font-medium">リスク</th>
                    <th className="text-right px-6 py-3 text-gray-400 font-medium">株価</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {backtestResult.holdings.map((holding, index) => (
                    <tr key={holding.symbol} className="hover:bg-gray-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 bg-gray-800 rounded-full flex items-center justify-center text-xs text-gray-400">
                            {index + 1}
                          </span>
                          <div>
                            <div className="font-bold">{holding.symbol}</div>
                            <div className="text-gray-500 text-sm truncate max-w-[200px]">
                              {holding.name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-blue-400 font-semibold">
                          {holding.weight.toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={holding.momentum >= 0 ? "text-green-400" : "text-red-400"}>
                          {holding.momentum >= 0 ? "+" : ""}{holding.momentum.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-gray-400">
                        {holding.risk.toFixed(4)}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-300">
                        ${holding.price.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="p-6 border-t border-gray-800 bg-gray-800/30">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-gray-500 text-sm">選定銘柄数</div>
                  <div className="text-xl font-bold">{backtestResult.totalHoldings}銘柄</div>
                </div>
                <div>
                  <div className="text-gray-500 text-sm">最大ウェイト</div>
                  <div className="text-xl font-bold text-blue-400">
                    {Math.max(...backtestResult.holdings.map(h => h.weight)).toFixed(2)}%
                  </div>
                </div>
                <div>
                  <div className="text-gray-500 text-sm">最小ウェイト</div>
                  <div className="text-xl font-bold text-blue-400">
                    {Math.min(...backtestResult.holdings.map(h => h.weight)).toFixed(2)}%
                  </div>
                </div>
                <div>
                  <div className="text-gray-500 text-sm">平均モメンタム</div>
                  <div className="text-xl font-bold text-green-400">
                    +{(backtestResult.holdings.reduce((sum, h) => sum + h.momentum, 0) / backtestResult.holdings.length).toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Explanation */}
        <div className="mt-8 bg-gray-900/50 rounded-xl p-6 border border-gray-800">
          <h3 className="text-lg font-semibold mb-4">📖 バックテストについて</h3>
          <div className="text-gray-400 space-y-2">
            <p>
              <strong className="text-white">銘柄選定ロジック:</strong> 6ヶ月モメンタム（リターン）の高い順に銘柄を選定します。
            </p>
            <p>
              <strong className="text-white">ウェイト計算:</strong> リスク逆数ウェイト方式を採用。リスクが低い銘柄ほど高いウェイトが割り当てられます。
            </p>
            <p>
              <strong className="text-white">分散数の影響:</strong> 分散数を増やすと個別銘柄リスクは低下しますが、モメンタム効果も薄まります。
            </p>
            <p>
              <strong className="text-white">日付選択:</strong> 過去2年間の任意の日付を選択できます。選択した日付時点での6ヶ月モメンタムを計算します。
            </p>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-6 text-gray-500 text-sm">
          ※ 本シミュレーションは過去のデータに基づく参考情報であり、将来のパフォーマンスを保証するものではありません。
        </div>
      </main>
    </div>
  );
}
