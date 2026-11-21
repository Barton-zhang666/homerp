import { useState } from "react"
import { Plus } from "lucide-react"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@workspace/ui/components/dialog"
import { StockActions } from "./stock-actions"
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@workspace/ui/components/tabs"
import type { Product } from "@/lib/api/inventory"
import type { Editor } from "./stock-form"
import {
  actions,
  statuses,
  detailKeys,
  detailLabels,
  describeExpiry,
  matches,
  type Scope,
} from "./labels"

const custody: Record<string, string> = {
  home: "在家",
  lent: "借出中",
  repair: "送修中",
}
export function StockDetail({
  p,
  scope,
  edit,
  filter,
}: {
  p: Product
  scope: Scope
  edit: (editor: Editor) => void
  filter: string
}) {
  const name = (id: string) =>
    scope.members.find((m) => m.id === id)?.name ??
    (id === scope.user.member.id ? scope.user.member.name : "家庭成员")
  const reversed = new Set(p.history.map((h) => h.reverses))
  const [showDepleted, setShowDepleted] = useState(false)
  const holdings = p.holdings.filter(
    (h) =>
      Number(h.remaining) > 0 ||
      (showDepleted && h.custody === "home" && !reversed.has(h.id))
  )
  const ordered = [...holdings].sort(
    (a, b) =>
      Number(matches(b, filter)) - Number(matches(a, filter)) ||
      (a.expiry || "9999").localeCompare(b.expiry || "9999")
  )
  return (
    <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 p-0 sm:max-w-2xl">
      <DialogHeader className="shrink-0 border-b px-5 py-4 pr-12">
        <DialogTitle className="text-xl wrap-anywhere">
          {[p.name, p.details.form, p.details.specification]
            .filter(Boolean)
            .join(" · ")}
        </DialogTitle>
        <DialogDescription>
          建档人 {name(p.owner_id)} · 拥有 {Number(p.owned)} {p.unit} · 可用{" "}
          {Number(p.available)} {p.unit}
        </DialogDescription>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button onClick={() => edit({ mode: "receive", product: p })}>
            <Plus data-icon="inline-start" />
            追加入库
          </Button>
          {p.owner_id === scope.user.member.id && (
            <Button
              variant="outline"
              onClick={() => edit({ mode: "edit", product: p })}
            >
              编辑品目
            </Button>
          )}
        </div>
      </DialogHeader>
      <div className="min-h-0 overflow-y-auto overscroll-contain p-5">
        <Tabs defaultValue="stock">
          <TabsList aria-label="品目详情">
            <TabsTrigger value="stock">位置与批次</TabsTrigger>
            <TabsTrigger value="details">品目资料</TabsTrigger>
            <TabsTrigger value="history">流水</TabsTrigger>
          </TabsList>
          <TabsContent value="stock">
            <ul className="divide-y">
              {ordered.map((h) => (
                <li
                  key={h.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="grid min-w-0 gap-1">
                    <strong className="wrap-anywhere">
                      {h.location} · {Number(h.remaining)} {p.unit}
                    </strong>
                    <span className="wrap-anywhere text-muted-foreground">
                      {[
                        custody[h.custody],
                        h.lot,
                        h.opened ? "已开封" : "",
                        p.category === "item" ? "" : describeExpiry(h.expiry),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                    {p.category !== "item" && (
                      <Badge variant="secondary">{statuses[h.status]}</Badge>
                    )}
                  </div>
                  <StockActions
                    product={p}
                    holdings={[h]}
                    actorId={scope.user.member.id}
                    edit={edit}
                  />
                </li>
              ))}
            </ul>
            {!ordered.length && <p>当前无剩余库存。</p>}
            {p.holdings.some(
              (h) =>
                Number(h.remaining) === 0 &&
                h.custody === "home" &&
                !reversed.has(h.id)
            ) && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowDepleted(!showDepleted)}
              >
                {showDepleted ? "隐藏零余额批次" : "查看零余额批次"}
              </Button>
            )}
          </TabsContent>
          <TabsContent value="details">
            <dl className="divide-y">
              {[
                ...detailKeys[p.category].map((k) => [
                  detailLabels[k],
                  p.details[k] || "未录",
                ]),
                ["库存单位", p.unit],
                [
                  "补货线",
                  p.minimum === null
                    ? "未录"
                    : Number(p.minimum) + " " + p.unit,
                ],
              ].map(([k, v]) => (
                <div key={k} className="grid grid-cols-[6em_1fr] gap-2 py-3">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="wrap-anywhere">{v}</dd>
                </div>
              ))}
            </dl>
          </TabsContent>
          <TabsContent value="history">
            <ol className="divide-y">
              {p.history.map((row) => {
                const from = p.holdings.find(
                  (h) => h.id === row.source_id
                )?.location
                return (
                  <li key={row.id} className="grid gap-1 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong>{actions[row.action]}</strong>
                      {row.action !== "undo" && (
                        <span>
                          {Number(row.destination_quantity) ||
                            Number(row.source_delta)}{" "}
                          {p.unit}
                        </span>
                      )}
                      {reversed.has(row.id) && (
                        <Badge variant="outline">已撤回</Badge>
                      )}
                    </div>
                    <span className="wrap-anywhere text-muted-foreground">
                      {[
                        name(row.actor_id),
                        new Date(row.occurred_at).toLocaleString("zh-CN"),
                        from && from !== row.location
                          ? from + " → " + row.location
                          : row.location,
                        row.lot,
                        row.expiry ? describeExpiry(row.expiry) : null,
                        row.note,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                    {row.actor_id === scope.user.member.id &&
                      row.action !== "undo" &&
                      !reversed.has(row.id) && (
                        <Button
                          className="justify-self-start"
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            edit({
                              mode: "undo",
                              product: p,
                              movementId: row.id,
                            })
                          }
                        >
                          撤回这笔流水
                        </Button>
                      )}
                  </li>
                )
              })}
            </ol>
          </TabsContent>
        </Tabs>
      </div>
    </DialogContent>
  )
}
