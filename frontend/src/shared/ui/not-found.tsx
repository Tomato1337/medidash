import { CircleQuestionMark } from 'lucide-react'

export function NotFound({className, ...props}: React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div className={className} {...props}>
            <CircleQuestionMark
                className="text-primary-foreground mx-auto size-32"
                aria-hidden="true"
            />
            <h2 className="text-primary-foreground mt-4 text-center text-2xl font-semibold">
                Нет результатов по вашему запросу
            </h2>
        </div>
	)
}
