import type {
	CompressionMessage,
	CompressionOptions,
	WorkerMessage,
} from "./compression.worker"

export interface CompressionTask {
	file: File
	onProgress: (progress: number) => void
	onSuccess: (blob: Blob) => void
	onError: (error: string) => void
}

export class CompressionWorkerManager {
	private worker: Worker | null = null
	private tasks = new Map<number, CompressionTask>()
	private fileIndex = 0

	constructor() {
		this.initWorker()
	}

	private initWorker() {
		if (this.worker) {
			return
		}

		this.worker = new Worker(
			new URL("./compression.worker.ts", import.meta.url),
			{ type: "module" },
		)

		this.worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
			const message = e.data

			switch (message.type) {
				case "progress": {
					const task = this.tasks.get(message.fileIndex)
					task?.onProgress(message.progress)
					break
				}
				case "success": {
					const task = this.tasks.get(message.fileIndex)
					if (task) {
						const blob = new Blob([message.compressedData], {
							type: message.fileType,
						})
						task.onSuccess(blob)
						this.tasks.delete(message.fileIndex)
					}
					break
				}
				case "error": {
					const task = this.tasks.get(message.fileIndex)
					if (task) {
						task.onError(message.error)
						this.tasks.delete(message.fileIndex)
					}
					break
				}
			}
		}

		this.worker.onerror = (error) => {
			console.error("Worker error:", error)
			this.tasks.forEach((task) => {
				task.onError("Worker crashed")
			})
			this.tasks.clear()
			this.worker = null
			this.initWorker()
		}
	}

	async compressFile(
		file: File,
		options?: CompressionOptions,
	): Promise<Blob> {
		return new Promise((resolve, reject) => {
			const fileIndex = this.fileIndex++
			const arrayBufferPromise = file.arrayBuffer()

			arrayBufferPromise
				.then((fileData) => {
					this.tasks.set(fileIndex, {
						file,
						onProgress: () => {
							// Прогресс можно использовать опционально
						},
						onSuccess: resolve,
						onError: reject,
					})

					const message: CompressionMessage = {
						type: "compress",
						fileData,
						fileName: file.name,
						fileType: file.type,
						options,
						fileIndex,
					}

					this.worker?.postMessage(message, [fileData])
				})
				.catch(reject)
		})
	}

	async compressFiles(
		files: File[],
		options?: CompressionOptions,
		onProgress?: (fileIndex: number, progress: number) => void,
		onError?: (fileIndex: number, error: string) => void,
	): Promise<Blob[]> {
		const promises = files.map((file, index) => {
			return new Promise<Blob>((resolve, reject) => {
				const fileIndex = this.fileIndex++

				file.arrayBuffer()
					.then((fileData) => {
						this.tasks.set(fileIndex, {
							file,
							onProgress: (progress) => {
								onProgress?.(index, progress)
							},
							onSuccess: resolve,
							onError: (error) => {
								onError?.(index, error)
								reject(error)
							},
						})

						const message: CompressionMessage = {
							type: "compress",
							fileData,
							fileName: file.name,
							fileType: file.type,
							options,
							fileIndex,
						}

						this.worker?.postMessage(message, [fileData])
					})
					.catch((error) => {
						onError?.(index, error.message)
						reject(error)
					})
			})
		})

		return Promise.all(promises)
	}

	terminate() {
		this.worker?.terminate()
		this.worker = null
		this.tasks.clear()
	}
}

let globalWorkerManager: CompressionWorkerManager | null = null

export function getCompressionWorkerManager(): CompressionWorkerManager {
	if (!globalWorkerManager) {
		globalWorkerManager = new CompressionWorkerManager()
	}
	return globalWorkerManager
}

export function terminateCompressionWorker() {
	if (globalWorkerManager) {
		globalWorkerManager.terminate()
		globalWorkerManager = null
	}
}
