export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
	if (!("serviceWorker" in navigator)) {
		console.warn("Service Worker not supported")
		return null
	}

	try {
		const swUrl = import.meta.env.DEV
			? "/src/modules/offline/infrastructure/sw.serviceWorker.ts"
			: "/sw.js"
		const options: RegistrationOptions = {
			scope: "/",
			type: import.meta.env.DEV ? "module" : "classic",
		}

		const registration = await navigator.serviceWorker.register(
			swUrl,
			options,
		)
		console.log("SW registered:", registration.scope)
		return registration
	} catch (error) {
		console.error("SW registration failed:", error)
		return null
	}
}

export function isServiceWorkerActive(): boolean {
	return !!navigator.serviceWorker?.controller
}

export async function unregisterServiceWorker(): Promise<boolean> {
	if (!("serviceWorker" in navigator)) {
		return false
	}

	try {
		const registration = await navigator.serviceWorker.ready
		return await registration.unregister()
	} catch (error) {
		console.error("SW unregister failed:", error)
		return false
	}
}
