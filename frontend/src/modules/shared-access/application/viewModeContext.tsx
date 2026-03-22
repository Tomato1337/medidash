import { createContext, useContext } from "react"

export type ViewMode =
	| { type: "owner" }
	| { type: "guest"; token: string; ownerId: string }

const ViewModeContext = createContext<ViewMode>({ type: "owner" })

export function useViewMode() {
	return useContext(ViewModeContext)
}

export function ViewModeProvider({
	value,
	children,
}: {
	value: ViewMode
	children: React.ReactNode
}) {
	return (
		<ViewModeContext.Provider value={value}>
			{children}
		</ViewModeContext.Provider>
	)
}
