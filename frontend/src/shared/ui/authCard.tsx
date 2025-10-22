import { Card } from "@/shared/ui/card"
import MedicineIcon from "@/shared/ui/icons/medicine"
import StarIcon from "@/shared/ui/icons/star"
import CircleIcon from "@/shared/ui/icons/circle"
import { cn } from "../lib/utils"

export default function AuthCard({
	isRegister = false,
}: {
	isRegister?: boolean
}) {
	return (
		<div
			className={cn(
				"hidden items-center justify-center p-12 lg:flex lg:w-1/2 lg:justify-end",
				{
					"lg:justify-start": isRegister,
				},
			)}
		>
			<Card className="bg-background flex w-full max-w-md flex-col justify-between rounded-3xl border-3 p-4 text-white shadow-2xl">
				<div className="from-primary to-secondary-foreground flex-1 rounded-2xl bg-gradient-to-br p-4">
					<CircleIcon className="size-20" />

					<div className="space-y-6">
						<h2 className="font-syne text-5xl font-normal tracking-widest">
							save <span className="font-extrabold">your</span>
							<br />
							health
							<br />
							documents
							<br />
							<span className="font-extrabold">easy</span>
						</h2>
					</div>
					<div className="flex items-center justify-between">
						<MedicineIcon className="size-24 animate-spin [animation-duration:12s]" />
						<StarIcon className="size-24" />
					</div>
				</div>

				<div className="font-syne text-primary text-4xl font-extrabold">
					medidash
				</div>
			</Card>
		</div>
	)
}
