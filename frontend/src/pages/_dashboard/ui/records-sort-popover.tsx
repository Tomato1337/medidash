import type { RecordSortField, SortDirection } from "@/modules/records/domain/types"
import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/ui/button"
import { Label } from "@/shared/ui/label"
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/shared/ui/popover"
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group"
import SortIcon from "@/shared/ui/icons/sort"

interface RecordsSortPopoverProps {
	sortBy: RecordSortField
	sortDir: SortDirection
	onChange: (sortBy: RecordSortField, sortDir: SortDirection) => void
}

const SORT_OPTIONS: Array<{ value: RecordSortField; label: string }> = [
	{ value: "date", label: "Дата записи" },
	{ value: "createdAt", label: "Дата создания" },
	{ value: "title", label: "Название" },
]

const DEFAULT_SORT_BY: RecordSortField = "date"
const DEFAULT_SORT_DIR: SortDirection = "desc"

export function RecordsSortPopover({
	sortBy,
	sortDir,
	onChange,
}: RecordsSortPopoverProps) {
	const isDefaultSort =
		sortBy === DEFAULT_SORT_BY && sortDir === DEFAULT_SORT_DIR

	return (
		<Popover>
			<PopoverTrigger asChild>
				<div className="relative">
					<Button
						variant="ghost"
						size="icon"
						className={cn(
							"bg-background hover:bg-primary/15 h-11 w-11 rounded-lg border border-primary/20",
							!isDefaultSort && "border-primary/40",
						)}
						aria-label="Сортировка"
					>
						<SortIcon className="h-5 w-5 fill-primary" aria-hidden="true" />
					</Button>

					{!isDefaultSort && (
						<span
							className="bg-primary absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full"
							aria-hidden="true"
						></span>
					)}
				</div>
			</PopoverTrigger>

			<PopoverContent
				align="end"
				className="border-primary/20 w-80 space-y-3 rounded-xl border p-4"
			>
				<p className="text-popover-foreground text-sm font-semibold">Сортировка</p>

				<RadioGroup
					value={sortBy}
					onValueChange={(value) => {
						onChange(value as RecordSortField, sortDir)
					}}
					aria-label="Поле сортировки"
					className="gap-2"
				>
					{SORT_OPTIONS.map((option) => {
						const optionId = `records-sort-${option.value}`
						const isSelected = sortBy === option.value

						return (
							<div
								key={option.value}
								className="bg-muted hover:bg-primary/15 flex items-center justify-between rounded-lg p-2"
							>
								<div className="flex items-center gap-2">
									<RadioGroupItem id={optionId} value={option.value} />
									<Label
										htmlFor={optionId}
										className="text-popover-foreground cursor-pointer text-sm"
									>
										{option.label}
									</Label>
								</div>

								<div className="flex items-center gap-1">
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className={cn(
											"h-8 px-2 text-base",
											isSelected && sortDir === "asc"
												? "bg-primary/15 text-popover-foreground"
												: "text-muted-foreground",
										)}
										onClick={() => {
											onChange(option.value, "asc")
										}}
										aria-label={`Сортировать ${option.label} по возрастанию`}
									>
										↑
									</Button>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className={cn(
											"h-8 px-2 text-base",
											isSelected && sortDir === "desc"
												? "bg-primary/15 text-popover-foreground"
												: "text-muted-foreground",
										)}
										onClick={() => {
											onChange(option.value, "desc")
										}}
										aria-label={`Сортировать ${option.label} по убыванию`}
									>
										↓
									</Button>
								</div>
							</div>
						)
					})}
				</RadioGroup>
			</PopoverContent>
		</Popover>
	)
}
