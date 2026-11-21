import { useEffect, useRef, useState } from "react"
import { Boxes, Plus, Box, Utensils, BriefcaseMedical } from "lucide-react"
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@workspace/ui/components/tabs"
import { InventoryOverview, ItemSidebar } from "./inventory-overview"
import { FoodRecords } from "./food-records"
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
import {
  categories,
  categoryTitles,
  matches,
  activeHoldings,
  earliestExpiry,
  isLowStock,
  type Scope,
} from "./labels"

const filters: Record<string, string> = {
  all: "全部库存",
  low: "库存不足",
  normal: "正常库存",
  empty: "无可用库存",
  expiring: "临期（含今日）",
  lent: "借出中",
  repair: "送修中",
  priority: "优先吃",
  soon: "临期",
  today: "今日到期",
  expired: "已过期",
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
  const [location, setLocation] = useState(
    () => sessionStorage.getItem(prefix + "filterLocation") ?? ""
  )
  const [sort, setSort] = useState(
    () => sessionStorage.getItem(prefix + "sort") ?? "name"
  )
  const [tab, setTab] = useState("stock")
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
    sessionStorage.setItem(prefix + "filterLocation", location)
    sessionStorage.setItem(prefix + "sort", sort)
    sessionStorage.setItem(prefix + "query", query)
    sessionStorage.setItem(prefix + "filter", filter)
    sessionStorage.setItem(prefix + "location", previousLocation)
  }, [prefix, query, filter, previousLocation, location, sort])
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
      ? ["normal", "empty", "lent", "repair"]
      : category === "food"
        ? ["expiring", "priority", "today", "soon", "expired", "unknown"]
        : ["expiring", "today", "soon", "verify", "expired", "unknown"]),
  ]
  const keyword = query.trim().toLocaleLowerCase()
  const list = (rows ?? []).flatMap((product): StockRow[] => {
    const stock = activeHoldings(product).filter(
      (h) => !location || h.location === location
    )
    if (location && !stock.length) return []
    const productFilter = ["all", "low", "normal", "empty"].includes(filter)
    const productText = [product.name, ...Object.values(product.details)]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase()
    const productMatches = productText.includes(keyword)
    const matchingStock = stock.filter(
      (h) =>
        productFilter ||
        (filter === "expiring"
          ? ["today", "soon"].includes(h.status)
          : matches(h, filter))
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
    if (filter === "low" && !isLowStock(product)) return []
    if (
      filter === "normal" &&
      (isLowStock(product) || Number(product.available) === 0)
    )
      return []
    if (filter === "empty" && Number(product.available) !== 0) return []
    if (!productFilter && !matchingStock.length) return []
    return [{ product, visibleHoldings: location ? stock : undefined }]
  })
  if (filter === "priority")
    list.sort((a, b) =>
      (a.batch?.expiry ?? "").localeCompare(b.batch?.expiry ?? "")
    )
  else if (sort === "quantity")
    list.sort(
      (a, b) => Number(a.product.available) - Number(b.product.available)
    )
  else if (sort === "expiry")
    list.sort((a, b) =>
      (
        earliestExpiry(a.visibleHoldings ?? activeHoldings(a.product)) ?? "9999"
      ).localeCompare(
        earliestExpiry(b.visibleHoldings ?? activeHoldings(b.product)) ?? "9999"
      )
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
  function selectFilter(key: string, name = "") {
    setLocation("")
    setFilter(key)
    setQuery(name)
    goTo(1)
    setTab("stock")
  }
  const places = [
    ...new Set(
      (rows ?? [])
        .flatMap((p) => activeHoldings(p).map((h) => h.location))
        .filter(Boolean)
    ),
  ].sort((a, b) => a.localeCompare(b, "zh-CN"))
  const titles = {
    item: "物品台账",
    food: "食品库存清单",
    medicine: "家庭药箱",
  }
  const descriptions = {
    item: "查看家庭物品的位置、可用数量和补货线。",
    food: "按批次追踪食品库存、存放位置与保质期。",
    medicine: "查看药品规格、有效期与家庭药箱余量。",
  }
  const Icon = { item: Box, food: Utensils, medicine: BriefcaseMedical }[
    category
  ]
  const stockView = (
    <>
      <InventoryOverview
        category={category}
        rows={rows}
        active={!query && !location ? filter : ""}
        select={selectFilter}
      />
      <div
        className={
          category === "item"
            ? "grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_14rem]"
            : "min-w-0"
        }
      >
        <Card className="min-w-0 gap-0 py-0 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
            <h2 className="ledger-section-title">
              {titles[category]}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                （共 {list.length} {filter === "priority" ? "批" : "项"}）
              </span>
            </h2>
            <NativeSelect
              aria-label="排序方式"
              disabled={filter === "priority"}
              value={filter === "priority" ? "expiry" : sort}
              onChange={(e) => {
                setSort(e.target.value)
                goTo(1)
              }}
            >
              <NativeSelectOption value="name">名称排序</NativeSelectOption>
              <NativeSelectOption value="quantity">
                家庭可用量升序
              </NativeSelectOption>
              {category !== "item" && (
                <NativeSelectOption value="expiry">
                  到期日升序
                </NativeSelectOption>
              )}
            </NativeSelect>
          </div>
          <div className="flex flex-wrap items-center gap-2 border-b p-3 sm:gap-3 sm:p-4">
            <Input
              className="w-full sm:max-w-xs"
              aria-label="搜索库存"
              placeholder={"搜索" + categories[category] + "名称、位置或标签"}
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                goTo(1)
              }}
            />
            <NativeSelect
              aria-label="存放位置"
              value={location}
              onChange={(e) => {
                setLocation(e.target.value)
                goTo(1)
              }}
            >
              <NativeSelectOption value="">全部位置</NativeSelectOption>
              {[...new Set([...places, ...(location ? [location] : [])])].map(
                (p) => (
                  <NativeSelectOption key={p} value={p}>
                    {p}
                  </NativeSelectOption>
                )
              )}
            </NativeSelect>
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
              variant="outline"
              disabled={
                !query && !location && filter === "all" && sort === "name"
              }
              onClick={() => {
                selectFilter("all")
                setSort("name")
              }}
            >
              重置
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
                  category={category}
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
                  <Button variant="outline" onClick={() => selectFilter("all")}>
                    清除搜索与筛选
                  </Button>
                )}
              </Empty>
            ))}
        </Card>
        {category === "item" && rows && (
          <ItemSidebar
            chooseLocation={(place) => {
              selectFilter("all")
              setLocation(place)
            }}
            rows={rows}
            select={() => selectFilter("low")}
            search={(name) => selectFilter("low", name)}
          />
        )}
      </div>
    </>
  )
  return (
    <div className="inventory-category grid min-w-0 gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Icon className="size-8 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <h1 className="text-2xl font-bold">{categoryTitles[category]}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {descriptions[category]}
            </p>
          </div>
        </div>
        <Button
          ref={registerButton}
          onClick={() => openEditor({ mode: "register" })}
        >
          <Plus data-icon="inline-start" />
          新增{categories[category]}
        </Button>
      </header>
      {category === "food" ? (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList variant="line" aria-label="食品管理视图">
            <TabsTrigger value="stock">食品库存</TabsTrigger>
            <TabsTrigger value="history">出入库记录</TabsTrigger>
            <TabsTrigger value="reminders">保质期提醒</TabsTrigger>
          </TabsList>
          <TabsContent value="stock" className="grid min-w-0 gap-4">
            {stockView}
          </TabsContent>
          {["history", "reminders"].map((key) => (
            <TabsContent value={key} key={key} className="min-w-0">
              {error ? (
                <>
                  <Feedback message={error} />
                  <Button onClick={() => setReload((n) => n + 1)}>重试</Button>
                </>
              ) : rows ? (
                <FoodRecords
                  products={rows}
                  reminders={key === "reminders"}
                  view={(p) => selectFilter("all", p.name)}
                />
              ) : (
                <Skeleton className="h-24" />
              )}
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        stockView
      )}
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
              selectFilter("all")
              setNewId(id)
            }
            setReload((n) => n + 1)
          }}
        />
      )}
    </div>
  )
}
