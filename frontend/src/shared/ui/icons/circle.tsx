import React from 'react'

interface CircleIconProps extends React.SVGProps<SVGSVGElement> {}
export default function CircleIcon({ ...props }: CircleIconProps) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="77"
            height="76"
            viewBox="0 0 77 76"
            fill="none"
            {...props}
        >
            <circle
                cx="38.5"
                cy="38"
                r="38"
                className="fill-primary-foreground"
            />
        </svg>
    )
}
