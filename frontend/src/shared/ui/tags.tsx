import React, { useEffect, useRef, useState } from "react"
import InputLabel from "./inputLabel"
import { cn } from "../lib/utils"
import { XCircle, XIcon } from "lucide-react"
import { Skeleton } from "./skeleton"
import type { Tag } from "../lib/indexedDB"

interface TagsProps {
	tags: Tag[]
	pickedTags: Set<Tag["id"]>
	setPickedTags: (tags: Set<Tag["id"]>) => void
	debounceTime?: number
	disabled?: boolean
	isLoading?: boolean
}

export default function Tags({
	tags,
	debounceTime = 500,
	pickedTags,
	setPickedTags,
	disabled = false,
	isLoading = false,
}: TagsProps) {
	const [value, setValue] = useState("")
	const [debouncedValue, setDebouncedValue] = useState("")
	const [isOpen, setIsOpen] = useState(false)
	const scrollContainerRef = useRef<HTMLDivElement>(null)
	const containerRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		const timeout = setTimeout(() => {
			setDebouncedValue(value)
		}, debounceTime)

		return () => clearTimeout(timeout)
	}, [value, debounceTime])

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(event.target as Node)
			) {
				setIsOpen(false)
			}
		}

		if (isOpen) {
			document.addEventListener("mousedown", handleClickOutside)
		}

		return () => {
			document.removeEventListener("mousedown", handleClickOutside)
		}
	}, [isOpen])

	useEffect(() => {
		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setIsOpen(false)
			}
		}

		if (isOpen) {
			document.addEventListener("keydown", handleEscape)
		}

		return () => {
			document.removeEventListener("keydown", handleEscape)
		}
	}, [isOpen])

	useEffect(() => {
		const container = scrollContainerRef.current
		if (!container) return

		const handleWheel = (e: WheelEvent) => {
			// const hasHorizontalScroll =
			// 	container.scrollWidth > container.clientWidth

			// if (!hasHorizontalScroll) return

			if (e.deltaX !== 0) {
				e.preventDefault()

				const scrollMultiplier = e.shiftKey ? 3 : 1
				const scrollAmount = (e.deltaY || e.deltaX) * scrollMultiplier

				container.scrollLeft += scrollAmount
			}
		}

		container.addEventListener("wheel", handleWheel, { passive: false })
		return () => container.removeEventListener("wheel", handleWheel)
	}, [])

	const filteredTags = tags.filter((item) =>
		item.name
			.toLowerCase()
			.trim()
			.includes(debouncedValue.trim().toLowerCase()),
	)

	return (
		<div className="relative" ref={containerRef}>
			<InputLabel
				type="text"
				onFocus={() => !disabled && setIsOpen(true)}
				value={value}
				onChange={(e) => setValue(e.target.value)}
				placeholder=" "
				className="peer pt-6"
				label="Тэги"
				disabled={disabled}
				renderProps={
					<div className="absolute top-1/2 right-4 max-w-[60%] -translate-y-1/2">
						<div
							ref={scrollContainerRef}
							className="flex h-8 w-full gap-3 overflow-x-auto scroll-smooth [scrollbar-color:oklch(from_var(--primary)_l_c_h_/_0.3)_transparent] [scrollbar-width:thin] hover:[scrollbar-color:oklch(from_var(--primary)_l_c_h_/_0.5)_transparent] [&::-webkit-scrollbar]:h-[6px] [&::-webkit-scrollbar-thumb]:rounded-[3px] [&::-webkit-scrollbar-thumb]:bg-[oklch(from_var(--primary)_l_c_h_/_0.3)] [&::-webkit-scrollbar-thumb:hover]:bg-[oklch(from_var(--primary)_l_c_h_/_0.5)] [&::-webkit-scrollbar-track]:bg-transparent"
						>
							{Array.from(pickedTags).map((tagId) => {
								const tag = tags.find((t) => t.id === tagId)
								if (!tag) return null
										return (
											<button
												type="button"
												onClick={() => {
													const newPickedTags = new Set(
														pickedTags,
													)
													newPickedTags.delete(tag.id)
													setPickedTags(newPickedTags)
											}}
											key={tag.id}
											className="bg-primary text-primary-foreground hover:bg-primary/50 flex shrink-0 cursor-pointer items-center gap-1 rounded-full px-3 py-1 text-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60"
											disabled={disabled}
											aria-label={`Удалить тег ${tag.name}`}
											aria-disabled={disabled}
										>
											<span className="whitespace-nowrap">
												{tag.name}
											</span>
											<XCircle className="size-4" aria-hidden="true" />
										</button>
										)
							})}
						</div>
					</div>
				}
			/>
			<div
				className={cn(
					"bg-secondary-foreground absolute z-10 mt-1 flex w-full flex-col gap-2 overflow-auto rounded-lg border p-2 transition-all duration-200 [scrollbar-color:oklch(from_var(--primary)_l_c_h_/_0.3)_transparent] [scrollbar-width:thin] hover:[scrollbar-color:oklch(from_var(--primary)_l_c_h_/_0.5)_transparent] [&::-webkit-scrollbar]:w-[8px] [&::-webkit-scrollbar-thumb]:rounded-[4px] [&::-webkit-scrollbar-thumb]:bg-[oklch(from_var(--primary)_l_c_h_/_0.3)] [&::-webkit-scrollbar-thumb:hover]:bg-[oklch(from_var(--primary)_l_c_h_/_0.5)] [&::-webkit-scrollbar-track]:bg-transparent",
					{
						"opacity-100": isOpen,
						"pointer-events-none opacity-0": !isOpen,
					},
				)}
				style={{
					height: "clamp(100px, 35vh, 400px)",
				}}
			>
				{filteredTags.length === 0 && !isLoading && (
					<div className="text-muted-foreground p-4">
						Тэги не найдены
					</div>
				)}
				{isLoading
					? Array.from({ length: 5 }).map((_, index) => (
							<Skeleton
								className="bg-accent-foreground h-6 w-full rounded-lg"
								key={index}
							/>
						))
					: filteredTags.map((tag) => (
							<button
								type="button"
								key={tag.id}
								className={cn(
									"bg-secondary hover:bg-primary/50 cursor-pointer rounded-lg p-4 text-black transition-colors duration-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60",
									{
										"bg-primary text-white": pickedTags.has(
											tag.id,
										),
									},
								)}
								onClick={() => {
									const newPickedTags = new Set(pickedTags)
									if (newPickedTags.has(tag.id)) {
										newPickedTags.delete(tag.id)
									} else {
										newPickedTags.add(tag.id)
									}
									setPickedTags(newPickedTags)
								}}
								disabled={disabled}
								aria-pressed={pickedTags.has(tag.id)}
								aria-disabled={disabled}
							>
								{tag.name}
							</button>
						))}
			</div>
		</div>
	)
}
