import { env } from "@/shared/config/env"

// =============================================================================
// TYPES
// =============================================================================

export interface ProcessingEventData {
	recordId: string
	documentId?: string
	error?: string
	data?: Record<string, unknown>
}

export interface ProcessingHandlers {
	onStarted?: (data: ProcessingEventData) => void
	onProgress?: (data: ProcessingEventData) => void
	onCompleted?: (data: ProcessingEventData) => void
	onFailed?: (data: ProcessingEventData) => void
	allStatus?: (data: ProcessingEventData) => void
}

// =============================================================================
// SSE SUBSCRIPTION
// =============================================================================

export function subscribeToRecordProcessing(
	recordId: string,
	handlers: ProcessingHandlers,
): () => void {
	const url = `${env.VITE_URL_TO_BACKEND}/api/events/processing/${recordId}`

	console.log("SSE: Connecting to", url)

	const eventSource = new EventSource(url, { withCredentials: true })

	eventSource.addEventListener("parsing:started", (e) => {
		console.log("SSE: parsing:started")
		handlers.onStarted?.(JSON.parse(e.data))
		handlers.allStatus?.(JSON.parse(e.data))
	})

	eventSource.addEventListener("parsing:completed", (e) => {
		console.log("SSE: parsing:completed")
		handlers.onProgress?.(JSON.parse(e.data))
		handlers.allStatus?.(JSON.parse(e.data))
	})

	eventSource.addEventListener("parsing:failed", (e) => {
		console.log("SSE: parsing:failed")
		handlers.onFailed?.(JSON.parse(e.data))
		handlers.allStatus?.(JSON.parse(e.data))
	})

	// Processing events
	eventSource.addEventListener("processing:started", (e) => {
		console.log("SSE: processing:started")
		handlers.onProgress?.(JSON.parse(e.data))
		handlers.allStatus?.(JSON.parse(e.data))
	})

	eventSource.addEventListener("processing:completed", (e) => {
		console.log("SSE: processing:completed")
		handlers.onCompleted?.(JSON.parse(e.data))
		handlers.allStatus?.(JSON.parse(e.data))
	})

	eventSource.addEventListener("processing:failed", (e) => {
		console.log("SSE: processing:failed")
		handlers.onFailed?.(JSON.parse(e.data))
		handlers.allStatus?.(JSON.parse(e.data))
	})

	eventSource.onerror = (error) => {
		console.error("SSE: Connection error", error)
	}

	eventSource.onopen = () => {
		console.log("SSE: Connection opened")
	}

	return () => {
		console.log("SSE: Closing connection")
		eventSource.close()
	}
}
