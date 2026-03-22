import { env } from "@/shared/config/env"

export interface SharedAccessLoginEvent {
	accessId: string
	accessName: string
	timestamp: string
}

export function subscribeToSharedAccessEvents(
	handler: (event: SharedAccessLoginEvent) => void,
): () => void {
	const url = `${env.VITE_URL_TO_BACKEND}/api/events/processing`
	const eventSource = new EventSource(url, { withCredentials: true })

	const listener = (e: MessageEvent) => {
		const data = JSON.parse(e.data) as SharedAccessLoginEvent
		handler(data)
	}

	eventSource.addEventListener("shared-access:login", listener)

	eventSource.onerror = () => {
		// no-op for now
	}

	return () => {
		eventSource.removeEventListener("shared-access:login", listener)
		eventSource.close()
	}
}
