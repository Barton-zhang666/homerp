# homeerp 后端

Python 3.12 + uv；FastAPI / SQLAlchemy 2.0 async / asyncmy / Alembic。

在本目录执行：

```sh
uv sync
cp .env.example .env
uv run uvicorn src.main:app --reload
```

PowerShell 可用 `Copy-Item .env.example .env`。配置通过环境变量或本目录 `.env` 加载。

- Swagger：http://localhost:8000/docs
- 存活检查：`GET /health` → `{"status":"ok"}`，不检查数据库连接。
- 测试：`uv run pytest`
- 静态检查：`uv run ruff check .` 和 `uv run mypy src`

数据库启动后，新增 ORM 模型并在 `src/infrastructure/persistence/models/__init__.py`
中导入，使 Alembic 能发现模型，再执行：

```sh
uv run alembic revision --autogenerate -m "initial schema"
uv run alembic upgrade head
uv run alembic check
```

当前只有空的 Base，没有业务表或初始 revision。迁移不能在没有 MySQL 的环境下验收。
不要在应用启动时调用 `create_all()`，结构变更统一经过 Alembic。

分层规则见根目录 AGENTS.md 与 `docs/backend-ddd.md`。
