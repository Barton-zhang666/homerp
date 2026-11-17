from src.application.dto.health import HealthResult


class CheckHealth:
    def execute(self) -> HealthResult:
        """报告进程存活状态；数据库就绪状态应通过独立检查提供。"""
        return HealthResult()
