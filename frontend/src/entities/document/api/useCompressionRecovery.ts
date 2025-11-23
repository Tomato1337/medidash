import { useEffect, useState, useRef } from "react"
import { useCompressLocalRecord } from "./useLocalRecords"
import { db } from "@/shared/lib/indexedDB"
import { DocumentStatus } from "@shared-types"

/**
 * Хук для автоматического восстановления прерванных компрессий
 * Проверяет документы со статусом "compressing" и перезапускает процесс
 */
export function useCompressionRecovery() {
	const compress = useCompressLocalRecord()
	const [isRecovering, setIsRecovering] = useState(false)
	const hasRunRef = useRef(false)

	useEffect(() => {
		// Защита от повторного запуска
		if (hasRunRef.current) return

		const recoverCompression = async () => {
			hasRunRef.current = true

			try {
				setIsRecovering(true)

				// Загружаем документы напрямую из IndexedDB
				const allDocuments = await db.records.toArray()

				// Находим документы, которые были в процессе сжатия
				const compressingDocs = allDocuments.filter(
					(doc) => doc.status === DocumentStatus.COMPRESSING,
				)

				if (compressingDocs.length === 0) {
					setIsRecovering(false)
					return
				}

				console.log(
					`Found ${compressingDocs.length} documents with interrupted compression. Recovering...`,
				)

				// Перезапускаем сжатие для каждого документа
				for (const doc of compressingDocs) {
					try {
						console.log(
							`Recovering compression for document: ${doc.id}`,
						)
						await compress.mutateAsync(doc.id)
					} catch (error) {
						console.error(
							`Failed to recover compression for document ${doc.id}:`,
							error,
						)
					}
				}
			} catch (error) {
				console.error("Failed to recover compressions:", error)
			} finally {
				setIsRecovering(false)
			}
		}

		// Запускаем восстановление с небольшой задержкой
		// чтобы дать время загрузиться остальной части приложения
		const timeoutId = setTimeout(recoverCompression, 1000)

		return () => clearTimeout(timeoutId)
	}, [compress]) // Зависимость от compress для TypeScript

	return {
		isRecovering,
	}
}
