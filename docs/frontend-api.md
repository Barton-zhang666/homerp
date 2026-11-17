# 前端 API 契约

后端 Pydantic schema 是唯一的类型来源。

在根目录安装依赖后执行：

```sh
cd packages/api-types
pnpm generate
```

该命令通过 `uv run` 导出 FastAPI 的 OpenAPI 文档，再由 `openapi-typescript`
生成 `src/schema.d.ts`，不需要启动 HTTP 服务或数据库。
提交生成的 `openapi.json` 和类型文件，禁止手工修改生成内容。

前端以 `import type { paths, components } from "@homerp/api-types"` 消费契约。
API client 统一位于 `apps/web/src/lib/api/`，组件只调用其中的业务方法。
开发时 `/api` 由 Vite 代理到 `http://127.0.0.1:8000`，移除 `/api` 前缀。
生产部署需要同等反向代理配置。

shadcn 组件位于 `packages/ui/`；`apps/web/src/components/ui/button.tsx`
提供本项目要求的 `@/components/ui/button` 导入入口。
布局基于 [shadcn 官方 Vite monorepo 模板](https://ui.shadcn.com/docs/installation/vite)。
