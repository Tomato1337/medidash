import * as React from "react"
import { ChevronDownIcon } from "lucide-react"
import { Label } from "./label"
import {
	Popover,
	PopoverAnchor,
	PopoverContent,
	PopoverTrigger,
} from "./popover"
import { Calendar } from "./calendar"
import { Button } from "./button"
import { cn } from "../lib/utils"

interface DatePickerProps {
	date: Date | undefined
	setDate: (date: Date | undefined) => void
	disabled: boolean
}
export function DatePicker({ date, setDate, disabled }: DatePickerProps) {
	const [open, setOpen] = React.useState(false)

	return (
		<div className="flex flex-col gap-3">
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button
						variant="input"
						id="date"
						className={cn(
							"h-full w-full justify-between p-3 font-normal",
							{
								"text-muted-foreground": !date,
							},
						)}
						disabled={disabled}
					>
						{date ? date.toLocaleDateString() : "Выберите дату"}
						<ChevronDownIcon />
					</Button>
				</PopoverTrigger>
				<PopoverContent
					className="w-auto overflow-hidden p-0"
					align="start"
				>
					<Calendar
						mode="single"
						selected={date}
						captionLayout="dropdown"
						onSelect={(date) => {
							setDate(date)
							setOpen(false)
						}}
					/>
				</PopoverContent>
			</Popover>
		</div>
	)
}
