import { SidebarSeparator, SidebarTrigger } from "@/shared/ui/sidebar"
import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/shared/ui/dialog"
import { useEffect, useMemo, useState } from "react"
import {
	FolderOpen,
	Link as LinkIcon,
	Copy,
	Key,
	AlertTriangle,
	Loader2,
	ChevronDownIcon,
} from "lucide-react"
import {
	CollapsibleContent,
	Collapsible,
	CollapsibleTrigger,
} from "@/shared/ui/collapsible"
import InputLabel from "@/shared/ui/inputLabel"
import {
	createSharedAccessSchema,
	useCreateSharedAccess,
	useRevokeSharedAccess,
	useRevokeSharedAccessSession,
	useSharedAccessList,
	useSharedAccessSessions,
} from "@/modules/shared-access"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { formatDistanceToNow, format } from "date-fns"
import { ru } from "date-fns/locale"
import { Skeleton } from "@/shared/ui/skeleton"
import { toast } from "sonner"
import { UAParser } from "ua-parser-js"
import { subscribeToSharedAccessEvents } from "@/modules/shared-access"
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/shared/api/queries'

export default function AccessPage() {
    const queryClient = useQueryClient()

	const [isCreateOpen, setIsCreateOpen] = useState(false)
	const [generatedPassword, setGeneratedPassword] = useState<string | null>(
		null,
	)
	const createAccess = useCreateSharedAccess()
	const revokeAccess = useRevokeSharedAccess()
	const revokeSession = useRevokeSharedAccessSession()
	const { data: accessList = [], isLoading } = useSharedAccessList()

	const form = useForm({
		resolver: zodResolver(createSharedAccessSchema),
		defaultValues: {
			name: "",
			durationDays: 7,
			currentPassword: "",
		},
	})

	const activeAccesses = useMemo(() => {
		const now = Date.now()
		return accessList.filter((access) => {
			const expiresAt = new Date(access.expiresAt).getTime()
			return access.status === "ACTIVE" && expiresAt > now
		})
	}, [accessList])

	const archivedAccesses = useMemo(() => {
		const now = Date.now()
		return accessList.filter((access) => {
			const expiresAt = new Date(access.expiresAt).getTime()
			return access.status !== "ACTIVE" || expiresAt <= now
		})
	}, [accessList])

	const handleCreate = form.handleSubmit(async (values) => {
		try {
			const data = await createAccess.mutateAsync(values)
			setGeneratedPassword(data.generatedPassword)
			toast.success("Доступ создан")
		} catch (error) {
			const errorMessage =
				error instanceof Error
					? error.message
					: "Не удалось создать доступ"
			if (error.statusCode === 401) {
				form.setError("currentPassword", {
					message: "Неверный пароль",
				})
			}
			toast.error(errorMessage)
		}
	})

	useEffect(() => {
		const unsubscribe = subscribeToSharedAccessEvents((event) => {
			toast.success(`Кто-то вошел в профиль «${event.accessName}»`)
			// Инвалидируем весь namespace — и список доступов, и сессии
			queryClient.invalidateQueries({ queryKey: queryKeys.sharedAccess.all })
		})
		return () => unsubscribe()
	}, [])

	const handleCloseModal = () => {
		setIsCreateOpen(false)
		setGeneratedPassword(null)
		form.reset()
	}

	const handleCopy = async (text: string) => {
		try {
			await navigator.clipboard.writeText(text)
			toast.success("Скопировано")
		} catch {
			toast.error("Не удалось скопировать")
		}
	}

	return (
		<div className="bg-background flex h-full min-h-screen flex-col">
			{/* Header */}
			<div className="flex items-center justify-between px-4 py-4">
				<div className="flex items-center gap-4">
					<SidebarTrigger className="text-primary hover:text-primary/80" />
					<h1 className="text-foreground text-2xl font-semibold">
						Мои доступы
					</h1>
				</div>
				<Button
					className="bg-primary text-primary-foreground font-montserrat rounded-lg font-semibold"
					onClick={() => setIsCreateOpen(true)}
				>
					Создать
				</Button>
			</div>

			<SidebarSeparator className="bg-sidebar-border" />

			{/* Main Content Area */}

			<div className="mt-7 flex flex-1 flex-col px-4 pb-8">
				<h2 className="text-foreground font-montserrat m-0 mb-4 text-2xl font-semibold">
					Активные доступы:
				</h2>
				{isLoading ? (
					<div className="space-y-4">
						<Skeleton className="h-24 w-full rounded-xl" />
						<Skeleton className="h-24 w-full rounded-xl" />
					</div>
				) : activeAccesses.length === 0 ? (
					<div className="flex w-full flex-1 flex-col items-center justify-center gap-6">
						<FolderOpen className="text-primary h-16 w-16" />
						<div className="space-y-2 text-center">
							<h2 className="text-foreground font-montserrat text-2xl font-semibold tracking-tight">
								Доступов ещё нет
							</h2>
							<p className="text-primary font-montserrat text-base">
								Здесь будут отображаться профили, которыми вы
								поделились.
							</p>
						</div>
						<Button
							className="bg-primary text-primary-foreground hover:bg-primary/90 font-montserrat h-12 rounded-lg px-6 py-4 font-semibold"
							onClick={() => setIsCreateOpen(true)}
						>
							Создать
						</Button>
					</div>
				) : (
					<div className="flex-1">
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-[repeat(auto-fit,minmax(min(100%,400px),600px))]">
						{activeAccesses.map((access) => (
							<div
								key={access.id}
								className="bg-card border-border min-h-44 w-full space-y-4 rounded-xl border p-6 shadow-sm"
							>
								<div className="flex items-start justify-between">
									<h3 className="text-sidebar-primary-foreground font-sans text-lg font-semibold">
										{access.name}
									</h3>
									<Badge
										variant={
											access.status === "ACTIVE"
												? "outline"
												: "secondary"
										}
										className={
											access.status === "ACTIVE"
												? "text-primary border-primary bg-muted font-montserrat rounded-full px-3 py-1 text-xs"
												: "font-montserrat rounded-full px-3 py-1 text-xs"
										}
									>
										{formatDistanceToNow(
											new Date(access.expiresAt),
											{
												addSuffix: true,
												locale: ru,
											},
										)}
									</Badge>
								</div>
								<div className="text-primary flex items-center font-sans text-sm">
									Последний вход:{" "}
									{access.lastAccessedAt
										? format(
												new Date(access.lastAccessedAt),
												"dd MMM yyyy, HH:mm",
												{ locale: ru },
											)
										: "ещё не было"}
								</div>
								<div className="mt-4 flex w-full flex-col gap-4 sm:flex-row sm:items-center">
									<div className="bg-muted border-border flex w-full flex-1 items-center gap-2 overflow-hidden rounded-lg border px-3 py-2">
										<LinkIcon className="text-primary h-4 w-4 shrink-0" />
										<span className="text-primary truncate font-sans text-sm">
											{access.shareUrl}
										</span>
										<Copy
											className="text-primary hover:text-primary/80 ml-auto h-4 w-4 shrink-0 cursor-pointer"
											onClick={() =>
												handleCopy(access.shareUrl)
											}
										/>
									</div>

									<Button
										variant="destructive"
										className="font-montserrat shrink-0 rounded-lg font-semibold"
										onClick={() =>
											revokeAccess.mutate(access.id)
										}
										disabled={revokeAccess.isPending}
									>
										Отозвать доступ
									</Button>
								</div>

								<SharedAccessSessions
									accessId={access.id}
									onRevoke={(sessionId) =>
										revokeSession.mutate({
											accessId: access.id,
											sessionId,
										})
									}
								/>
							</div>
						))}
					</div>
                    </div>
				)}
				{archivedAccesses.length > 0 && (
					<Collapsible>
						<CollapsibleTrigger className="group">
							<h2 className="text-foreground font-montserrat m-0 mt-4 mb-4 flex w-full items-center justify-between gap-2 text-2xl font-semibold">
								Архив:
								<ChevronDownIcon className="ml-auto transition group-data-[state=open]:rotate-180" />
							</h2>
						</CollapsibleTrigger>
						<CollapsibleContent>
							<div className="grid grid-cols-1 gap-6 sm:grid-cols-[repeat(auto-fit,minmax(min(100%,400px),600px))]">
								{archivedAccesses.map((access) => (
									<div
										key={access.id}
										className="bg-card border-border min-h-44 w-full space-y-4 rounded-xl border p-6 shadow-sm"
									>
										<div className="flex items-start justify-between">
											<h3 className="text-sidebar-primary font-sans text-lg font-semibold">
												{access.name}
											</h3>
											<Badge
												variant={"secondary"}
												className={
													access.status === "ACTIVE"
														? "text-primary border-primary bg-muted font-montserrat rounded-full px-3 py-1 text-xs"
														: "font-montserrat rounded-full px-3 py-1 text-xs"
												}
											>
												{access.status === "ACTIVE"
													? formatDistanceToNow(
															new Date(
																access.expiresAt,
															),
															{
																addSuffix: true,
																locale: ru,
															},
														)
													: "Отозван"}
											</Badge>
										</div>
										<div className="text-primary flex items-center font-sans text-sm">
											Последний вход:{" "}
											{access.lastAccessedAt
												? format(
														new Date(
															access.lastAccessedAt,
														),
														"dd MMM yyyy, HH:mm",
														{ locale: ru },
													)
												: "ещё не было"}
										</div>
										<div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
											<div className="bg-muted/80 border-border flex w-full flex-1 items-center gap-2 overflow-hidden rounded-lg border px-3 py-2">
												<LinkIcon className="text-primary h-4 w-4 shrink-0" />
												<span className="text-primary truncate font-sans text-sm">
													{access.shareUrl}
												</span>
												<Copy
													className="text-primary hover:text-primary/80 ml-auto h-4 w-4 shrink-0 cursor-pointer"
													onClick={() =>
														handleCopy(
															access.shareUrl,
														)
													}
												/>
											</div>

											<Button
												variant="destructive"
												className="font-montserrat shrink-0 rounded-lg font-semibold"
												disabled
											>
												Отозвать доступ
											</Button>
										</div>
									</div>
								))}
							</div>
						</CollapsibleContent>
					</Collapsible>
				)}
			</div>

			{/* Create Access Modal */}
			<Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
				<DialogContent className="bg-card gap-6 rounded-2xl border-none p-8 shadow-lg sm:max-w-md">
					<DialogHeader className="space-y-2">
						<DialogTitle className="text-sidebar-primary-foreground font-sans text-xl font-semibold">
							Создать доступ
						</DialogTitle>
						<DialogDescription className="text-primary font-sans text-sm">
							Поделитесь профилем с доверенным лицом.
						</DialogDescription>
					</DialogHeader>

					<form className="space-y-4 pt-2" onSubmit={handleCreate}>
						<div className="space-y-2">
							<InputLabel
								label="Имя профиля"
								error={form.formState.errors.name?.message}
								className="bg-input border-border font-montserrat text-primary placeholder:text-primary h-12 rounded-lg"
								{...form.register("name")}
							/>
						</div>
						<div className="space-y-2">
							<InputLabel
								type="number"
								error={
									form.formState.errors.durationDays?.message
								}
								label="Длительность (в днях)"
								className="bg-input border-border font-montserrat text-primary placeholder:text-primary h-12 rounded-lg"
								{...form.register("durationDays", {
									valueAsNumber: true,
								})}
							/>
						</div>

						{generatedPassword && (
							<>
								<div className="bg-muted border-ring flex items-center gap-3 rounded-lg border p-4">
									<Key className="text-primary h-5 w-5 shrink-0" />
									<div className="flex-1 space-y-1">
										<p className="text-primary font-sans text-xs">
											Сгенерированный пароль
										</p>
										<p className="text-foreground font-sans text-base font-semibold tracking-wide">
											{generatedPassword}
										</p>
									</div>
									<Button
										variant="outline"
										className="border-border"
										onClick={() =>
											handleCopy(generatedPassword)
										}
										type="button"
									>
										Скопировать
									</Button>
								</div>

								<div className="flex items-start gap-2 pt-1 pb-1">
									<AlertTriangle className="text-destructive mt-0.5 h-4 w-4 shrink-0" />
									<p className="text-destructive font-sans text-xs leading-relaxed">
										Обязательно сохраните его, он не будет
										показан снова!
									</p>
								</div>
							</>
						)}

						<InputLabel
							label="Ваш текущий пароль (подтверждение)"
							type="password"
							error={
								form.formState.errors?.currentPassword?.message
							}
							className="bg-input border-border font-montserrat text-primary placeholder:text-primary h-12 rounded-lg"
							{...form.register("currentPassword")}
						/>
					</form>

					<DialogFooter className="gap-3 pt-2 sm:justify-end">
						<Button
							type="button"
							variant="outline"
							className="text-primary hover:bg-muted font-montserrat border-none bg-transparent text-base font-semibold"
							onClick={handleCloseModal}
						>
							Отмена
						</Button>
						<Button
							type="button"
							className="bg-primary text-primary-foreground hover:bg-primary/90 font-montserrat rounded-lg px-6 text-base font-semibold"
							onClick={
								generatedPassword
									? handleCloseModal
									: handleCreate
							}
							disabled={createAccess.isPending}
						>
							{createAccess.isPending ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : generatedPassword ? (
								"Готово"
							) : (
								"Создать"
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}

function SharedAccessSessions({
	accessId,
	onRevoke,
}: {
	accessId: string
	onRevoke: (sessionId: string) => void
}) {
	const { data: sessions = [], isLoading } = useSharedAccessSessions(accessId)
	const parser = useMemo(() => new UAParser(), [])

	return (
		<Collapsible>
			<CollapsibleTrigger className="group text-muted-foreground flex w-full items-center gap-2 text-left text-sm">
				Активные сессии ({sessions.length})
				<ChevronDownIcon className="ml-auto transition group-data-[state=open]:rotate-180" />
			</CollapsibleTrigger>
			<CollapsibleContent>
				<div className="mt-3 space-y-3">
					{isLoading && (
						<Skeleton className="h-16 w-full rounded-lg" />
					)}
					{!isLoading && sessions.length === 0 && (
						<p className="text-muted-foreground text-sm">
							Нет активных сессий
						</p>
					)}
					{sessions.map((session) => {
						const ua = parser
							.setUA(session.userAgent || "")
							.getResult()
						const uaLabel = `${ua.browser.name ?? "Browser"}, ${ua.os.name ?? "OS"}`
						return (
							<div
								key={session.id}
								className="bg-muted/50 border-border flex items-center justify-between gap-4 rounded-lg border p-3"
							>
								<div>
									<p className="text-foreground text-sm font-medium">
										{uaLabel}
										{session.ip ? ` • ${session.ip}` : ""}
									</p>
									<p className="text-muted-foreground text-xs">
										Последняя активность:{" "}
										{formatDistanceToNow(
											new Date(session.lastUsedAt),
											{ addSuffix: true, locale: ru },
										)}
									</p>
								</div>
								<Button
									variant="ghost"
									className="text-destructive"
									onClick={() => onRevoke(session.id)}
								>
									Отозвать
								</Button>
							</div>
						)
					})}
				</div>
			</CollapsibleContent>
		</Collapsible>
	)
}
