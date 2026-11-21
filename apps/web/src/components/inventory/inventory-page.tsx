import { useEffect, useRef, useState } from "react"
import { Boxes, Plus } from "lucide-react"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Empty, EmptyHeader, EmptyTitle } from "@workspace/ui/components/empty"
import {
  NativeSelect,
  NativeSelectOption,
} from "@workspace/ui/components/native-select"
import { Input } from "@workspace/ui/components/input"
import { StockDetail } from "./stock-detail"
import { inventory, type Category, type Product } from "@/lib/api/inventory"
import { Feedback, errorMessage } from "../account-fields"
import { StockForm, type Editor } from "./stock-form"
import {
  categories,
  matches,
  type Scope,
  statuses,
  describeExpiry,
} from "./labels"

const filters: Record<string, string> = {
  all: "全部库存",
  low: "库存不足",
  lent: "借出中",
  repair: "送修中",
  priority: "优先吃",
  soon: "临期",
  today: "今日到期",
  expired: "待清理",
  unknown: "日期待补",
  verify: "本月需核对",
}
export function InventoryPage({
  category,
  scope,
}: {
  category: Category
  scope: Scope
}) {
  const prefix =
    "homerp.inventory." + scope.user.member.id + "." + category + "."
  const [query, setQuery] = useState(
    () => sessionStorage.getItem(prefix + "query") ?? ""
  )
  const [filter, setFilter] = useState(
    () => sessionStorage.getItem(prefix + "filter") ?? "all"
  )
  const [selected, setSelected] = useState(
    () => sessionStorage.getItem(prefix + "selected") ?? ""
  )
  const [previousLocation, setPreviousLocation] = useState(
    () => sessionStorage.getItem(prefix + "location") ?? ""
  )
  const [rows, setRows] = useState<Product[] | null>(null)
  const [error, setError] = useState("")
  const [reload, setReload] = useState(0)
  const [editor, setEditor] = useState<Editor | null>(null)
  const opener = useRef<HTMLElement | null>(null)
  const registerButton = useRef<HTMLButtonElement>(null)
  function openEditor(next: Editor) {
    const active = document.activeElement
    const menuTrigger = active
      ?.closest('[role="menu"]')
      ?.getAttribute("aria-labelledby")
    opener.current = menuTrigger
      ? document.getElementById(menuTrigger)
      : active instanceof HTMLElement
        ? active
        : null
    setEditor(next)
  }
  useEffect(() => {
    sessionStorage.setItem(prefix + "query", query)
    sessionStorage.setItem(prefix + "filter", filter)
    sessionStorage.setItem(prefix + "selected", selected)
    sessionStorage.setItem(prefix + "location", previousLocation)
  }, [prefix, query, filter, selected, previousLocation])
  useEffect(() => {
    let active = true
    inventory
      .list(category)
      .then((data) => {
        if (active) {
          setRows(data)
          setError("")
        }
      })
      .catch((err) => {
        if (active) setError(errorMessage(err))
      })
    return () => {
      active = false
    }
  }, [category, reload])
  const choices = [
    "all",
    "low",
    ...(category === "item"
      ? ["lent", "repair"]
      : category === "food"
        ? ["priority", "today", "soon", "expired", "unknown"]
        : ["today", "soon", "verify", "expired", "unknown"]),
  ]
  const visible = (rows ?? []).filter((p) => {
    const stock = p.holdings.filter((h) => Number(h.remaining) > 0)
    const text = [
      p.name,
      ...Object.values(p.details),
      ...stock.flatMap((h) => [h.location, h.lot]),
    ]
      .join(" ")
      .toLocaleLowerCase()
    return (
      text.includes(query.trim().toLocaleLowerCase()) &&
      (filter === "all" ||
        (filter === "low"
          ? p.minimum !== null && Number(p.available) <= Number(p.minimum)
          : stock.some((h) => matches(h, filter))))
    )
  })
  const priorityLots =
    filter === "priority"
      ? visible
          .flatMap((p) =>
            p.holdings
              .filter((h) => Number(h.remaining) > 0 && matches(h, filter))
              .map((h) => ({ p, h }))
          )
          .sort((a, b) => a.h.expiry.localeCompare(b.h.expiry))
      : []
  const selectedProduct =
    visible.find((p) => p.id === selected) ?? priorityLots[0]?.p ?? visible[0]
  return (
    <div className="inventory-category grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          className="w-full sm:max-w-xs"
          aria-label="搜索库存"
          placeholder="搜索名称、位置或标签"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <NativeSelect
          aria-label="库存筛选"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          {choices.map((k) => (
            <NativeSelectOption key={k} value={k}>
              {filters[k]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <Button
          className="sm:ml-auto"
          ref={registerButton}
          onClick={() => openEditor({ mode: "register" })}
        >
          <Plus data-icon="inline-start" />
          登记{categories[category]}
        </Button>
      </div>
      {error && (
        <div>
          <Feedback message={error} />
          <Button variant="outline" onClick={() => setReload((n) => n + 1)}>
            重试
          </Button>
        </div>
      )}
      {!rows && !error && <p role="status">正在读取库存…</p>}
      {rows &&
        (selectedProduct ? (
          <div className="grid items-start gap-4 xl:grid-cols-[minmax(15rem,.85fr)_minmax(0,1.5fr)]">
            <Card>
              <CardHeader>
                <CardTitle>
                  {filter === "priority"
                    ? "优先食用批次"
                    : categories[category] + "清单"}
                  （
                  {filter === "priority" ? priorityLots.length : visible.length}
                  ）
                </CardTitle>
              </CardHeader>
              <CardContent className="grid max-h-[55svh] gap-2 overflow-y-auto">
                {filter === "priority"
                  ? priorityLots.map(({ p, h }) => (
                      <Button
                        key={h.id}
                        variant={
                          p.id === selectedProduct.id ? "secondary" : "outline"
                        }
                        className="h-auto min-w-0 flex-col items-start py-3"
                        onClick={() => setSelected(p.id)}
                      >
                        <strong className="max-w-full truncate">
                          {p.name} · {h.location}
                        </strong>
                        <span>
                          {Number(h.remaining)} {p.unit} ·{" "}
                          {describeExpiry(h.expiry)}
                        </span>
                        <Badge variant="outline">
                          {h.opened ? "已开封" : statuses[h.status]}
                        </Badge>
                      </Button>
                    ))
                  : visible.map((p) => (
                      <Button
                        key={p.id}
                        className="h-auto min-w-0 flex-col items-start py-3 text-start"
                        variant={
                          p.id === selectedProduct.id ? "secondary" : "outline"
                        }
                        aria-current={
                          p.id === selectedProduct.id ? "true" : undefined
                        }
                        onClick={() => setSelected(p.id)}
                      >
                        <span className="max-w-full truncate font-semibold">
                          {[p.name, p.details.form, p.details.specification]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                        <span className="max-w-full truncate text-muted-foreground">
                          可用 {Number(p.available)} {p.unit} ·{" "}
                          {[
                            ...new Set(
                              p.holdings
                                .filter((h) => Number(h.remaining) > 0)
                                .map((h) => h.location)
                            ),
                          ].join("、") || "暂无余量"}
                        </span>
                        {p.minimum !== null &&
                          Number(p.available) <= Number(p.minimum) && (
                            <Badge variant="outline">库存不足</Badge>
                          )}
                      </Button>
                    ))}
              </CardContent>
            </Card>
            <StockDetail
              key={selectedProduct.id}
              p={selectedProduct}
              scope={scope}
              edit={openEditor}
              filter={filter}
            />
          </div>
        ) : (
          <Empty className="border">
            <Boxes />
            <EmptyHeader>
              <EmptyTitle>
                {rows.length
                  ? "没有匹配的库存"
                  : "尚未登记" + categories[category]}
              </EmptyTitle>
            </EmptyHeader>
          </Empty>
        ))}
      {editor && (
        <StockForm
          editor={editor}
          category={category}
          previousLocation={previousLocation}
          close={() => {
            setEditor(null)
            const target = opener.current?.isConnected
              ? opener.current
              : registerButton.current
            target?.focus({ preventScroll: true })
          }}
          saved={(id, location) => {
            if (location !== undefined) setPreviousLocation(location)
            if (editor.mode === "register") {
              setQuery("")
              setFilter("all")
            }
            setSelected(id)
            setReload((n) => n + 1)
          }}
        />
      )}
    </div>
  )
}
