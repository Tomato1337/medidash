"""
Anonymizer Service - Python FastAPI сервис для анонимизации текста и OCR

Функции:
- Анонимизация персональных данных (spaCy NER + regex)
- OCR изображений (Tesseract, русский + английский)
"""

import base64
import logging
import re
from enum import Enum
from io import BytesIO
from typing import Dict, List, Set, Tuple

import pytesseract
import spacy
from fastapi import APIRouter, FastAPI, HTTPException
from PIL import Image
from pydantic import BaseModel

# ============================================================================
# LOGGING
# ============================================================================

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# ============================================================================
# SPACY SETUP
# ============================================================================

logger.info("Initializing spaCy NER...")
nlp = spacy.load("ru_core_news_md")
logger.info("✅ spaCy NER initialized")

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
    spacy_ready: bool
    tesseract_ready: bool


# ============================================================================
# ANONYMIZER
# ============================================================================


class MedicalTextAnonymizer:
    """Класс для анонимизации медицинских документов на русском языке"""

    def __init__(self, model: "spacy.language.Language"):
        self.nlp = model

        self.patterns = {
            "contextual_name": [
                r"(?:пациент|врач|доктор|исполнитель|фио)[:\s]+([А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+(?:\s+[А-ЯЁ][а-яё]+)?)",
                r"(?:пациент|врач|доктор|исполнитель|фио)[:\s]+([А-ЯЁ]+\s+[А-ЯЁ]+(?:\s+[А-ЯЁ]+)?)",
                r"(?:пациент|врач|доктор|исполнитель|фио)[:\s]+([а-яё]+\s+[а-яё]+(?:\s+[а-яё]+)?)",
            ],
            "age": [
                r"\b\d{1,3}\s*(?:лет|года|год)\b",
                r"\bвозраст[:\s]+\d{1,3}\s*(?:лет|года|год)?\b",
            ],
            "phone": [
                r"\+?7[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}",
                r"8[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}",
            ],
            "snils": [
                r"\b\d{3}[\s\-]?\d{3}[\s\-]?\d{3}[\s\-]?\d{2}\b",
            ],
            "passport": [
                r"\b\d{4}[\s№]?\d{6}\b",
                r"[IVXLCDМ]{1,3}[\s\-]?[А-ЯЁ]{2}[\s]?№?\d{6,7}",
            ],
            "inn": [
                r"\bинн[\s:№]*\d{10}\b",
                r"\bинн[\s:№]*\d{12}\b",
            ],
            "oms": [
                r"\bполис[\s]*(омс)?[\s:№]*\d{16}\b",
            ],
            "date_birth": [
                r"\b(?:0?[1-9]|[12][0-9]|3[01])[./\-](?:0?[1-9]|1[012])[./\-](?:19|20)?\d{2}\b",
                r"\b(?:19|20)\d{2}[./\-](?:0?[1-9]|1[012])[./\-](?:0?[1-9]|[12][0-9]|3[01])\b",
            ],
            "email": [
                r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Z|a-z]{2,}\b",
            ],
            "initials": [
                r"\b[А-ЯЁа-яё]\.[А-ЯЁа-яё]\.",
                r"\b[А-ЯЁа-яё]\.\s?[А-ЯЁа-яё]\.",
            ],
        }

        self.medical_stopwords: Set[str] = {
            "головной мозг",
            "белое вещество",
            "серое вещество",
            "кора мозга",
            "боковые желудочки",
            "третий желудочек",
            "четвертый желудочек",
            "мозжечок",
            "ствол мозга",
            "мозолистое тело",
            "гипофиз",
            "хиазма",
            "миндалины мозжечка",
            "срединные структуры",
            "конвекситальные пространства",
            "субарахноидальные пространства",
            "мостомозжечковые углы",
            "внутренние слуховые",
            "затылочное отверстие",
            "боковые щели",
            "воронка гипофиза",
            "хиазмальная область",
            "перивентрикулярная инфильтрация",
            "глазные яблоки",
            "придаточные пазухи",
            "пазухи носа",
            "орбиты",
            "мр сигнал",
            "контрастное усиление",
            "режимах",
            "проекциях",
            "структурных изменений",
            "очаговые изменения",
            "диффузные изменения",
            "патологических изменений",
            "дополнительных образований",
            "диагноз",
            "заключение",
            "исследование",
            "анализ",
            "протокол",
            "область исследования",
            "метод",
            "описание",
            "результат",
            "пневматизация",
            "инфильтрация",
            "конфигурация",
            "симметричны",
            "расширены",
            "деформирован",
            "смещены",
            "увеличен",
            "обычной формы",
            "правильно развиты",
            "нормальная интенсивность",
            "москва",
            "санкт петербург",
            "петербург",
            "россия",
            "российская федерация",
            "январь",
            "февраль",
            "март",
            "апрель",
            "май",
            "июнь",
            "июль",
            "август",
            "сентябрь",
            "октябрь",
            "ноябрь",
            "декабрь",
            "понедельник",
            "вторник",
            "среда",
            "четверг",
            "пятница",
            "суббота",
            "воскресенье",
            "улица",
            "проспект",
            "переулок",
            "площадь",
            "район",
            "область",
            "поликлиника",
            "больница",
            "клиника",
            "госпиталь",
            "центр",
            "медицинский центр",
            "диагностический центр",
        }

        self.replacements = {
            "PER": "[ИМЯ]",
            "PERSON": "[ИМЯ]",
            "LOC": "[АДРЕС]",
            "GPE": "[АДРЕС]",
            "ORG": "[ОРГАНИЗАЦИЯ]",
            "contextual_name": "[ИМЯ]",
            "age": "[ВОЗРАСТ]",
            "phone": "[ТЕЛЕФОН]",
            "snils": "[СНИЛС]",
            "passport": "[ПАСПОРТ]",
            "inn": "[ИНН]",
            "oms": "[ОМС]",
            "date_birth": "[ДАТА]",
            "email": "[EMAIL]",
            "initials": "[ИНИЦИАЛЫ]",
        }

        self.pii_type_map = {
            "PER": PiiType.NAME,
            "PERSON": PiiType.NAME,
            "contextual_name": PiiType.NAME,
            "LOC": PiiType.ADDRESS,
            "GPE": PiiType.ADDRESS,
            "ORG": PiiType.OTHER,
            "phone": PiiType.PHONE,
            "email": PiiType.EMAIL,
            "date_birth": PiiType.DATE,
            "age": PiiType.OTHER,
            "snils": PiiType.ID,
            "passport": PiiType.ID,
            "inn": PiiType.ID,
            "oms": PiiType.ID,
            "initials": PiiType.NAME,
        }

    def is_medical_term(self, text: str) -> bool:
        text_lower = text.lower().strip()

        if text_lower in self.medical_stopwords:
            return True

        for stopword in self.medical_stopwords:
            if stopword in text_lower or text_lower in stopword:
                return True

        medical_patterns = [
            r"\bт[12]\b",
            r"\bt[12]\b",
            r"\bflair\b",
            r"\bdwi\b",
            r"желудочк",
            r"вещество",
            r"структур",
            r"изменени",
            r"расширен",
            r"деформ",
            r"смещен",
            r"образовани",
        ]

        for pattern in medical_patterns:
            if re.search(pattern, text_lower):
                return True

        return False

    def find_regex_matches(self, text: str) -> List[Tuple[int, int, str]]:
        matches = []

        for category, patterns in self.patterns.items():
            for pattern in patterns:
                for match in re.finditer(pattern, text, re.IGNORECASE | re.UNICODE):
                    if category == "contextual_name":
                        if match.groups():
                            name_group = match.group(1)
                            name_start = match.start(1)
                            name_end = match.end(1)

                            if not self.is_medical_term(name_group):
                                matches.append((name_start, name_end, category))
                        continue

                    if category == "date_birth":
                        window = text[max(0, match.start() - 10) : match.end() + 10].lower()
                        if any(x in window for x in ["мм рт", "мкг", "мг/", "ед/"]):
                            continue

                    matches.append((match.start(), match.end(), category))

        return sorted(matches, key=lambda x: x[0])

    def find_ner_entities(self, text: str) -> List[Tuple[int, int, str]]:
        doc = self.nlp(text)

        entities = []
        for ent in doc.ents:
            if ent.label_ in ["PER", "PERSON"] and not self.is_medical_term(ent.text):
                entities.append((ent.start_char, ent.end_char, ent.label_))
            elif ent.label_ in ["LOC", "GPE", "ORG"]:
                entities.append((ent.start_char, ent.end_char, ent.label_))

        return entities

    def merge_overlapping(
        self, entities: List[Tuple[int, int, str]]
    ) -> List[Tuple[int, int, str]]:
        if not entities:
            return []

        merged = []
        current = entities[0]

        for next_entity in entities[1:]:
            if next_entity[0] <= current[1] + 2:
                priority_order = [
                    "phone",
                    "snils",
                    "passport",
                    "inn",
                    "oms",
                    "email",
                    "age",
                    "initials",
                    "date_birth",
                    "contextual_name",
                    "PERSON",
                    "PER",
                    "ORG",
                    "LOC",
                    "GPE",
                ]

                current_priority = (
                    priority_order.index(current[2])
                    if current[2] in priority_order
                    else 999
                )
                next_priority = (
                    priority_order.index(next_entity[2])
                    if next_entity[2] in priority_order
                    else 999
                )

                better_label = current[2] if current_priority <= next_priority else next_entity[2]

                current = (
                    min(current[0], next_entity[0]),
                    max(current[1], next_entity[1]),
                    better_label,
                )
            else:
                merged.append(current)
                current = next_entity

        merged.append(current)
        return merged

    def anonymize_text(self, text: str) -> AnonymizeResponse:
        ner_entities = self.find_ner_entities(text)
        regex_matches = self.find_regex_matches(text)

        merged_entities = self.merge_overlapping(
            sorted(ner_entities + regex_matches, key=lambda x: x[0])
        )

        replacements: List[Tuple[int, int, str, PiiType, str]] = []
        label_counters: Dict[str, int] = {}

        for start, end, label in merged_entities:
            pii_type = self.pii_type_map.get(label, PiiType.OTHER)
            base_label = self.replacements.get(label, "[ДАННЫЕ]")
            if base_label.startswith("[") and base_label.endswith("]"):
                base_label = base_label[1:-1]

            label_counters[base_label] = label_counters.get(base_label, 0) + 1
            replacement = f"[{base_label}_{label_counters[base_label]}]"
            original = text[start:end]
            replacements.append((start, end, replacement, pii_type, original))

        result = text
        for start, end, replacement, _, _ in reversed(replacements):
            result = result[:start] + replacement + result[end:]

        mappings = [
            PiiMapping(original=original, replacement=replacement, type=pii_type)
            for _, _, replacement, pii_type, original in replacements
        ]

        return AnonymizeResponse(anonymizedText=result, piiMappings=mappings)


anonymizer = MedicalTextAnonymizer(nlp)

# ============================================================================
# OCR FUNCTIONS
# ============================================================================


def get_image_from_base64(image_base64: str) -> Image.Image:
    try:
        image_data = base64.b64decode(image_base64)
    except Exception as exc:
        raise ValueError("Invalid base64 image") from exc

    return Image.open(BytesIO(image_data))


def extract_text_from_image(image: Image.Image) -> OcrResponse:
    try:
        if image.mode != "RGB":
            image = image.convert("RGB")

        if max(image.size) > 2500:
            ratio = 2500.0 / max(image.size)
            new_size = (int(image.size[0] * ratio), int(image.size[1] * ratio))
            image = image.resize(new_size, Image.Resampling.LANCZOS)

        text = pytesseract.image_to_string(image, lang="rus+eng")

        data = pytesseract.image_to_data(
            image, lang="rus+eng", output_type=pytesseract.Output.DICT
        )
        confidences: List[float] = []
        for conf in data.get("conf", []):
            try:
                value = float(conf)
            except (TypeError, ValueError):
                continue
            if value >= 0:
                confidences.append(value)

        avg_confidence = sum(confidences) / len(confidences) / 100 if confidences else 0.0

        return OcrResponse(text=text, confidence=avg_confidence, language="ru")
    except Exception as exc:
        logger.error("OCR error: %s", exc)
        raise


# ============================================================================
# FASTAPI APP
# ============================================================================

app = FastAPI(
    title="Anonymizer Service",
    description="Сервис анонимизации текста и OCR для медицинских документов",
    version="1.0.0",
)

router = APIRouter(prefix="/api")


@router.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(status="ok", spacy_ready=True, tesseract_ready=True)


@router.post("/anonymize", response_model=AnonymizeResponse)
async def anonymize(request: AnonymizeRequest):
    if not request.text:
        raise HTTPException(status_code=400, detail="Text is required")

    try:
        return anonymizer.anonymize_text(request.text)
    except Exception as exc:
        logger.error("Anonymization error: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/ocr", response_model=OcrResponse)
async def ocr(request: OcrRequest):
    if not request.image:
        raise HTTPException(status_code=400, detail="Image is required")

    try:
        image = get_image_from_base64(request.image)
        return extract_text_from_image(image)
    except Exception as exc:
        logger.error("OCR error: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


app.include_router(router)


@app.on_event("startup")
async def startup_event():
    logger.info("Anonymizer Service starting...")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
