import { clsx, type ClassValue } from "clsx"
import { toast } from "sonner"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

export const formatDate = (timestamp: number | string) => {
	return new Date(timestamp).toLocaleDateString("ru-RU", {
		day: "numeric",
		month: "long",
		year: "numeric",
	})
}

export const customToast = (
	message: string,
	type: "success" | "error" | "info",
	description?: string,
) => {
	const colors = {
		success: {
			background: "#34A200",
			text: "white",
		},
		error: {
			background: "#FF3333",
			text: "white",
		},
		info: {
			background: "#0095BE",
			text: "black",
		},
	}

	return toast(message, {
		duration: 4000,
		style: {
			background: colors[type].background,
			color: colors[type].text,
		},
		description,
	})
}
