import {
	Controller,
	Post,
	Get,
	Param,
	HttpException,
	HttpStatus,
	HttpCode,
} from "@nestjs/common"
import {
	ApiTags,
	ApiOperation,
	ApiResponse,
	ApiParam,
	ApiBody,
	ApiBadRequestResponse,
	ApiNotFoundResponse,
} from "@nestjs/swagger"
import { FailedPhase, FailedPhaseValues } from "@shared-types"
import { RecoveryService } from "./recovery.service"
import {
	RecoveryResponseDto,
	ProcessingStatusResponseDto,
	HealthCheckResponseDto,
	QueuesStatusResponseDto,
} from "./dto/recovery.dto"

@ApiTags("Processing")
@Controller("processing")
export class RecoveryController {
	constructor(private readonly recoveryService: RecoveryService) {}

	/**
	 * Перезапускает обработку документов для указанной фазы
	 */
	@Post("records/:recordId/retry/:phase")
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: "Перезапуск обработки документов",
		description: `
Перезапускает обработку документов Record для указанной фазы.

**Фаза "PARSING":**
- Находит документы со статусом FAILED и failedPhase="parsing"
- Сбрасывает статус на PARSING
- Добавляет задачи в очередь парсинга

**Фаза "PROCESSING":**
- Находит документы со статусом FAILED и failedPhase="processing"
- Также включает документы со статусом PROCESSING (спарсены, но AI упал)
- Добавляет задачу в очередь AI обработки

Использует существующие данные: для фазы "processing" повторный парсинг не выполняется.
		`,
	})
	@ApiParam({
		name: "recordId",
		description: "ID записи (Record)",
		example: "clx1234567890",
	})
	@ApiParam({
		name: "phase",
		description: "Фаза обработки для перезапуска",
		enum: ["PARSING", "PROCESSING"],
		example: "PARSING",
	})
	@ApiResponse({
		status: 200,
		description: "Обработка успешно перезапущена",
		type: RecoveryResponseDto,
	})
	@ApiBody({ required: false })
	@ApiBadRequestResponse({
		description: "Неверная фаза или нет документов для перезапуска",
	})
	@ApiNotFoundResponse({
		description: "Record не найден",
	})
	async retryProcessing(
		@Param("recordId") recordId: string,
		@Param("phase") phase: string,
	): Promise<RecoveryResponseDto> {
		// Валидация фазы
		if (phase !== FailedPhase.PARSING && phase !== FailedPhase.PROCESSING) {
			throw new HttpException(
				`Invalid phase: ${phase}. Must be "${FailedPhase.PARSING}" or "${FailedPhase.PROCESSING}"`,
				HttpStatus.BAD_REQUEST,
			)
		}

		return this.recoveryService.retryProcessing(
			recordId,
			phase as FailedPhaseValues,
		)
	}

	/**
	 * Получает статус обработки Record
	 */
	@Get("records/:recordId/status")
	@ApiOperation({
		summary: "Получить статус обработки записи",
		description: `
Возвращает текущий статус обработки Record и всех его документов.

**Информация включает:**
- Общий статус записи (UPLOADING, PARSING, PROCESSING, COMPLETED, FAILED)
- Статус каждого документа
- Фаза ошибки для документов со статусом FAILED
- Статистика очередей (ожидающие, активные, неудачные задачи)
		`,
	})
	@ApiParam({
		name: "recordId",
		description: "ID записи (Record)",
		example: "clx1234567890",
	})
	@ApiResponse({
		status: 200,
		description: "Статус обработки записи",
		type: ProcessingStatusResponseDto,
	})
	@ApiNotFoundResponse({
		description: "Record не найден",
	})
	async getProcessingStatus(
		@Param("recordId") recordId: string,
	): Promise<ProcessingStatusResponseDto> {
		return this.recoveryService.getProcessingStatus(recordId)
	}

	/**
	 * Health check endpoint
	 */
	@Get("health")
	@ApiOperation({
		summary: "Проверка здоровья сервиса",
		description: `
Возвращает информацию о состоянии Processing Service.

**Проверяется:**
- Подключение к Redis
- Подключение к базе данных PostgreSQL
- Доступность очереди парсинга
- Доступность очереди AI обработки
		`,
	})
	@ApiResponse({
		status: 200,
		description: "Состояние сервиса",
		type: HealthCheckResponseDto,
	})
	async healthCheck(): Promise<HealthCheckResponseDto> {
		return this.recoveryService.getHealthCheck()
	}

	/**
	 * Статус очередей
	 */
	@Get("queues")
	@ApiOperation({
		summary: "Получить статус очередей",
		description: `
Возвращает статистику по очередям обработки.

**Очереди:**
- **parsing-queue**: Очередь парсинга документов (concurrency: 2)
- **ai-processing-queue**: Очередь AI обработки (concurrency: 1)

**Статистика включает:**
- Количество задач в ожидании
- Количество активных задач
- Количество неудачных задач
		`,
	})
	@ApiResponse({
		status: 200,
		description: "Статус очередей",
		type: QueuesStatusResponseDto,
	})
	async getQueuesStatus(): Promise<QueuesStatusResponseDto> {
		return this.recoveryService.getQueuesStatus()
	}
}
