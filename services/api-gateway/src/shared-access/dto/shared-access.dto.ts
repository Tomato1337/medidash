import { ApiProperty } from "@nestjs/swagger"
import { IsInt, IsNotEmpty, IsString, MaxLength, Min } from "class-validator"

export class CreateSharedAccessDto {
	@ApiProperty({
		example: "Для терапевта",
		description: "Название профиля доступа",
	})
	@IsString()
	@IsNotEmpty()
	@MaxLength(100)
	name: string

	@ApiProperty({
		example: 7,
		description: "Длительность доступа в днях",
	})
	@IsInt()
	@Min(1)
	durationDays: number

	@ApiProperty({
		example: "currentPassword123",
		description: "Текущий пароль владельца (подтверждение личности)",
	})
	@IsString()
	@IsNotEmpty()
	currentPassword: string
}

export class VerifySharedAccessDto {
	@ApiProperty({
		example: "xA9$2mPq",
		description: "Пароль для входа по гостевой ссылке",
	})
	@IsString()
	@IsNotEmpty()
	password: string
}

export class SharedAccessInfoResponseDto {
	@ApiProperty({
		example: "Иван П.",
		description: "Имя владельца профиля",
	})
	ownerName: string

	@ApiProperty({
		example: "active",
		description: "Статус доступа",
		enum: ["active", "revoked", "expired"],
	})
	status: "active" | "revoked" | "expired"

	@ApiProperty({
		example: "cm3access123",
		description: "ID владельца доступа",
	})
	ownerId: string
}

export class SharedAccessSessionResponseDto {
	@ApiProperty({
		example: "cm3abc123",
		description: "ID сессии (refresh токена)",
	})
	id: string

	@ApiProperty({
		example: "192.168.1.42",
		description: "IP адрес гостя",
		type: String,
		nullable: true,
		required: false,
	})
	ip: string | null

	@ApiProperty({
		example: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
		description: "User-Agent браузера",
		type: String,
		nullable: true,
		required: false,
	})
	userAgent: string | null

	@ApiProperty({
		example: "2026-03-01T12:00:00.000Z",
		description: "Последняя активность (refresh) по сессии",
	})
	lastUsedAt: Date

	@ApiProperty({
		example: "2026-03-01T10:00:00.000Z",
		description: "Когда сессия создана",
	})
	createdAt: Date

	@ApiProperty({
		example: "2026-03-02T10:00:00.000Z",
		description: "Когда сессия истекает",
	})
	expiresAt: Date
}

export class SharedAccessResponseDto {
	@ApiProperty({
		example: "cm3access123",
		description: "ID доступа",
	})
	id: string

	@ApiProperty({
		example: "Для терапевта",
		description: "Название профиля доступа",
	})
	name: string

	@ApiProperty({
		example: "ACTIVE",
		description: "Статус доступа",
	})
	status: string

	@ApiProperty({
		example: "qwerty1234567890token",
		description: "Токен для ссылки",
	})
	token: string

	@ApiProperty({
		example: "2026-03-02T10:00:00.000Z",
		description: "Когда доступ истекает",
	})
	expiresAt: Date

	@ApiProperty({
		example: "2026-03-01T10:30:00.000Z",
		description: "Последний вход по ссылке",
		type: String,
		format: "date-time",
		nullable: true,
		required: false,
	})
	lastAccessedAt: Date | null

	@ApiProperty({
		example: "2026-03-01T10:00:00.000Z",
		description: "Дата создания доступа",
	})
	createdAt: Date

	@ApiProperty({
		example: "http://localhost:5173/shared/qwerty1234567890token",
		description: "Полная ссылка для доступа",
	})
	shareUrl: string

	@ApiProperty({
		example: 2,
		description: "Количество активных сессий",
	})
	activeSessionsCount: number
}

export class CreateSharedAccessResponseDto extends SharedAccessResponseDto {
	@ApiProperty({
		example: "xA9$2mPq",
		description: "Сгенерированный пароль (показывается один раз)",
	})
	generatedPassword: string
}
