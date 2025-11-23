import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/ui/button"
import {
	Dialog,
	DialogTrigger,
	DialogContent,
	DialogClose,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/shared/ui/dialog"
import { PlusIcon, Sparkles } from "lucide-react"
import { useCallback, useState, useMemo } from "react"
import { useDropzone, type FileWithPath } from "react-dropzone"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useCreateAndUploadRecord } from "@/entities/document"
import { customToast } from "@/shared/lib/utils"
import { Field, FieldError } from "@/shared/ui/field"
import InputLabel from "@/shared/ui/inputLabel"
import Tags from "@/shared/ui/tags"
import { DatePicker } from "@/shared/ui/datepicker"
import { useNavigate } from "@tanstack/react-router"
import { useGetTags } from "../api/useGetTags"

export default function CreateDocumentDialog() {
	const navigate = useNavigate()
	const [savedFiles, setSavedFiles] = useState<FileWithPath[]>([])
	const tagsQuery = useGetTags()
	const [open, setOpen] = useState(false)
	const [aiGenerateTitle, setAiGenerateTitle] = useState(true)
	const [aiGenerateTags, setAiGenerateTags] = useState(true)
	const [aiGenerateDate, setAiGenerateDate] = useState(true)

	const createDocumentSchema = useMemo(
		() =>
			z.object({
				title: aiGenerateTitle
					? z.string().optional().default("")
					: z.string().min(1, "Название обязательно"),
				tags: aiGenerateTags
					? z.array(z.string()).optional().default([])
					: z.array(z.string()).min(1, "Хотя бы один тег обязателен"),
				date: aiGenerateDate
					? z.string().optional().default("")
					: z.string().min(1, "Дата обязательна"),
			}),
		[aiGenerateTitle, aiGenerateTags, aiGenerateDate],
	)

	const {
		register,
		handleSubmit,
		formState: { errors },
		reset,
		control,
		setValue,
		clearErrors,
	} = useForm({
		resolver: zodResolver(createDocumentSchema),
		defaultValues: {
			title: "",
			tags: [],
			date: "",
		},
	})

	const createAndUpload = useCreateAndUploadRecord()

	const onDrop = useCallback((acceptedFiles: FileWithPath[]) => {
		setSavedFiles((prevFiles) => {
			const newElements: FileWithPath[] = []

			acceptedFiles.forEach((item) => {
				const isDuplicate = prevFiles.some(
					(saved) => saved.name === item.name,
				)
				if (!isDuplicate) {
					newElements.push(item)
				}
			})

			return [...prevFiles, ...newElements]
		})
	}, [])
	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: {
			"image/png": [".png", ".jpg", ".jpeg", ".webp", ".avif"],
			"application/pdf": [".pdf"],
			"text/plain": [".txt"],
		},
	})

	const onSubmit = async (data: any) => {
		console.log("sd", data)
		if (savedFiles.length === 0) {
			customToast("Добавьте хотя бы один файл", "error")
			return
		}

		// Получаем полные объекты тегов по их ID
		const fullTags = (data.tags || [])
			.map((tagId: string) =>
				tagsQuery.data?.find((tag) => tag.id === tagId),
			)
			.filter(Boolean) // Удаляем undefined значения

		console.log("Full tags with data:", fullTags)

		try {
			const res = await createAndUpload.mutateAsync({
				title: data.title || "",
				files: savedFiles,
				date: data.date || "",
				tags: fullTags,
			})

			customToast("Документ успешно создан!", "success")
			setOpen(false)
			reset()
			setSavedFiles([])
			navigate({ to: "/dashboard/$id", params: { id: res.id } })
		} catch (error) {
			customToast(
				"Ошибка при создании документа",
				"error",
				error instanceof Error ? error.message : undefined,
			)
		}
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button className="bg-primary absolute bottom-0 left-1/2 mb-6 size-16 -translate-x-1/2">
					<PlusIcon className="size-8" />
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[825px]">
				<form onSubmit={handleSubmit(onSubmit)}>
					<DialogHeader>
						<DialogTitle>Создать документ</DialogTitle>
						<DialogDescription>
							Загрузите медицинские документы для обработки
						</DialogDescription>
					</DialogHeader>

					<div className="mt-4 space-y-4">
						<Field data-invalid={!!errors.title}>
							<div className="flex items-start gap-2">
								<div className="relative flex-1">
									<InputLabel
										type="text"
										placeholder=" "
										aria-invalid={!!errors.title}
										className="peer pt-6"
										label="Название"
										disabled={aiGenerateTitle}
										{...register("title")}
									/>
									{aiGenerateTitle && (
										<div className="bg-muted/50 absolute inset-0 flex items-center justify-center rounded-md">
											<p className="text-muted-foreground flex items-center gap-2 text-sm">
												<Sparkles className="size-4" />
												Название будет сгенерировано AI
											</p>
										</div>
									)}
								</div>
								<Button
									type="button"
									variant={
										aiGenerateTitle ? "default" : "outline"
									}
									size="icon"
									className="mt-1 shrink-0"
									onClick={() => {
										setAiGenerateTitle(!aiGenerateTitle)
										setValue("title", "")
										clearErrors("title")
									}}
								>
									<Sparkles
										className={cn(
											"size-4",
											aiGenerateTitle && "animate-pulse",
										)}
									/>
								</Button>
							</div>
							{errors.title && (
								<FieldError>{errors.title.message}</FieldError>
							)}
						</Field>
						<Field data-invalid={!!errors.date}>
							<div className="flex items-center gap-2">
								<div className="relative flex-1">
									<Controller
										name="date"
										control={control}
										render={({ field }) => (
											<>
												<DatePicker
													date={
														field.value
															? new Date(
																	field.value,
																)
															: undefined
													}
													setDate={(date) => {
														field.onChange(
															date
																? date.toISOString()
																: undefined,
														)
													}}
													disabled={aiGenerateDate}
												/>
												{aiGenerateDate && (
													<div className="bg-muted/50 absolute inset-0 flex items-center justify-center rounded-md">
														<p className="text-muted-foreground flex items-center gap-2 text-sm">
															<Sparkles className="size-4" />
															Дата будет
															сгенерирована AI
														</p>
													</div>
												)}
											</>
										)}
									/>
								</div>
								<Button
									type="button"
									variant={
										aiGenerateDate ? "default" : "outline"
									}
									size="icon"
									className="mt-1 shrink-0"
									onClick={() => {
										setAiGenerateDate(!aiGenerateDate)
										setValue("date", "")
										clearErrors("date")
									}}
								>
									<Sparkles
										className={cn(
											"size-4",
											aiGenerateDate && "animate-pulse",
										)}
									/>
								</Button>
							</div>
							{errors.date && (
								<FieldError>{errors.date.message}</FieldError>
							)}
						</Field>
						<Field data-invalid={!!errors.tags}>
							<div className="flex items-start gap-2">
								<div className="relative flex-1">
									<Controller
										name="tags"
										control={control}
										render={({ field }) => (
											<>
												<Tags
													pickedTags={
														new Set(
															field.value || [],
														)
													}
													setPickedTags={(
														newTags,
													) => {
														field.onChange(
															Array.from(newTags),
														)
													}}
													tags={tagsQuery.data || []}
													isLoading={
														tagsQuery.isLoading
													}
													disabled={aiGenerateTags}
												/>
												{aiGenerateTags && (
													<div className="bg-muted/50 absolute inset-0 flex items-center justify-center rounded-md">
														<p className="text-muted-foreground flex items-center gap-2 text-sm">
															<Sparkles className="size-4" />
															Тэги будут
															сгенерированы AI
														</p>
													</div>
												)}
											</>
										)}
									/>
								</div>
								<Button
									type="button"
									variant={
										aiGenerateTags ? "default" : "outline"
									}
									size="icon"
									className="mt-1 shrink-0"
									onClick={() => {
										setAiGenerateTags(!aiGenerateTags)
										setValue("tags", [])
										clearErrors("tags")
									}}
								>
									<Sparkles
										className={cn(
											"size-4",
											aiGenerateTags && "animate-pulse",
										)}
									/>
								</Button>
							</div>
							{errors.tags && (
								<FieldError>{errors.tags.message}</FieldError>
							)}
						</Field>
					</div>
					<div className="mt-4 max-h-[80vh] overflow-auto">
						<div
							{...getRootProps()}
							className={cn(
								"hover:border-primary/70 flex min-h-[30vh] cursor-pointer flex-col items-center justify-center rounded-lg border-3 border-dashed p-4 transition-colors",
								{
									"border-primary": isDragActive,
								},
							)}
						>
							<input
								{...getInputProps()}
								type="file"
								multiple
								className="file-input file-input-bordered h-full w-full"
							/>
							{isDragActive ? (
								<p>Перетащите файлы сюда...</p>
							) : (
								<p>
									Перетащите файлы сюда или кликните для
									выбора файлов
								</p>
							)}
							<div className="max-h-96 w-full overflow-auto overflow-x-hidden">
								{savedFiles.length > 0 && (
									<div className="mt-4 grid w-full auto-rows-fr gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
										{savedFiles.map((file, index) => (
											<div
												className="group relative flex aspect-square items-center justify-center rounded-lg border p-4"
												key={`${file.path}-${index}`}
											>
												<button
													type="button"
													onClick={(e) => {
														e.stopPropagation()
														setSavedFiles((prev) =>
															prev.filter(
																(_, i) =>
																	i !== index,
															),
														)
													}}
													className="absolute top-2 right-2 flex h-16 w-16 cursor-pointer items-center justify-center"
												>
													<div className="bg-destructive text-destructive-foreground hover:bg-destructive/90 absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full text-xs opacity-0 transition-opacity group-hover:opacity-100">
														✕
													</div>
												</button>
												<h3
													onClick={(e) => {
														e.stopPropagation()
													}}
													className="cursor-default text-sm font-medium"
												>
													{file.path}
												</h3>
											</div>
										))}
									</div>
								)}
							</div>
						</div>
					</div>

					<DialogFooter className="mt-4">
						<DialogClose asChild>
							<Button
								onClick={() => {
									reset()
								}}
								type="button"
								variant="outline"
							>
								Отмена
							</Button>
						</DialogClose>
						<Button
							type="submit"
							disabled={createAndUpload.isPending}
						>
							{createAndUpload.isPending
								? "Создание..."
								: "Создать документ"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
