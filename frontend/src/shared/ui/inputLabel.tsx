import React, { useId } from "react"
import { Input } from "./input"
import { FieldLabel } from "./field"

interface InputLabelProps extends React.ComponentProps<typeof Input> {
	label: string
	renderProps?: React.ReactNode
	ref?: React.Ref<HTMLInputElement>
}

export default function InputLabel({
	label,
	ref,
	renderProps,
	...props
}: InputLabelProps) {
	const id = useId()
	return (
		<div className="relative">
			<Input id={id} {...props} ref={ref} />
			{renderProps}
			<FieldLabel
				htmlFor={id}
				className="text-muted-foreground absolute top-1 left-3 cursor-text text-xs transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-base peer-focus:top-1 peer-focus:translate-y-0 peer-focus:text-xs"
			>
				{label}
			</FieldLabel>
		</div>
	)
}
