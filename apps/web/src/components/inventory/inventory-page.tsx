import { useEffect, useRef, useState } from "react"
import {
  Boxes,
  Plus,
  Layers3,
  PackageMinus,
  CalendarClock,
  HandCoins,
} from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Empty, EmptyHeader, EmptyTitle } from "@workspace/ui/components/empty"
import {
  NativeSelect,
  NativeSelectOption,
} from "@workspace/ui/components/native-select"
import { Card } from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Input } from "@workspace/ui/components/input"
import { StockList, type StockRow } from "./stock-list"
import { inventory, type Category, type Product } from "@/lib/api/inventory"
import { Feedback, errorMessage } from "../account-fields"
import { StockForm, type Editor } from "./stock-form"
import { categories, matches, type Scope } from "./labels"

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
  const [page, setPage] = useState(() =>
    Math.max(1, Number(sessionStorage.getItem(prefix + "page")) || 1)
  )
  const [pageSize, setPageSize] = useState(() => {
    const size = Number(sessionStorage.getItem(prefix + "pageSize"))
    return [5, 10, 20].includes(size) ? size : 10
  })
  const [newId, setNewId] = useState("")
  const [previousLocation, setPreviousLocation] = useState(
    () => sessionStorage.getItem(prefix + "location") ?? ""
  )
  const [rows, setRows] = useState<Product[] | null>(null)
  const [error, setError] = useState("")
  const [reload, setReload] = useState(0)
  const [editor, setEditor] = useState<Editor | null>(null)
  const opener = useRef<HTMLElement | null>(null)
  const registerButton = useRef<HTMLButtonElement>(null)
  function openEditor(next: Editor, trigger?: HTMLElement | null) {
    const active = document.activeElement
    opener.current = trigger ?? (active instanceof HTMLElement ? active : null)
    setEditor(next)
  }
  useEffect(() => {
    sessionStorage.setItem(prefix + "query", query)
    sessionStorage.setItem(prefix + "filter", filter)
    sessionStorage.setItem(prefix + "location", previousLocation)
  }, [prefix, query, filter, previousLocation])
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
  const keyword = query.trim().toLocaleLowerCase()
  const list = (rows ?? []).flatMap((product): StockRow[] => {
    const stock = product.holdings.filter((h) => Number(h.remaining) > 0)
    const productText = [product.name, ...Object.values(product.details)]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase()
    const productMatches = productText.includes(keyword)
    const matchingStock = stock.filter(
      (h) => filter === "all" || filter === "low" || matches(h, filter)
    )
    const searchedStock = productMatches
      ? matchingStock
      : matchingStock.filter((h) =>
          [productText, h.location, h.lot]
            .join(" ")
            .toLocaleLowerCase()
            .includes(keyword)
        )
    if (filter === "priority")
      return searchedStock.map((batch) => ({ product, batch }))
    if (!productMatches && !searchedStock.length) return []
    if (
      filter === "low" &&
      (product.minimum === null ||
        Number(product.available) > Number(product.minimum))
    )
      return []
    if (filter !== "all" && filter !== "low" && !matchingStock.length) return []
    return [{ product }]
  })
  if (filter === "priority")
    list.sort((a, b) =>
      (a.batch?.expiry ?? "").localeCompare(b.batch?.expiry ?? "")
    )
  const pages = Math.max(1, Math.ceil(list.length / pageSize))
  const newIndex = newId
    ? list.findIndex((row) => row.product.id === newId)
    : -1
  const current =
    newIndex >= 0 ? Math.floor(newIndex / pageSize) + 1 : Math.min(page, pages)
  const start = (current - 1) * pageSize
  function goTo(next: number) {
    setNewId("")
    setPage(next)
  }
  useEffect(() => {
    if (rows) sessionStorage.setItem(prefix + "page", String(current))
    sessionStorage.setItem(prefix + "pageSize", String(pageSize))
  }, [rows, prefix, current, pageSize])
  const thirdFilter = category === "item" ? "lent" : "soon"
  const summaries = [
    { key: "all", label: "全部品目", icon: Layers3, count: rows?.length },
    {
      key: "low",
      label: filters.low,
      icon: PackageMinus,
      count: rows?.filter(
        (p) => p.minimum !== null && Number(p.available) <= Number(p.minimum)
      ).length,
    },
    {
      key: thirdFilter,
      label: filters[thirdFilter],
      icon: category === "item" ? HandCoins : CalendarClock,
      count: rows?.filter((p) =>
        p.holdings.some(
          (h) => Number(h.remaining) > 0 && matches(h, thirdFilter)
        )
      ).length,
    },
  ]
  return (
    <div className="inventory-category grid min-w-0 gap-5">
      <div
        role="group"
        aria-label="库存概览"
        className="grid grid-cols-3 gap-2 sm:gap-4"
      >
        {summaries.map(({ key, label, icon: Icon, count }) => (
          <Button
            key={key}
            variant="outline"
            className="stock-summary"
            aria-pressed={filter === key && !query}
            onClick={() => {
              setFilter(key)
              setQuery("")
              goTo(1)
            }}
          >
            <span className="grid justify-items-start gap-1">
              <span className="text-xs font-medium sm:text-sm">{label}</span>
              <strong className="text-2xl leading-none tabular-nums sm:text-3xl">
                {count ?? "—"}
              </strong>
            </span>
            <Icon aria-hidden="true" className="summary-icon hidden sm:block" />
          </Button>
        ))}
      </div>
      <Card className="min-w-0 gap-0 py-0 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b p-3 sm:gap-3 sm:p-4">
          <Input
            className="w-full sm:max-w-xs"
            aria-label="搜索库存"
            placeholder="搜索名称、位置或标签"
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              goTo(1)
            }}
          />
          <NativeSelect
            className="[&>select]:h-10"
            aria-label="库存筛选"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value)
              goTo(1)
            }}
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
        {!rows && !error && (
          <div role="status" className="grid gap-3 p-5">
            <span className="sr-only">正在读取库存…</span>
            {[1, 2, 3].map((n) => (
              <Skeleton key={n} className="h-12" />
            ))}
          </div>
        )}
        {rows &&
          (list.length ? (
            <div className="min-w-0">
              <StockList
                key={current}
                rows={list.slice(start, start + pageSize)}
                scope={scope}
                edit={openEditor}
                filter={filter}
              />
              <nav
                aria-label="库存分页"
                className="flex flex-wrap items-center justify-between gap-3 border-t p-3"
              >
                <span className="text-sm text-muted-foreground" role="status">
                  第 {start + 1}–{Math.min(start + pageSize, list.length)}{" "}
                  条，共 {list.length} 条
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <NativeSelect
                    aria-label="每页条数"
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value))
                      goTo(1)
                    }}
                  >
                    {[5, 10, 20].map((size) => (
                      <NativeSelectOption key={size} value={size}>
                        每页 {size} 条
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={current <= 1}
                    onClick={() => goTo(current - 1)}
                  >
                    上一页
                  </Button>
                  <span className="text-sm tabular-nums">
                    {current} / {pages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={current >= pages}
                    onClick={() => goTo(current + 1)}
                  >
                    下一页
                  </Button>
                </div>
              </nav>
            </div>
          ) : (
            <Empty>
              <Boxes />
              <EmptyHeader>
                <EmptyTitle>
                  {rows.length
                    ? "没有匹配的库存"
                    : "尚未登记" + categories[category]}
                </EmptyTitle>
              </EmptyHeader>
              {rows.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setQuery("")
                    setFilter("all")
                    goTo(1)
                  }}
                >
                  清除搜索与筛选
                </Button>
              )}
            </Empty>
          ))}
      </Card>
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
              setNewId(id)
            }
            setReload((n) => n + 1)
          }}
        />
      )}
    </div>
  )
}
