<!-- PR 标题必须遵循 Conventional Commits，如 feat(backend): add stock intake -->

## What

- 本次变更与用户可见行为：

## Why

- 解决的问题与原因：

## How to test

- [ ] `cd apps/backend && uv run pytest`
- [ ] `cd apps/backend && uv run ruff check . && uv run mypy src`
- [ ] `cd apps/web && pnpm lint && pnpm tsc --noEmit`
- [ ] `cd apps/backend && uv run alembic check`
- [ ] 新增端点已在 `/docs` 确认 Pydantic schema（无新增则注明不适用）
- 操作步骤、结果及未执行项说明：

## 数据库迁移

- Alembic revision 文件名（无数据库变更填写“不涉及”）：
- 迁移验证与回退说明：
