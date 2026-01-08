import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { ArrowLeft, TrendingUp, TrendingDown, BarChart3, Target, Award, Percent } from "lucide-react";

export default function Performance() {
  const { data, isLoading, error } = trpc.performance.getMonthlyData.useQuery();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-gray-400">パフォーマンスデータを読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">データの取得に失敗しました</p>
          <Link to="/" className="text-emerald-400 hover:underline">
            ホームに戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            to="/"
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">月次パフォーマンス一覧</h1>
            <p className="text-gray-400 text-sm">攻撃型聖杯と防御型聖杯の過去24ヶ月のパフォーマンス</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Aggressive Summary */}
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
              </div>
              <h2 className="text-lg font-semibold">{data.aggressive.nameJapanese}</h2>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-gray-400 text-xs mb-1">累計リターン</p>
                <p className={`text-xl font-bold ${data.aggressive.summary.totalReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {data.aggressive.summary.totalReturn >= 0 ? '+' : ''}{data.aggressive.summary.totalReturn}%
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-1">年率リターン</p>
                <p className={`text-xl font-bold ${data.aggressive.summary.annualizedReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {data.aggressive.summary.annualizedReturn >= 0 ? '+' : ''}{data.aggressive.summary.annualizedReturn}%
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-1">最大DD</p>
                <p className="text-xl font-bold text-red-400">
                  {data.aggressive.summary.maxDrawdown}%
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-1">シャープレシオ</p>
                <p className="text-lg font-semibold text-white">
                  {data.aggressive.summary.sharpeRatio}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-1">勝率</p>
                <p className="text-lg font-semibold text-white">
                  {data.aggressive.summary.winRate}%
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-1">平均月次</p>
                <p className={`text-lg font-semibold ${data.aggressive.summary.avgMonthlyReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {data.aggressive.summary.avgMonthlyReturn >= 0 ? '+' : ''}{data.aggressive.summary.avgMonthlyReturn}%
                </p>
              </div>
            </div>
          </div>

          {/* Defensive Summary */}
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Target className="w-5 h-5 text-blue-400" />
              </div>
              <h2 className="text-lg font-semibold">{data.defensive.nameJapanese}</h2>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-gray-400 text-xs mb-1">累計リターン</p>
                <p className={`text-xl font-bold ${data.defensive.summary.totalReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {data.defensive.summary.totalReturn >= 0 ? '+' : ''}{data.defensive.summary.totalReturn}%
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-1">年率リターン</p>
                <p className={`text-xl font-bold ${data.defensive.summary.annualizedReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {data.defensive.summary.annualizedReturn >= 0 ? '+' : ''}{data.defensive.summary.annualizedReturn}%
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-1">最大DD</p>
                <p className="text-xl font-bold text-red-400">
                  {data.defensive.summary.maxDrawdown}%
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-1">シャープレシオ</p>
                <p className="text-lg font-semibold text-white">
                  {data.defensive.summary.sharpeRatio}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-1">勝率</p>
                <p className="text-lg font-semibold text-white">
                  {data.defensive.summary.winRate}%
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-1">平均月次</p>
                <p className={`text-lg font-semibold ${data.defensive.summary.avgMonthlyReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {data.defensive.summary.avgMonthlyReturn >= 0 ? '+' : ''}{data.defensive.summary.avgMonthlyReturn}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Performance Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Aggressive Table */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <div className="p-4 border-b border-gray-800 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <h3 className="font-semibold">{data.aggressive.nameJapanese} - 月次パフォーマンス</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-800/50">
                  <tr>
                    <th className="text-left p-3 text-gray-400 font-medium">月</th>
                    <th className="text-right p-3 text-gray-400 font-medium">月次リターン</th>
                    <th className="text-right p-3 text-gray-400 font-medium">累計リターン</th>
                    <th className="text-right p-3 text-gray-400 font-medium">ドローダウン</th>
                  </tr>
                </thead>
                <tbody>
                  {data.aggressive.monthlyData.map((row, index) => (
                    <tr key={row.month} className={index % 2 === 0 ? 'bg-gray-800/20' : ''}>
                      <td className="p-3 text-gray-300">{row.monthDisplay}</td>
                      <td className={`p-3 text-right font-mono ${row.return >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {row.return >= 0 ? '+' : ''}{row.return.toFixed(1)}%
                      </td>
                      <td className={`p-3 text-right font-mono ${row.cumReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {row.cumReturn >= 0 ? '+' : ''}{row.cumReturn.toFixed(2)}%
                      </td>
                      <td className={`p-3 text-right font-mono ${row.drawdown < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                        {row.drawdown.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Defensive Table */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <div className="p-4 border-b border-gray-800 flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-400" />
              <h3 className="font-semibold">{data.defensive.nameJapanese} - 月次パフォーマンス</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-800/50">
                  <tr>
                    <th className="text-left p-3 text-gray-400 font-medium">月</th>
                    <th className="text-right p-3 text-gray-400 font-medium">月次リターン</th>
                    <th className="text-right p-3 text-gray-400 font-medium">累計リターン</th>
                    <th className="text-right p-3 text-gray-400 font-medium">ドローダウン</th>
                  </tr>
                </thead>
                <tbody>
                  {data.defensive.monthlyData.map((row, index) => (
                    <tr key={row.month} className={index % 2 === 0 ? 'bg-gray-800/20' : ''}>
                      <td className="p-3 text-gray-300">{row.monthDisplay}</td>
                      <td className={`p-3 text-right font-mono ${row.return >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {row.return >= 0 ? '+' : ''}{row.return.toFixed(1)}%
                      </td>
                      <td className={`p-3 text-right font-mono ${row.cumReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {row.cumReturn >= 0 ? '+' : ''}{row.cumReturn.toFixed(2)}%
                      </td>
                      <td className={`p-3 text-right font-mono ${row.drawdown < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                        {row.drawdown.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-8 p-4 bg-gray-900/50 rounded-lg border border-gray-800">
          <p className="text-gray-500 text-xs">
            ※ 上記のパフォーマンスデータはバックテストに基づく過去の実績であり、将来のパフォーマンスを保証するものではありません。
            投資判断は自己責任でお願いします。
          </p>
        </div>
      </div>
    </div>
  );
}
