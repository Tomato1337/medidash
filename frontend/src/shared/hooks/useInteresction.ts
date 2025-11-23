import { useEffect, useState } from "react"

export const useIntersection = (
	ref: React.RefObject<HTMLElement | null>,
	options: IntersectionObserverInit = {},
) => {
	const [isIntersecting, setIsIntersecting] = useState(false)

	useEffect(() => {
		const element = ref?.current
		if (!element) return
		const observer = new IntersectionObserver((entries) => {
			setIsIntersecting(entries[0]?.isIntersecting || false)
		}, options)

		observer.observe(element)

		return () => {
			observer.unobserve(element)
		}
	}, [ref, options])

	return isIntersecting
}
