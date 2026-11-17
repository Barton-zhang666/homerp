---
name: git-convention
description: 强制 Conventional Commits 提交规范、分支命名规范与 PR 模板。每次提交前必须加载本 Skill。
---

## Commit 格式

<type>[optional scope]: <description>

### 允许的 type

- feat: 新功能
- fix: Bug 修复
- refactor: 不改变外部行为的重构
- docs: 文档变更
- style: 代码格式（不影响运行）
- test: 测试相关
- chore: 构建、依赖、工具链等杂项
- perf: 性能优化
- ci: CI/CD 配置变更
- revert: 回滚之前的提交

### Scope 约定

- web: 前端
- backend: 后端
- db: 数据库迁移
- infra: Docker / CI / 部署
- docs: 文档

### 示例

feat(web): add medicine inventory table filter
fix(backend): correct stock batch expiry calculation
chore(db): add medicine detail migration
docs: update AGENTS.md with DDD layer rules

### 分支命名

- feat/<short-description>
- fix/<short-description>
- chore/<short-description>
- docs/<short-description>

### PR 模板要求

- 标题遵循 Conventional Commits 格式
- 正文包含：What / Why / How to test
- 涉及数据库变更时，必须附上 Alembic revision 文件名
