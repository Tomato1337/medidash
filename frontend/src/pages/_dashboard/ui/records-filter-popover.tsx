import type { RecordsFilters } from "@/modules/records/domain/types"
import { Button } from "@/shared/ui/button"
import { Badge } from "@/shared/ui/badge"
import { Checkbox } from "@/shared/ui/checkbox"
import { Input } from "@/shared/ui/input"
import { Label } from "@/shared/ui/label"
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/shared/ui/popover"
import { Separator } from "@/shared/ui/separator"
import FilterIcon from "@/shared/ui/icons/filter"

interface RecordsFilterPopoverProps {
	filters: RecordsFilters
	onChange: (patch: Partial<RecordsFilters>) => void
	activeCount: number
	availableTags?: Array<{ id: string; name: string }>
}

function toggleTag(tags: string[] | undefined, tagId: string, checked: boolean) {
	const currentTags = tags ?? []

	if (checked) {
		if (currentTags.includes(tagId)) {
			return currentTags
		}

		return [...currentTags, tagId]
	}

	const nextTags = currentTags.filter((id) => id !== tagId)
	return nextTags.length > 0 ? nextTags : undefined
}

export function RecordsFilterPopover({
	filters,
	onChange,
	activeCount,
	availableTags,
}: RecordsFilterPopoverProps) {
	return (
		<Popover>
			<PopoverTrigger asChild>
				<div className="relative">
					<Button
						variant="ghost"
						size="icon"
						className="bg-background hover:bg-primary/15 h-11 w-11 rounded-lg border border-primary/20"
						aria-label="Фильтр"
					>
						<FilterIcon className="h-5 w-5 fill-primary" aria-hidden="true" />
					</Button>

					{activeCount > 0 && (
						<Badge className="absolute -top-2 -right-2 h-5 min-w-5 justify-center rounded-full px-1.5 text-[10px] leading-none">
							{activeCount}
						</Badge>
					)}
				</div>
			</PopoverTrigger>

			<PopoverContent
				align="end"
				className="border-primary/20 w-80 space-y-4 rounded-xl border p-4"
			>
				<div className="space-y-3">
					<h3 className="text-popover-foreground text-sm font-semibold">Период</h3>
					<div className="grid grid-cols-2 gap-2">
						<div className="space-y-1.5">
							<Label htmlFor="records-filter-date-from" className="text-xs">
								с
							</Label>
							<Input
								id="records-filter-date-from"
								type="date"
								value={filters.dateFrom ?? ""}
								onChange={(event) => {
									onChange({
										dateFrom: event.target.value || undefined,
									})
								}}
								className="h-10 text-sm"
							/>
						</div>

						<div className="space-y-1.5">
							<Label htmlFor="records-filter-date-to" className="text-xs">
								до
							</Label>
							<Input
								id="records-filter-date-to"
								type="date"
								value={filters.dateTo ?? ""}
								onChange={(event) => {
									onChange({
										dateTo: event.target.value || undefined,
									})
								}}
								className="h-10 text-sm"
							/>
						</div>
					</div>
				</div>

				{availableTags && availableTags.length > 0 && (
					<>
						<Separator className="bg-primary/10" />
						<div className="space-y-3">
							<h3 className="text-popover-foreground text-sm font-semibold">
								Теги
							</h3>
							<div className="max-h-44 space-y-2 overflow-y-auto pr-1">
								{availableTags.map((tag) => {
									const checked = (filters.tags ?? []).includes(tag.id)

									return (
										<div
											key={tag.id}
											className="flex items-center gap-2"
										>
											<Checkbox
												id={`records-filter-tag-${tag.id}`}
												checked={checked}
												onCheckedChange={(value) => {
													onChange({
														tags: toggleTag(
															filters.tags,
															tag.id,
															value === true,
														),
													})
												}}
											/>
											<Label
												htmlFor={`records-filter-tag-${tag.id}`}
												className="text-popover-foreground cursor-pointer text-sm"
											>
												{tag.name}
											</Label>
										</div>
									)
								})}
							</div>
						</div>
					</>
				)}

				<Separator className="bg-primary/10" />
				<div className="flex justify-end">
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="text-muted-foreground hover:text-popover-foreground hover:bg-muted"
						onClick={() => {
							onChange({
								dateFrom: undefined,
								dateTo: undefined,
								tags: undefined,
								status: undefined,
							})
						}}
					>
						Сбросить
					</Button>
				</div>
			</PopoverContent>
		</Popover>
	)
}
