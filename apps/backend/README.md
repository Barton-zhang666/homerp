# homerp 后端

Python 3.12 + uv；FastAPI / SQLAlchemy 2.0 async / asyncmy / Alembic。

在本目录执行：

```sh
uv sync
cp .env.example .env
uv run alembic upgrade head
uv run uvicorn src.main:app --reload
```

PowerShell 可用 `Copy-Item .env.example .env`。配置通过环境变量或本目录 `.env` 加载。
执行迁移前，在仓库根目录运行 `docker compose up -d` 并等待 MySQL healthy。

- Swagger：http://localhost:8000/docs
- 存活检查：`GET /health` → `{"status":"ok"}`，不检查数据库连接。
- 测试：`uv run pytest`
- 静态检查：`uv run ruff check .` 和 `uv run mypy src`

数据库启动后，新增 ORM 模型并在 `src/infrastructure/persistence/models/__init__.py`
中导入，使 Alembic 能发现模型，再执行：

```sh
uv run alembic revision --autogenerate -m "describe schema change"
uv run alembic upgrade head
uv run alembic check
```

当前只有空的 Base，没有业务表；初始空基线为 `9420128cdcd3_initial_baseline.py`。
新环境直接执行 `upgrade head` 应用已有迁移，不要重复生成初始 revision。
2026-11-17 已在本机 MySQL 8.0.46 完成迁移、回退重放和一致性检查。
不要在应用启动时调用 `create_all()`，结构变更统一经过 Alembic。

分层规则见根目录 AGENTS.md 与 `docs/backend-ddd.md`。
