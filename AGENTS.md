# homerp AGENTS.md

## 全局沟通规则

- 始终使用简体中文回复。
- 项目名为 homerp。
- 单机版共用一份名册，每人自行注册，成员权限一致。家庭业务内容对已登录成员共享读取，只有记录所有者能修改，后端通过当前会话校验归属。

## Git 自动交付规则

- 每次完成项目修改并通过 verify-slice 验证后，自动按 Conventional Commits 规范提交本次任务相关变更，并推送到当前分支配置的远端；无上游时推送到 origin 的同名分支并设置跟踪。
- 此流程已获用户持续授权，无需用户重复提醒或确认，不反复询问是否提交、是否推送。
- 验证失败时先修复再提交；提交或推送受阻时明确报告原因，不跳过检查、不强制推送。

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

- 新增或修改前端代码前，必须先读取[项目级 shadcn Skill](.codex/skills/shadcn/SKILL.md)，根据本次需求查找 `packages/ui/` 中可复用的组件，并按 Skill 查阅对应组件的文档和用法。缺少所需组件时，先用 shadcn CLI 搜索注册表，再添加匹配的组件。
- 前端基础 UI 必须使用 shadcn/ui。业务组件通过组合库组件实现，禁止手写按钮、输入框、弹窗等基础控件，也禁止引入其他 UI 组件库替代。
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
