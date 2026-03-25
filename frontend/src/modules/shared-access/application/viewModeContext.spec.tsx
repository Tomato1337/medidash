import { describe, it, expect } from "vitest"
import { renderHook } from "@testing-library/react"
import { render, screen } from "@/test/test-utils"
import {
	useViewMode,
	ViewModeProvider,
	type ViewMode,
} from "./viewModeContext"

describe("viewModeContext", () => {
	// =========================================================================
	// useViewMode — значение по умолчанию
	// =========================================================================

	describe("useViewMode", () => {
		it("по умолчанию возвращает owner mode", () => {
			const { result } = renderHook(() => useViewMode())

			expect(result.current).toEqual({ type: "owner" })
		})
	})

	// =========================================================================
	// ViewModeProvider — owner mode
	// =========================================================================

	describe("ViewModeProvider owner mode", () => {
		it("передаёт owner mode в контекст", () => {
			const ownerMode: ViewMode = { type: "owner" }

			function TestConsumer() {
				const mode = useViewMode()
				return <div data-testid="mode">{mode.type}</div>
			}

			render(
				<ViewModeProvider value={ownerMode}>
					<TestConsumer />
				</ViewModeProvider>,
			)

			expect(screen.getByTestId("mode").textContent).toBe("owner")
		})
	})

	// =========================================================================
	// ViewModeProvider — guest mode
	// =========================================================================

	describe("ViewModeProvider guest mode", () => {
		it("передаёт guest mode с token и ownerId в контекст", () => {
			const guestMode: ViewMode = {
				type: "guest",
				token: "share-token-abc",
				ownerId: "owner-123",
			}

			function TestConsumer() {
				const mode = useViewMode()
				if (mode.type === "guest") {
					return (
						<div>
							<span data-testid="type">{mode.type}</span>
							<span data-testid="token">{mode.token}</span>
							<span data-testid="ownerId">{mode.ownerId}</span>
						</div>
					)
				}
				return <div data-testid="type">{mode.type}</div>
			}

			render(
				<ViewModeProvider value={guestMode}>
					<TestConsumer />
				</ViewModeProvider>,
			)

			expect(screen.getByTestId("type").textContent).toBe("guest")
			expect(screen.getByTestId("token").textContent).toBe(
				"share-token-abc",
			)
			expect(screen.getByTestId("ownerId").textContent).toBe(
				"owner-123",
			)
		})
	})
})
