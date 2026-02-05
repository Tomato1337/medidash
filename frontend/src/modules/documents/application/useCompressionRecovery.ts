import { useEffect, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { db } from "@/shared/lib/indexedDB"
import { DocumentStatus } from "@shared-types"
import { queryKeys } from "@/shared/api/queries"
import { syncManager } from "@/modules/offline"

/**
 * Хук для автоматического восстановления прерванных синхронизаций
 * Проверяет записи со статусом COMPRESSING или UPLOADING и перезапускает процесс
 */
export function useCompressionRecovery() {
	const queryClient = useQueryClient()
	const [isRecovering, setIsRecovering] = useState(false)
	const hasRunRef = useRef(false)

	useEffect(() => {
		// Защита от повторного запуска
		if (hasRunRef.current) return

		const recoverInterruptedSyncs = async () => {
			hasRunRef.current = true

			try {
				setIsRecovering(true)

				// Загружаем записи напрямую из IndexedDB
				const allRecords = await db.records.toArray()

				// Находим записи, которые были прерваны
				const interruptedRecords = allRecords.filter(
					(record) =>
						record.status === DocumentStatus.COMPRESSING ||
						record.status === DocumentStatus.UPLOADING ||
						record.syncStatus === "compressing" ||
						record.syncStatus === "uploading",
				)

				if (interruptedRecords.length === 0) {
					setIsRecovering(false)
					return
				}

				console.log(
					`[CompressionRecovery] Found ${interruptedRecords.length} interrupted syncs. Recovering...`,
				)

				const revalidate = () => {
					queryClient.invalidateQueries({
						queryKey: queryKeys.records.infinite(),
					})
				}

				// Перезапускаем синхронизацию для каждой записи
				for (const record of interruptedRecords) {
					try {
						console.log(
							`[CompressionRecovery] Recovering sync for record: ${record.id}`,
						)
						await syncManager.startSync(record.id, revalidate)
					} catch (error) {
						console.error(
							`[CompressionRecovery] Failed to recover record ${record.id}:`,
							error,
						)
					}
				}
			} catch (error) {
				console.error(
					"[CompressionRecovery] Failed to recover syncs:",
					error,
				)
			} finally {
				setIsRecovering(false)
			}
		}

		// Запускаем восстановление с небольшой задержкой
		// чтобы дать время загрузиться остальной части приложения
		const timeoutId = setTimeout(recoverInterruptedSyncs, 1000)

		return () => clearTimeout(timeoutId)
	}, [queryClient])

	return {
		isRecovering,
	}
}
