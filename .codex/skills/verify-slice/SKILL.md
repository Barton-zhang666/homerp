---
name: verify-slice
description: 每个模块切片完成后必须执行的验证步骤。Codex 在结束任何编码任务前自动加载并执行。
---

## 验证顺序

1. 后端：cd apps/backend && uv run pytest
2. 后端类型与风格：cd apps/backend && uv run ruff check . && uv run mypy src
3. 前端：cd apps/web && pnpm lint && pnpm tsc --noEmit
4. 数据库：cd apps/backend && uv run alembic check
5. 如果本次涉及新端点，确认 GET /docs 中可以看到对应的 Pydantic schema

任何一步失败，不得声称任务完成。
