export interface CompressionOptions {
	maxSizeMB?: number
	maxWidthOrHeight?: number
	quality?: number
}

export interface CompressionMessage {
	type: "compress"
	fileData: ArrayBuffer
	fileName: string
	fileType: string
	options?: CompressionOptions
	fileIndex: number
}

export interface ProgressMessage {
	type: "progress"
	fileIndex: number
	progress: number
}

export interface SuccessMessage {
	type: "success"
	fileIndex: number
	compressedData: ArrayBuffer
	fileType: string
}

export interface ErrorMessage {
	type: "error"
	fileIndex: number
	error: string
}

export type WorkerMessage = ProgressMessage | SuccessMessage | ErrorMessage

async function compressImageInWorker(
	imageData: ArrayBuffer,
	fileType: string,
	options: CompressionOptions,
	onProgress: (progress: number) => void,
): Promise<ArrayBuffer> {
	const { maxSizeMB = 1, maxWidthOrHeight = 1920, quality = 0.8 } = options

	const blob = new Blob([imageData], { type: fileType })

	const imageBitmap = await createImageBitmap(blob)

	let { width, height } = imageBitmap

	if (width > maxWidthOrHeight || height > maxWidthOrHeight) {
		if (width > height) {
			height = (height / width) * maxWidthOrHeight
			width = maxWidthOrHeight
		} else {
			width = (width / height) * maxWidthOrHeight
			height = maxWidthOrHeight
		}
	}

	const canvas = new OffscreenCanvas(width, height)
	const ctx = canvas.getContext("2d")

	if (!ctx) {
		throw new Error("Failed to get canvas context")
	}

	ctx.drawImage(imageBitmap, 0, 0, width, height)
	imageBitmap.close()

	onProgress(50)

	let resultBlob = await canvas.convertToBlob({ type: fileType, quality })
	let currentQuality = quality

	while (resultBlob.size > maxSizeMB * 1024 * 1024 && currentQuality > 0.1) {
		currentQuality -= 0.1
		resultBlob = await canvas.convertToBlob({
			type: fileType,
			quality: currentQuality,
		})
		onProgress(50 + (quality - currentQuality) * 100)
	}

	onProgress(100)

	return await resultBlob.arrayBuffer()
}

self.onmessage = async (e: MessageEvent<CompressionMessage>) => {
	const { type, fileData, fileType, options = {}, fileIndex } = e.data

	if (type !== "compress") {
		return
	}

	try {
		if (!fileType.startsWith("image/")) {
			self.postMessage({
				type: "success",
				fileIndex,
				compressedData: fileData,
				fileType,
			} satisfies SuccessMessage)
			return
		}

		const compressedData = await compressImageInWorker(
			fileData,
			fileType,
			options,
			(progress) => {
				self.postMessage({
					type: "progress",
					fileIndex,
					progress,
				} satisfies ProgressMessage)
			},
		)

		self.postMessage({
			type: "success",
			fileIndex,
			compressedData,
			fileType,
		} satisfies SuccessMessage)
	} catch (error) {
		self.postMessage({
			type: "error",
			fileIndex,
			error: error instanceof Error ? error.message : "Unknown error",
		} satisfies ErrorMessage)
	}
}
