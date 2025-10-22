import React from 'react'

interface StarIconProps extends React.SVGProps<SVGSVGElement> {}

export default function StarIcon({ ...props }: StarIconProps) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="77"
            height="73"
            viewBox="0 0 77 73"
            fill="none"
            {...props}
        >
            <path
                d="M38.5 0L47.4806 27.6393H76.5423L53.0309 44.7214L62.0114 72.3607L38.5 55.2786L14.9886 72.3607L23.9691 44.7214L0.457741 27.6393H29.5194L38.5 0Z"
                className="fill-primary-foreground"
            />
        </svg>
    )
}
