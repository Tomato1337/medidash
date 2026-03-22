import { cn } from '../lib/utils'

interface LogoProps extends React.HTMLAttributes<HTMLDivElement> {
    isLight?: boolean
    size?: "small" | "medium" | "large"
}

export const Logo = ({isLight = false, size = "medium", className, ...props}: LogoProps ) => {
    let sizes = {
        firstLetter: "first-letter:text-3xl",
        rest: "text-2xl",
    }

    switch (size) {
        case "small":
            sizes = {
                firstLetter: "first-letter:text-2xl",
                rest: "text-lg",
            }
            break
        case "large":
            sizes = {
                firstLetter: "first-letter:text-4xl",
                rest: "text-3xl",
            }
            break
    }

  return (
   <div className={cn("font-syne first-letter:uppercase first-letter:text-primary text-accent leading-none font-extrabold group-data-[collapsible=icon]:hidden", isLight && "text-primary", sizes.rest, sizes.firstLetter, className)} {...props}>
            medidash
        </div>
  )
}
