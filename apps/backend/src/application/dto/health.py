from dataclasses import dataclass
from typing import Literal


@dataclass(frozen=True)
class HealthResult:
    status: Literal["ok"] = "ok"
