import { X } from "lucide-react"

interface FilterChipProps {
	label: string
	onRemove: () => void
}

export function FilterChip({ label, onRemove }: FilterChipProps) {
	return (
		<span className="bg-primary text-primary-foreground inline-flex items-center gap-1 rounded-full border border-primary/20 px-3 py-1 text-sm">
			{label}
			<button
				type="button"
				onClick={onRemove}
				className="hover:bg-primary/10 rounded-full cursor-pointer p-0.5 transition-colors"
				aria-label={`Убрать фильтр: ${label}`}
			>
				<X className="size-3" aria-hidden="true" />
			</button>
		</span>
	)
}
