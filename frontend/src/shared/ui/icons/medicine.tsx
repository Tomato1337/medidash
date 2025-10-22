import React from 'react'

interface MedicineIconProps extends React.SVGProps<SVGSVGElement> {}

export default function MedicineIcon({ ...props }: MedicineIconProps) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="81"
            height="80"
            viewBox="0 0 81 80"
            fill="none"
            {...props}
        >
            <path
                d="M65.9967 17.62L47.1667 28.4933V6.75H33.8333V28.4933L15.0033 17.62L8.33667 29.17L27.1633 40.04L8.33667 50.91L15.0033 62.46L33.8333 51.59V73.3333H47.1667V51.59L65.9967 62.46L72.6633 50.91L53.8367 40.04L72.6633 29.17L65.9967 17.62Z"
                className="fill-primary-foreground"
            />
        </svg>
    )
}
