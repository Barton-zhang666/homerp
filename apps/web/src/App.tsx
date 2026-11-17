import { useState } from "react"
import { Button } from "@/components/ui/button"

export function App() {
  const [ready, setReady] = useState(false)
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <div className="flex max-w-md min-w-0 flex-col gap-4 text-sm leading-loose">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">homeerp</h1>
          <p>家庭 ERP · 让日常井然有序</p>
          <p className="text-muted-foreground">物资 · 日程 · 采购 · 财务 · 成员</p>
          <Button className="mt-2" onClick={() => setReady(true)}>验证组件</Button>
          <p role="status">{ready ? "shadcn Button 工作正常" : "项目基础环境已就绪"}</p>
        </div>
        <div className="text-muted-foreground font-mono text-xs">
          按 <kbd>d</kbd> 切换深色模式
        </div>
      </div>
    </main>
  )
}
