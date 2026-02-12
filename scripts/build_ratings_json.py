import json
import math
from pathlib import Path

import pandas as pd

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
EXCEL_PATH = DATA_DIR / "ratings-2026.xlsx"
OUTPUT_PATH = DATA_DIR / "ratings-2026.json"
UNIVERSITIES_PATH = DATA_DIR / "universities.json"

MONTHS = [
    "Январь",
    "Февраль",
    "Март",
    "Апрель",
    "Май",
    "Июнь",
    "Июль",
    "Август",
    "Сентябрь",
    "Октябрь",
    "Ноябрь",
    "Декабрь",
]


def normalize_name(value: str) -> str:
    return str(value or "").strip()


def parse_number(value):
    if value is None or value == "":
        return None
    if isinstance(value, (int, float)):
        if isinstance(value, float) and math.isnan(value):
            return None
        return float(value)
    try:
        parsed = float(str(value).replace(",", "."))
        return None if math.isnan(parsed) else parsed
    except ValueError:
        return None


def build_items(df: pd.DataFrame, universities):
    rows_map = {
        normalize_name(row["Вуз"]): row for _, row in df.iterrows() if normalize_name(row.get("Вуз"))
    }

    items = []
    for name in universities:
        normalized = normalize_name(name)
        row = rows_map.get(normalized, {})
        scores = {
            "consolidated": parse_number(row.get("Сводный рейтинг")),
            "smi": parse_number(row.get("СМИ")),
            "social": parse_number(row.get("Социальные сети")),
            "vk": parse_number(row.get("ВКонтакте")),
            "tg": parse_number(row.get("Telegram")),
            "ok": parse_number(row.get("MAX")),
            "rt": parse_number(row.get("Rutube")),
            "site": parse_number(row.get("Сайт")),
            "agenda": parse_number(row.get("Федеральная повестка")),
        }
        if scores["social"] is None:
            parts = [scores["vk"], scores["tg"], scores["ok"], scores["rt"]]
            parts = [val for val in parts if val is not None]
            scores["social"] = round(sum(parts), 3) if parts else None
        items.append({"name": normalized, "scores": scores})
    return items


def main():
    universities = json.loads(UNIVERSITIES_PATH.read_text(encoding="utf-8"))
    xls = pd.ExcelFile(EXCEL_PATH)
    fallback_df = pd.read_excel(xls, xls.sheet_names[0])

    months = []
    for idx, month in enumerate(MONTHS, start=1):
        if month in xls.sheet_names:
            df = pd.read_excel(xls, month)
        else:
            df = fallback_df
        months.append(
            {
                "name": month,
                "number": idx,
                "items": build_items(df, universities),
            }
        )

    payload = {"year": 2026, "months": months}
    OUTPUT_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
