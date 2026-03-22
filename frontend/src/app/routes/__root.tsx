import * as React from "react"
import { Outlet, createRootRoute } from "@tanstack/react-router"
import { queryClient } from "../main"
import { ErrorBoundary } from "@/shared/ui/error-boundary"
import { NotFound } from "@/shared/ui/not-found"
import { useCompressionRecovery } from "@/modules/documents"
import { NotFoundPage } from '@/pages/not-found/not-found'

export const Route = createRootRoute({
	component: RootComponent,
	errorComponent: ErrorBoundary,
	notFoundComponent: NotFoundPage,
	beforeLoad: () => {
		return { queryClient }
	},
})

function RootComponent() {
	// Автоматически восстанавливаем прерванные компрессии при загрузке
	useCompressionRecovery()

	return (
		<React.Fragment>
			<Outlet />
		</React.Fragment>
	)
}
