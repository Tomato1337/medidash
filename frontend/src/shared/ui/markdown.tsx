import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn } from "@/shared/lib/utils"

interface MarkdownProps {
	content: string
	className?: string
}

export function Markdown({ content, className }: MarkdownProps) {
	return (
		<div
			className={cn(
				"prose prose-sm dark:prose-invert max-w-none",
				"prose-headings:text-foreground prose-headings:font-semibold",
				"prose-p:text-foreground prose-p:leading-relaxed",
				"prose-strong:text-foreground prose-strong:font-semibold",
				"prose-ul:text-foreground prose-ol:text-foreground",
				"prose-li:marker:text-primary",
				"prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground",
				"prose-a:text-primary prose-a:underline hover:prose-a:no-underline",
				className,
			)}
		>
			<ReactMarkdown
				remarkPlugins={[remarkGfm]}
				components={{
					h1: ({ children }) => (
						<h1 className="mt-6 mb-4 text-xl font-semibold first:mt-0">
							{children}
						</h1>
					),
					h2: ({ children }) => (
						<h2 className="mt-5 mb-3 text-lg font-semibold first:mt-0">
							{children}
						</h2>
					),
					h3: ({ children }) => (
						<h3 className="mt-4 mb-2 text-base font-semibold first:mt-0">
							{children}
						</h3>
					),
					p: ({ children }) => (
						<p className="mb-3 leading-relaxed last:mb-0">
							{children}
						</p>
					),
					ul: ({ children }) => (
						<ul className="mb-3 list-disc space-y-1 pl-5 last:mb-0">
							{children}
						</ul>
					),
					ol: ({ children }) => (
						<ol className="mb-3 list-decimal space-y-1 pl-5 last:mb-0">
							{children}
						</ol>
					),
					li: ({ children }) => <li className="pl-1">{children}</li>,
					blockquote: ({ children }) => (
						<blockquote className="border-primary bg-primary/5 my-3 border-l-4 py-2 pl-4 italic">
							{children}
						</blockquote>
					),
					strong: ({ children }) => (
						<strong className="font-semibold">{children}</strong>
					),
					a: ({ href, children }) => (
						<a
							href={href}
							target="_blank"
							rel="noopener noreferrer"
							className="text-primary underline hover:no-underline"
						>
							{children}
						</a>
					),
				}}
			>
				{content}
			</ReactMarkdown>
		</div>
	)
}
