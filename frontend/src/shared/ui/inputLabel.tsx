import React, { useId } from "react"
import { Input } from "./input"
import { FieldLabel } from "./field"
import { cn } from "@/shared/lib/utils"

interface InputLabelProps extends React.ComponentProps<typeof Input> {
	label: string
	renderProps?: React.ReactNode
	ref?: React.Ref<HTMLInputElement>
	error?: string
}

export default function InputLabel({
	label,
	ref,
	renderProps,
	className,
	error,
	...props
}: InputLabelProps) {
	const id = useId()
	return (
		<>
			<div className="relative">
				<Input
					id={id}
					className={cn(
						"peer pt-6",
						className,
						error && "border-destructive text-destructive",
					)}
					{...props}
					placeholder=""
					ref={ref}
				/>
				{renderProps}
				<FieldLabel
					htmlFor={id}
					className={cn(
						"text-muted-foreground absolute top-1 left-3 cursor-text text-xs transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-base peer-focus:top-1 peer-focus:translate-y-0 peer-focus:text-xs",
						error && "text-destructive",
					)}
				>
					{label}
				</FieldLabel>
			</div>
			{error && <p className="text-destructive text-xs">{error}</p>}
		</>
	)
}
