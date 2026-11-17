# home-erp AGENTS.md

## 全局沟通规则

- 始终使用简体中文回复。
- 项目名为 homeerp。

## 项目概述

家庭 ERP 系统，包含物资（物品/食品/药品）、日程、采购、财务、成员五大模块。后端 FastAPI + DDD 分层，前端 React + shadcn/ui，数据库 MySQL 8.0。

## Monorepo 结构

- apps/web：React + Vite + shadcn/ui
- apps/backend：FastAPI + SQLAlchemy 2.0 async + Alembic
- packages/：共享包；packages/api-types 的共享类型契约由 OpenAPI 生成，不手写
- packages/ui：官方 shadcn monorepo 模板的共享 UI 组件
- docs/：架构决策记录、模块说明

## 后端 DDD 分层规则（硬性约束）

- domain/ 不得 import infrastructure/ 或 interfaces/。领域层只依赖 Python 标准库和领域自身的抽象。
- application/ 可以依赖 domain/，但不得直接依赖 SQLAlchemy 模型；通过 repository 接口（端口）访问持久化。
- infrastructure/ 实现 domain/ 中定义的 repository 接口，ORM 模型放在 infrastructure/persistence/models/。
- interfaces/ 负责 FastAPI router、Pydantic schema 和依赖注入，调用 application/ 的 use case，不直接操作 ORM。
- 每个业务模块（inventory、schedule、procurement、finance、members）在 domain/ 下拥有独立的子包，禁止跨模块直接 import 对方的 domain 实体。

## 前端约定

- 组件优先使用 shadcn/ui，不自造基础 UI。
- API 调用统一放在 src/lib/api/，类型从 packages/api-types/ 导入（由后端 OpenAPI 生成）。
- 不直接在前端组件中写 fetch 细节，通过封装的 client 调用。

## 常用命令

- 启动数据库：docker compose up -d
- 启动后端：cd apps/backend && uv run uvicorn src.main:app --reload
- 启动前端：cd apps/web && pnpm dev
- 运行后端测试：cd apps/backend && uv run pytest
- 生成前端 API 类型：cd packages/api-types && pnpm generate
- 数据库迁移：cd apps/backend && uv run alembic revision --autogenerate -m "..." && uv run alembic upgrade head

## 禁止事项

- 禁止在 domain/ 中引入任何第三方框架依赖。
- 禁止手写 packages/api-types/ 中的类型文件（必须由生成命令产生）。
- 禁止提交 .env 文件。
- 禁止跳过 verify-slice Skill 的验证直接声称任务完成。
- 每次提交前必须加载 git-convention Skill；编码任务结束前加载并执行 verify-slice Skill。

## 参考文档索引

- DDD 分层细节：docs/backend-ddd.md
- 数据库建模：docs/db-schema.md
- 前端 API 层约定：docs/frontend-api.md
