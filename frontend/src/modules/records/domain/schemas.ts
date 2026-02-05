import { z } from "zod"
import { DocumentStatus, FailedPhase } from "@shared-types"

// =============================================================================
// ZOD SCHEMAS (validation)
// =============================================================================

export const idbDocumentSchema = z.object({
	id: z.string(),
	file: z.union([
		z.instanceof(File),
		z.object({
			name: z.string(),
			size: z.number(),
			type: z.string(),
		}),
	]),
	compressed: z
		.union([
			z.instanceof(Blob),
			z.object({
				size: z.number(),
				type: z.string(),
			}),
		])
		.optional(),
	status: z.nativeEnum(DocumentStatus),
	uploadProgress: z.number().optional(),
	errorMessage: z.string().optional(),
	errorPhase: z.nativeEnum(FailedPhase).optional(),
})

export const idbTagSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().nullable().optional(),
	color: z.string().nullable().optional(),
	isSystem: z.boolean(),
	createdAt: z.string(),
	updatedAt: z.string(),
})

export const localRecordSchema = z.object({
	id: z.string(),
	isLocal: z.literal(true),
	title: z.string(),
	description: z.string().optional(),
	summary: z.string().optional(),
	documents: z.array(idbDocumentSchema),
	tags: z.array(idbTagSchema),
	createdAt: z.number(),
	updatedAt: z.number(),
	date: z
		.union([z.string(), z.date()])
		.transform((val) => (typeof val === "string" ? new Date(val) : val))
		.optional(),
	documentCount: z.number(),
	status: z.nativeEnum(DocumentStatus),
	syncStatus: z.enum([
		"pending",
		"compressing",
		"uploading",
		"synced",
		"error",
	]),
	errorPhase: z.nativeEnum(FailedPhase).optional(),
	errorMessage: z.string().optional(),
	retryCount: z.number(),
})
