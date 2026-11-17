from src.application.use_cases.health import CheckHealth


def get_check_health() -> CheckHealth:
    return CheckHealth()
