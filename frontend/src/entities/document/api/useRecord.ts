import { useInfiniteQuery, useQuery } from "@tanstack/react-query"
import { useMemo } from "react"
import { client, type DTO } from "@/shared/api/api"
import { useLocalRecord, useLocalRecords } from "./useLocalRecords"
import type { LocalRecord } from "@/shared/lib/indexedDB"

export const isLocalRecord = (
	data: LocalRecord | any | null,
): data is LocalRecord => {
	return data?.isLocal
}

export function useGetRecord(id: string, enabled: boolean = true) {
	return useQuery({
		queryKey: ["record", id],
		queryFn: async () => {
			const { data } = await client.GET("/api/records/{id}", {
				params: { path: { id } },
			})
			return data
		},
		enabled,
	})
}

export function useGetRecords() {
	return useInfiniteQuery({
		queryKey: ["records"],
		queryFn: async ({ pageParam = 1 }) => {
			const { data } = await client.GET("/api/records", {
				params: { query: { page: pageParam, limit: 5 } },
			})
			await new Promise((resolve) => setTimeout(resolve, 1000))
			return data
		},
		initialPageParam: 1,
		getNextPageParam: (lastPage) => {
			if (!lastPage) return undefined
			if (lastPage.page * lastPage.limit < lastPage.total) {
				return lastPage.page + 1
			}
			return undefined
		},
	})
}

export function useRecords() {
	const localDocs = useLocalRecords()
	const serverData = useGetRecords()
	const allRecords = useMemo(() => {
		const localRecordsGrouped =
			localDocs.data?.reduce(
				(acc, doc) => {
					const dateKey = "Локальные"
					if (!acc[dateKey]) {
						acc[dateKey] = []
					}
					acc[dateKey].push({
						...doc,
						isLocal: true,
					})
					return acc
				},
				{} as Record<string, LocalRecord[]>,
			) || {}

		const serverRecordsGrouped =
			serverData.data?.pages.reduce(
				(acc, page) => {
					if (page?.data) {
						if (Array.isArray(page.data)) {
							// Формат: { data: RecordResponseDto[] } - группируем на клиенте
							page.data.forEach((record) => {
								const recordDate = record.date
								let dateKey: string = "Без даты"

								if (
									recordDate &&
									(typeof recordDate === "string" ||
										recordDate instanceof Date)
								) {
									const date = new Date(recordDate)
									const year = date.getFullYear()
									const month = String(
										date.getMonth() + 1,
									).padStart(2, "0")
									const day = String(date.getDate()).padStart(
										2,
										"0",
									)
									dateKey = `${year}-${month}-${day}`
								}

								if (!acc[dateKey]) {
									acc[dateKey] = []
								}
								acc[dateKey]?.push(record)
							})
						} else {
							// Формат: { data: Record<string, RecordResponseDto[]> }
							Object.entries(page.data).forEach(
								([date, records]) => {
									if (!acc[date]) {
										acc[date] = []
									}
									if (Array.isArray(records)) {
										acc[date].push(...records)
									}
								},
							)
						}
					}
					return acc
				},
				{} as Record<string, DTO["RecordsUsersResponseDto"]["data"]>,
			) || {}

		// Сортируем ключи дат (новые сверху, "Без даты" в конце)
		const sortedKeys = Object.keys(serverRecordsGrouped).sort((a, b) => {
			if (a === "Без даты") return 1
			if (b === "Без даты") return -1
			return b.localeCompare(a)
		})

		const sortedServerRecords = sortedKeys.reduce(
			(acc, key) => {
				const records = serverRecordsGrouped[key]
				if (records) {
					acc[key] = records
				}
				return acc
			},
			{} as Record<string, DTO["RecordsUsersResponseDto"]["data"]>,
		)

		return { ...localRecordsGrouped, ...sortedServerRecords }
	}, [localDocs.data, serverData.data])
	console.log(allRecords)
	return {
		...serverData,
		groupedRecords: allRecords,
	}
}

export function useRecord(id: string) {
	const localDocQuery = useLocalRecord(id)
	const localDoc = localDocQuery.data
	console.log(localDoc, id)

	const serverRecord = useGetRecord(id, !localDoc)

	return {
		data: localDoc ?? serverRecord?.data,
		isLocal: isLocalRecord(localDoc),
		isLoading:
			localDocQuery.isLoading || (!localDoc && serverRecord?.isLoading),
		isError: localDocQuery.isError || (!localDoc && serverRecord?.isError),
		error: localDocQuery.error ?? serverRecord?.error,
	}
}
