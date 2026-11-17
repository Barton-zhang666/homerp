# 后端 DDD 分层

HTTP router → application use case → domain 抽象；infrastructure 提供抽象的实现。
`src/main.py` 和 `interfaces/dependencies.py` 是组合入口，负责组装依赖。

- `domain/<module>/`：实体、值对象、领域服务、repository 接口，仅使用标准库。
- `application/use_cases/`：编排业务流程，依赖 domain 与 ports。
- `application/dto/`：应用层数据结构，优先标准库 dataclass。
- `application/ports/`：通知、时钟、外部服务等应用端口。
- `infrastructure/persistence/models/`：SQLAlchemy ORM 与 Base metadata。
- `infrastructure/persistence/repositories/`：仓储实现，转换 ORM 与领域实体。
- `infrastructure/external/`：外部服务适配器。
- `interfaces/http/`：路由与 Pydantic 请求、响应 schema，不操作 ORM。

五个领域独立：inventory、schedule、procurement、finance、members。
跨模块交互通过应用服务、端口或事件，不直接引用其他模块的领域实体。

基础存活检查为 `GET /health`，不依赖数据库，也不表示数据库 ready。
业务事务在用例/工作单元边界提交，仓储不擅自提交事务。
业务用例落地时再增加工作单元实现；初始化阶段没有业务写入。

异步迁移配置参考 [Alembic 官方 asyncio 配方](https://alembic.sqlalchemy.org/en/latest/cookbook.html#using-asyncio-with-alembic)。
