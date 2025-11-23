import { getCompressionWorkerManager } from "./compressionWorkerManager"

export interface CompressionOptions {
	maxSizeMB?: number
	maxWidthOrHeight?: number
	quality?: number
}

export async function compressFiles(
	files: File[],
	onProgress?: (fileIndex: number, progress: number) => void,
	onError?: (fileIndex: number, error: string) => void,
): Promise<Blob[]> {
	const workerManager = getCompressionWorkerManager()

	return workerManager.compressFiles(
		files,
		{
			maxSizeMB: 10,
			maxWidthOrHeight: 1920,
			quality: 0.8,
		},
		onProgress,
		onError,
	)
}
