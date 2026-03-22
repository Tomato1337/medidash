export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
	if (!("serviceWorker" in navigator)) {
		console.warn("Service Worker not supported")
		return null
	}

	if (import.meta.env.DEV) {
		try {
			const registrations =
				await navigator.serviceWorker.getRegistrations()
			await Promise.all(
				registrations.map((registration) => registration.unregister()),
			)

			if ("caches" in window) {
				const cacheKeys = await caches.keys()
				await Promise.all(cacheKeys.map((key) => caches.delete(key)))
			}

			console.log("SW disabled in DEV and stale caches cleared")
		} catch (error) {
			console.error("Failed to clear SW/caches in DEV:", error)
		}

		return null
	}

	try {
		const swUrl = "/sw.js"
		const options: RegistrationOptions = {
			scope: "/",
			type: "classic",
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
