import json
from pathlib import Path

from src.main import app

destination = Path(__file__).resolve().parents[3] / "packages" / "api-types" / "openapi.json"
destination.parent.mkdir(parents=True, exist_ok=True)
destination.write_text(
    json.dumps(app.openapi(), ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
)
print(f"Exported OpenAPI: {destination}")
