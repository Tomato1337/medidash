import "./global.css"

import { lazy, StrictMode } from "react"
import ReactDOM from "react-dom/client"
import { RouterProvider, createRouter } from "@tanstack/react-router"
import { routeTree } from "../shared/router/routeTree.gen"
import {
	QueryClient,
	QueryCache,
	MutationCache,
	QueryClientProvider,
} from "@tanstack/react-query"
import { env } from "@/shared/config/env"
import { Toaster } from "@/shared/ui/sonner"
import { customToast } from "@/shared/lib/utils"
import { terminateCompressionWorker } from "@/shared/lib/compressionWorkerManager"
import { registerServiceWorker } from "@/modules/offline"

registerServiceWorker()

// Очистка волкера при закрытии страницы
window.addEventListener("beforeunload", () => {
	terminateCompressionWorker()
})

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			retry: (failureCount, error) => {
				if (error instanceof Error) {
					const statusMatch = error.message.match(/\b(401|403|404)\b/)
					if (statusMatch) return false
				}
				return failureCount < 1
			},
			refetchOnWindowFocus: false,
			staleTime: 5 * 60 * 1000,
		},
		mutations: {
			retry: 1,
		},
	},
	queryCache: new QueryCache({
		onError: (error, query) => {
			console.error("Query Error:", error)

			const skipGlobalHandler =
				(query.meta?.skipGlobalErrorHandler as boolean) ?? false
			console.log(skipGlobalHandler)
			if (!skipGlobalHandler) {
				customToast(
					"Ошибка загрузки данных",
					"error",
					error instanceof Error
						? error.message
						: "Произошла неизвестная ошибка",
				)
			}
		},
	}),
	mutationCache: new MutationCache({
		onError: (error, _variables, _context, mutation) => {
			console.error("Mutation Error:", error)

			const skipGlobalHandler =
				(mutation.meta?.skipGlobalErrorHandler as boolean) ?? false

			if (!skipGlobalHandler) {
				customToast(
					"Ошибка выполнения операции",
					"error",
					error instanceof Error
						? error.message
						: "Произошла неизвестная ошибка",
				)
			}
		},
	}),
})

export const router = createRouter({
	routeTree,
	context: {
		queryClient: undefined!,
	},
	scrollRestoration: true,
	scrollToTopSelectors: ["#main-scroll-container"],
})

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router
	}

	interface RouteContext {
		queryClient: QueryClient
	}
}

const TanStackRouterDevtools =
	env.VITE_TANSTACK_DEVTOOLS === "false"
		? lazy(() =>
				import("@tanstack/react-router-devtools").then((m) => ({
					default: m.TanStackRouterDevtools,
				})),
			)
		: () => null

const ReactQueryDevtools =
	env.VITE_TANSTACK_DEVTOOLS === "true"
		? lazy(() =>
				import("@tanstack/react-query-devtools").then((m) => ({
					default: m.ReactQueryDevtools,
				})),
			)
		: () => null

const rootElement = document.getElementById("root")!
if (!rootElement.innerHTML) {
	const root = ReactDOM.createRoot(rootElement)
	root.render(
		<StrictMode>
			<QueryClientProvider client={queryClient}>
				<RouterProvider router={router} />
				<TanStackRouterDevtools router={router} />
				<ReactQueryDevtools initialIsOpen={false} />
				<Toaster />
			</QueryClientProvider>
		</StrictMode>,
	)
}
