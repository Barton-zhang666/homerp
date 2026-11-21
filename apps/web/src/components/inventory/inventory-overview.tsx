import {
  Box,
  CircleCheck,
  Clock3,
  Layers3,
  PackageMinus,
  TriangleAlert,
} from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@workspace/ui/components/card"
import type { Category, Product } from "@/lib/api/inventory"
import { activeHoldings, isLowStock } from "./labels"

export function InventoryOverview({
  category,
  rows,
  active,
  select,
}: {
  category: Category
  rows: Product[] | null
  active: string
  select: (key: string) => void
}) {
  const expiring = (status: string) =>
    rows?.filter((p) =>
      activeHoldings(p).some(
        (h) =>
          h.status === status || (status === "soon" && h.status === "today")
      )
    ).length
  const all = {
    key: "all",
    name: category === "food" ? "食品总库存" : "物品总数",
    count: rows?.length,
    icon: Box,
  }
  const low = {
    key: "low",
    name: "库存不足",
    count: rows?.filter(isLowStock).length,
    icon: PackageMinus,
  }
  const dated = [
    {
      key: "expiring",
      name: category === "food" ? "临期食品" : "临期药品",
      count: expiring("soon"),
      icon: Clock3,
    },
    {
      key: "expired",
      name: category === "food" ? "过期食品" : "过期药品",
      count: expiring("expired"),
      icon: TriangleAlert,
    },
  ]
  const metrics =
    category === "item"
      ? [
          all,
          {
            key: "normal",
            name: "正常库存",
            count: rows?.filter(
              (p) => Number(p.available) > 0 && !isLowStock(p)
            ).length,
            icon: CircleCheck,
          },
          low,
          {
            key: "empty",
            name: "无可用库存",
            count: rows?.filter((p) => Number(p.available) === 0).length,
            icon: Layers3,
          },
        ]
      : category === "food"
        ? [all, ...dated, low]
        : [...dated, low]
  return (
    <div
      className={"ledger-metrics ledger-metrics-" + category}
      role="group"
      aria-label="库存概览"
    >
      {metrics.map(({ key, name, count, icon: Icon }) => (
        <Button
          key={key}
          variant="outline"
          className="ledger-metric"
          data-metric={key}
          aria-pressed={active === key}
          onClick={() => select(key)}
        >
          <Icon aria-hidden="true" />
          <span className="grid min-w-0 gap-1 text-left">
            <span className="text-sm">{name}</span>
            <span>
              <strong className="text-2xl leading-none tabular-nums">
                {count ?? "—"}
              </strong>{" "}
              <span className="text-xs text-muted-foreground">项</span>
            </span>
          </span>
        </Button>
      ))}
    </div>
  )
}

export function ItemSidebar({
  rows,
  select,
  search,
  chooseLocation,
}: {
  rows: Product[]
  select: () => void
  chooseLocation: (place: string) => void
  search: (name: string) => void
}) {
  const low = rows.filter(isLowStock)
  const counts = new Map<string, number>()
  for (const p of rows)
    for (const place of new Set(
      activeHoldings(p)
        .map((h) => h.location)
        .filter(Boolean)
    ))
      counts.set(place, (counts.get(place) ?? 0) + 1)
  const frequent = [...counts]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-CN"))
    .slice(0, 6)
  return (
    <aside className="grid min-w-0 gap-4">
      <Card className="gap-0 self-start py-0">
        <CardHeader className="border-b py-3">
          <CardTitle className="flex items-center gap-2">
            <TriangleAlert className="size-4 text-[var(--attention-fg)]" />
            低库存预警{" "}
            <span className="text-sm text-muted-foreground">
              ({low.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid divide-y">
          {low.slice(0, 5).map((p) => (
            <Button
              key={p.id}
              variant="ghost"
              className="grid h-auto justify-stretch gap-1 rounded-none py-3 text-left whitespace-normal"
              onClick={() => search(p.name)}
            >
              <span className="truncate">{p.name}</span>
              <span className="text-xs text-muted-foreground">
                可用 {Number(p.available)} {p.unit} · 补货线 {Number(p.minimum)}{" "}
                {p.unit}
              </span>
            </Button>
          ))}
          {low.length ? (
            <Button variant="link" onClick={select}>
              查看全部预警
            </Button>
          ) : (
            <p className="py-4 text-sm text-muted-foreground">
              当前没有低库存物品
            </p>
          )}
        </CardContent>
      </Card>
      {frequent.length > 0 && (
        <Card className="gap-0 py-0">
          <CardHeader className="border-b py-3">
            <CardTitle>常用存放位置</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 py-3">
            {frequent.map(([place, count]) => (
              <Button
                key={place}
                variant="outline"
                className="grid h-auto min-w-0 justify-items-start gap-1 px-2 py-2"
                title={place}
                onClick={() => chooseLocation(place)}
              >
                <span className="max-w-full truncate">{place}</span>
                <span className="text-xs text-muted-foreground">
                  {count} 项
                </span>
              </Button>
            ))}
          </CardContent>
        </Card>
      )}
    </aside>
  )
}
