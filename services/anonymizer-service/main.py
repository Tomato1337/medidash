"""
Anonymizer Service - Python FastAPI сервис для анонимизации текста и OCR

Функции:
- Анонимизация персональных данных (Natasha NER + regex)
- OCR изображений (EasyOCR, русский + английский)
"""

import re
import base64
import logging
from io import BytesIO
from typing import List, Optional
from enum import Enum

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from PIL import Image

# Natasha для NER на русском языке
from natasha import (
    Segmenter,
    MorphVocab,
    NewsEmbedding,
    NewsNERTagger,
    NamesExtractor,
    DatesExtractor,
    AddrExtractor,
    Doc,
)

# Ленивая загрузка EasyOCR (занимает время)
easyocr_reader = None

# ============================================================================
# LOGGING
# ============================================================================

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# ============================================================================
# NATASHA SETUP
# ============================================================================

logger.info("Initializing Natasha NER...")
segmenter = Segmenter()
morph_vocab = MorphVocab()
emb = NewsEmbedding()
ner_tagger = NewsNERTagger(emb)
names_extractor = NamesExtractor(morph_vocab)
dates_extractor = DatesExtractor(morph_vocab)
addr_extractor = AddrExtractor(morph_vocab)
logger.info("✅ Natasha NER initialized")

# ============================================================================
# MODELS
# ============================================================================


class PiiType(str, Enum):
    NAME = "NAME"
    ADDRESS = "ADDRESS"
    PHONE = "PHONE"
    EMAIL = "EMAIL"
    DATE = "DATE"
    ID = "ID"
    OTHER = "OTHER"


class PiiMapping(BaseModel):
    original: str
    replacement: str
    type: PiiType


class AnonymizeRequest(BaseModel):
    text: str


class AnonymizeResponse(BaseModel):
    anonymizedText: str
    piiMappings: List[PiiMapping]


class OcrRequest(BaseModel):
    image: str  # base64 encoded
    mimeType: str


class OcrResponse(BaseModel):
    text: str
    confidence: float
    language: str


class HealthResponse(BaseModel):
    status: str
    natasha_ready: bool
    easyocr_ready: bool


# ============================================================================
# REGEX PATTERNS
# ============================================================================

# Телефоны (российские форматы)
PHONE_PATTERNS = [
    r"\+7[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}",
    r"8[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}",
    r"\(\d{3}\)[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}",
    r"\d{3}[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}",
]

# Email
EMAIL_PATTERN = r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"

# СНИЛС
SNILS_PATTERN = r"\d{3}[\s\-]?\d{3}[\s\-]?\d{3}[\s\-]?\d{2}"

# Паспорт (серия номер)
PASSPORT_PATTERN = r"\d{2}[\s]?\d{2}[\s]?\d{6}"

# ИНН
INN_PATTERN = r"\b\d{10}\b|\b\d{12}\b"

# Полис ОМС
OMS_PATTERN = r"\d{16}"

# Даты (различные форматы)
DATE_PATTERNS = [
    r"\d{2}[./]\d{2}[./]\d{4}",
    r"\d{2}[./]\d{2}[./]\d{2}",
    r"\d{4}[./]\d{2}[./]\d{2}",
]

# ============================================================================
# ANONYMIZATION FUNCTIONS
# ============================================================================


def anonymize_with_natasha(text: str) -> tuple[str, List[PiiMapping]]:
    """Анонимизация с использованием Natasha NER"""
    doc = Doc(text)
    doc.segment(segmenter)
    doc.tag_ner(ner_tagger)

    mappings: List[PiiMapping] = []
    name_counter = 0
    loc_counter = 0
    org_counter = 0

    # Собираем все спаны для замены (сортируем по позиции в обратном порядке)
    spans_to_replace = []

    for span in doc.spans:
        if span.type == "PER":
            name_counter += 1
            replacement = f"[ИМЯ_{name_counter}]"
            pii_type = PiiType.NAME
        elif span.type == "LOC":
            loc_counter += 1
            replacement = f"[АДРЕС_{loc_counter}]"
            pii_type = PiiType.ADDRESS
        elif span.type == "ORG":
            org_counter += 1
            replacement = f"[ОРГАНИЗАЦИЯ_{org_counter}]"
            pii_type = PiiType.OTHER
        else:
            continue

        spans_to_replace.append(
            (span.start, span.stop, span.text, replacement, pii_type)
        )

    # Сортируем по позиции в обратном порядке
    spans_to_replace.sort(key=lambda x: x[0], reverse=True)

    result = text
    for start, stop, original, replacement, pii_type in spans_to_replace:
        result = result[:start] + replacement + result[stop:]
        mappings.append(
            PiiMapping(original=original, replacement=replacement, type=pii_type)
        )

    return result, mappings


def anonymize_with_regex(text: str) -> tuple[str, List[PiiMapping]]:
    """Анонимизация с использованием regex паттернов"""
    mappings: List[PiiMapping] = []
    result = text

    # Телефоны
    phone_counter = 0
    for pattern in PHONE_PATTERNS:
        for match in re.finditer(pattern, result):
            phone_counter += 1
            original = match.group()
            replacement = f"[ТЕЛЕФОН_{phone_counter}]"
            result = result.replace(original, replacement, 1)
            mappings.append(
                PiiMapping(
                    original=original, replacement=replacement, type=PiiType.PHONE
                )
            )

    # Email
    email_counter = 0
    for match in re.finditer(EMAIL_PATTERN, result):
        email_counter += 1
        original = match.group()
        replacement = f"[EMAIL_{email_counter}]"
        result = result.replace(original, replacement, 1)
        mappings.append(
            PiiMapping(original=original, replacement=replacement, type=PiiType.EMAIL)
        )

    # СНИЛС
    snils_counter = 0
    for match in re.finditer(SNILS_PATTERN, result):
        snils_counter += 1
        original = match.group()
        replacement = f"[СНИЛС_{snils_counter}]"
        result = result.replace(original, replacement, 1)
        mappings.append(
            PiiMapping(original=original, replacement=replacement, type=PiiType.ID)
        )

    # Паспорт
    passport_counter = 0
    for match in re.finditer(PASSPORT_PATTERN, result):
        passport_counter += 1
        original = match.group()
        replacement = f"[ПАСПОРТ_{passport_counter}]"
        result = result.replace(original, replacement, 1)
        mappings.append(
            PiiMapping(original=original, replacement=replacement, type=PiiType.ID)
        )

    # Даты (осторожно - могут быть ложные срабатывания)
    date_counter = 0
    for pattern in DATE_PATTERNS:
        for match in re.finditer(pattern, result):
            date_counter += 1
            original = match.group()
            replacement = f"[ДАТА_{date_counter}]"
            result = result.replace(original, replacement, 1)
            mappings.append(
                PiiMapping(
                    original=original, replacement=replacement, type=PiiType.DATE
                )
            )

    return result, mappings


def anonymize_text(text: str) -> AnonymizeResponse:
    """Полная анонимизация текста: NER + regex"""
    # Сначала NER
    result, ner_mappings = anonymize_with_natasha(text)

    # Затем regex для того, что NER не поймал
    result, regex_mappings = anonymize_with_regex(result)

    all_mappings = ner_mappings + regex_mappings

    logger.info(f"Anonymized text: {len(all_mappings)} PII items found")

    return AnonymizeResponse(anonymizedText=result, piiMappings=all_mappings)


# ============================================================================
# OCR FUNCTIONS
# ============================================================================


def get_easyocr_reader():
    """Ленивая инициализация EasyOCR reader"""
    global easyocr_reader
    if easyocr_reader is None:
        logger.info("Initializing EasyOCR (this may take a while)...")
        import easyocr

        easyocr_reader = easyocr.Reader(["ru", "en"], gpu=False)
        logger.info("✅ EasyOCR initialized")
    return easyocr_reader


def extract_text_from_image(image_data: bytes) -> OcrResponse:
    """Извлекает текст из изображения с помощью EasyOCR"""
    reader = get_easyocr_reader()

    # Открываем изображение
    image = Image.open(BytesIO(image_data))

    # Конвертируем в RGB если нужно
    if image.mode != "RGB":
        image = image.convert("RGB")

    # OCR
    results = reader.readtext(image)

    if not results:
        return OcrResponse(text="", confidence=0.0, language="unknown")

    # Собираем текст и считаем среднюю уверенность
    texts = []
    confidences = []

    for bbox, text, confidence in results:
        texts.append(text)
        confidences.append(confidence)

    full_text = " ".join(texts)
    avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0

    logger.info(
        f"OCR completed: {len(full_text)} chars, confidence: {avg_confidence:.2f}"
    )

    return OcrResponse(
        text=full_text, confidence=avg_confidence, language="ru"  # Предполагаем русский
    )


# ============================================================================
# FASTAPI APP
# ============================================================================

from fastapi import APIRouter

app = FastAPI(
    title="Anonymizer Service",
    description="Сервис анонимизации текста и OCR для медицинских документов",
    version="1.0.0",
)

# Роутер с префиксом /api
router = APIRouter(prefix="/api")


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Проверка здоровья сервиса"""
    return HealthResponse(
        status="ok", natasha_ready=True, easyocr_ready=easyocr_reader is not None
    )


@router.post("/anonymize", response_model=AnonymizeResponse)
async def anonymize(request: AnonymizeRequest):
    """
    Анонимизирует текст, заменяя персональные данные на плейсхолдеры.

    Использует:
    - Natasha NER для распознавания имён, адресов, организаций
    - Regex для телефонов, email, СНИЛС, паспортов, дат
    """
    if not request.text:
        raise HTTPException(status_code=400, detail="Text is required")

    try:
        return anonymize_text(request.text)
    except Exception as e:
        logger.error(f"Anonymization error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ocr", response_model=OcrResponse)
async def ocr(request: OcrRequest):
    """
    Извлекает текст из изображения с помощью EasyOCR.

    Поддерживает русский и английский языки.
    Изображение передаётся в base64.
    """
    if not request.image:
        raise HTTPException(status_code=400, detail="Image is required")

    try:
        # Декодируем base64
        image_data = base64.b64decode(request.image)
        return extract_text_from_image(image_data)
    except Exception as e:
        logger.error(f"OCR error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Подключаем роутер к приложению
app.include_router(router)


@app.on_event("startup")
async def startup_event():
    """Предзагрузка EasyOCR при старте (опционально)"""
    logger.info("Anonymizer Service starting...")
    # Можно раскомментировать для предзагрузки OCR:
    # get_easyocr_reader()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
