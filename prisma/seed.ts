import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "./generated/prisma"

const connectionString = `${process.env.DATABASE_URL}`
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

async function main() {
	console.log("🌱 Starting database seed...")

	// 1. Создание системных тегов
	console.log("📌 Creating system tags...")

	const systemTags = [
		{
			name: "Анализы",
			description: "Результаты лабораторных анализов",
			color: "#3B82F6",
			isSystem: true,
		},
		{
			name: "Заключения",
			description: "Врачебные заключения и рекомендации",
			color: "#8B5CF6",
			isSystem: true,
		},
		{
			name: "Рецепты",
			description: "Рецепты на лекарственные препараты",
			color: "#10B981",
			isSystem: true,
		},
		{
			name: "МРТ",
			description: "Результаты магнитно-резонансной томографии",
			color: "#F59E0B",
			isSystem: true,
		},
		{
			name: "УЗИ",
			description: "Результаты ультразвукового исследования",
			color: "#06B6D4",
			isSystem: true,
		},
		{
			name: "Рентген",
			description: "Рентгеновские снимки",
			color: "#EF4444",
			isSystem: true,
		},
		{
			name: "КТ",
			description: "Компьютерная томография",
			color: "#EC4899",
			isSystem: true,
		},
		{
			name: "ЭКГ",
			description: "Электрокардиограмма",
			color: "#14B8A6",
			isSystem: true,
		},
		{
			name: "Прививки",
			description: "Информация о вакцинации",
			color: "#84CC16",
			isSystem: true,
		},
		{
			name: "Кардиология",
			description: "Документы по кардиологии",
			color: "#EF4444",
			isSystem: true,
		},
		{
			name: "Неврология",
			description: "Документы по неврологии",
			color: "#8B5CF6",
			isSystem: true,
		},
		{
			name: "Эндокринология",
			description: "Документы по эндокринологии",
			color: "#F59E0B",
			isSystem: true,
		},
		{
			name: "Онкология",
			description: "Онкологические документы",
			color: "#DC2626",
			isSystem: true,
		},
		{
			name: "Терапия",
			description: "Терапевтические документы",
			color: "#3B82F6",
			isSystem: true,
		},
		// --- Новые добавленные тэги ---
		{
			name: "Выписки",
			description: "Выписные эпикризы из стационара",
			color: "#6366F1",
			isSystem: true,
		},
		{
			name: "Направления",
			description: "Направления на обследования и консультации",
			color: "#F43F5E",
			isSystem: true,
		},
		{
			name: "Справки",
			description: "Медицинские справки и больничные",
			color: "#64748B",
			isSystem: true,
		},
		{
			name: "Стоматология",
			description: "Зубы и полость рта",
			color: "#0EA5E9",
			isSystem: true,
		},
		{
			name: "Офтальмология",
			description: "Зрение и глаза",
			color: "#7C3AED",
			isSystem: true,
		},
		{
			name: "ЛОР",
			description: "Оториноларингология",
			color: "#2DD4BF",
			isSystem: true,
		},
		{
			name: "Гинекология",
			description: "Женское здоровье",
			color: "#DB2777",
			isSystem: true,
		},
		{
			name: "Урология",
			description: "Мужское здоровье и мочевыделительная система",
			color: "#2563EB",
			isSystem: true,
		},
		{
			name: "Хирургия",
			description: "Оперативные вмешательства",
			color: "#BE123C",
			isSystem: true,
		},
		{
			name: "Травматология",
			description: "Травмы и переломы",
			color: "#9F1239",
			isSystem: true,
		},
		{
			name: "Дерматология",
			description: "Кожные заболевания",
			color: "#EA580C",
			isSystem: true,
		},
		{
			name: "Гастроэнтерология",
			description: "Желудочно-кишечный тракт",
			color: "#D97706",
			isSystem: true,
		},
	]

	for (const tag of systemTags) {
		await prisma.tag.upsert({
			where: { name: tag.name },
			update: {},
			create: tag,
		})
	}

	console.log(`✅ Created ${systemTags.length} system tags`)

	// 2. Создание системных настроек
	console.log("⚙️ Creating system settings...")

	const systemSettings = [
		// AI Settings
		{ key: "ai.model.text", value: "gpt-4", category: "ai" },
		{
			key: "ai.model.embedding",
			value: "text-embedding-ada-002",
			category: "ai",
		},
		{ key: "ai.max.tokens", value: "2000", category: "ai" },
		{ key: "ai.temperature", value: "0.3", category: "ai" },

		// Processing Settings
		{ key: "processing.chunk.size", value: "500", category: "processing" },
		{
			key: "processing.chunk.overlap",
			value: "50",
			category: "processing",
		},
		{
			key: "processing.max.file.size",
			value: "52428800",
			category: "processing",
		}, // 50MB
		{
			key: "processing.allowed.mimetypes",
			value: "application/pdf,text/plain",
			category: "processing",
		},

		// Storage Settings
		{
			key: "storage.minio.bucket",
			value: "medical-documents",
			category: "storage",
		},
		{ key: "storage.retention.days", value: "3650", category: "storage" }, // 10 years

		// Search Settings
		{ key: "search.results.limit", value: "50", category: "search" },
		{ key: "search.cache.ttl", value: "3600", category: "search" }, // 1 hour
		{ key: "search.semantic.weight", value: "0.7", category: "search" },
		{ key: "search.lexical.weight", value: "0.3", category: "search" },
	]

	for (const setting of systemSettings) {
		await prisma.systemSetting.upsert({
			where: { key: setting.key },
			update: { value: setting.value },
			create: setting,
		})
	}

	console.log(`✅ Created ${systemSettings.length} system settings`)

	console.log("🎉 Database seed completed successfully!")
}

main()
	.catch((e) => {
		console.error("❌ Error during seeding:", e)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
