import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import "./index.css";

/**
 * QueryClient設定 - クライアントサイドキャッシュの最適化
 * 
 * staleTime: データが「新鮮」とみなされる期間（この間はrefetchしない）
 * gcTime: キャッシュがメモリに保持される期間（旧cacheTime）
 * 
 * これにより、同一ユーザーの連続アクセスでAPIを呼び出さないようにする
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // データを5分間「新鮮」とみなす（この間はAPIを呼び出さない）
      staleTime: 5 * 60 * 1000,
      // キャッシュを30分間メモリに保持
      gcTime: 30 * 60 * 1000,
      // ウィンドウフォーカス時の自動refetchを無効化（コスト削減）
      refetchOnWindowFocus: false,
      // マウント時の自動refetchを無効化（staleTimeで制御）
      refetchOnMount: false,
      // 再接続時の自動refetchを無効化
      refetchOnReconnect: false,
      // リトライ回数を制限
      retry: 2,
    },
  },
});

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  window.location.href = getLoginUrl();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
