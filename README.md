# homeerp

家庭 ERP monorepo，覆盖物资、日程、采购、财务与成员管理。

- `apps/web/`：React + Vite + TypeScript + shadcn/ui。
- `apps/backend/`：FastAPI + DDD + SQLAlchemy async。
- `packages/`：共享包与 OpenAPI 生成的 TypeScript 契约。
- `docs/`：架构文档、ADR 和接口约定。
- `.codex/skills/`：项目级 Codex Skills。

## 本地启动

工具：Node.js 24 LTS、pnpm 10.34.9、Python 3.12、uv，数据库需要 Docker Compose。
根目录执行 `pnpm install`。后端执行 `cd apps/backend`、`uv sync`，将 `.env.example`
复制为 `.env`（PowerShell：`Copy-Item .env.example .env`）。

分别在终端启动：

```sh
# 根目录：数据库
docker compose up -d

# apps/backend：后端
uv run uvicorn src.main:app --reload

# apps/web：前端
pnpm dev
```

- 前端：http://localhost:5173
- API 文档：http://localhost:8000/docs
- 存活检查：http://localhost:8000/health

本次初始化按用户要求暂缓 Docker 运行验收；后端存活检查可以独立于数据库运行。
MySQL healthy、数据库连接、首次自动生成 revision、upgrade head 和 alembic check 待验收。

若当前 Windows 终端的 `pnpm` 指向失效的 nvm 启动器，可在该终端执行：

```powershell
$env:Path = "$env:APPDATA\npm;" + $env:Path
pnpm --version
```

本机已通过 npm 在该用户目录安装 pnpm；此命令只调整当前终端的优先级。

## 开发验证

```sh
cd apps/backend
uv run pytest
uv run ruff check .
uv run mypy src
uv run alembic check
```

```sh
cd apps/web
pnpm lint
pnpm tsc --noEmit
pnpm build
```

`alembic check` 必须在 MySQL 已启动、迁移已应用时执行。
生成共享契约：`cd packages/api-types` 后执行 `pnpm generate`。
根目录也可执行 `pnpm lint`、`pnpm typecheck`、`pnpm build` 检查所有前端工作区。

## 协作规范

- 硬性规则见 [AGENTS.md](AGENTS.md)，每次提交加载 git-convention Skill。
- Conventional Commits 示例：`feat(web): add inventory list`。
- 项目 Skills 位于 `.codex/skills/`；shadcn 的上游来源记录在 `skills-lock.json`。
- Skills CLI 当前将 Codex 项目 Skill 装到 `.agents/skills/`；本项目按要求移动到 `.codex/skills/`。
- DDD、数据库、前端契约约定分别见 [后端文档](docs/backend-ddd.md)、[数据库文档](docs/db-schema.md)、[API 文档](docs/frontend-api.md)。

下一步从 inventory 的领域实体、值对象和仓储接口开始，再逐层实现入库/出库用例及界面。
