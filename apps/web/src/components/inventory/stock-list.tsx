import { useState } from "react"
import { Eye, ChevronRight } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Dialog, DialogTrigger } from "@workspace/ui/components/dialog"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@workspace/ui/components/table"
import type { Product, Holding, Category } from "@/lib/api/inventory"
import type { Editor } from "./stock-form"
import { StockDetail } from "./stock-detail"
import { StockActions } from "./stock-actions"
import {
  categories,
  activeHoldings,
  earliestExpiry,
  describeExpiry,
  type Scope,
} from "./labels"

export type StockRow = {
  product: Product
  batch?: Holding
  visibleHoldings?: Holding[]
}

function stockStatus(product: Product, holdings: Holding[]) {
  const labels = []
  const has = (status: string) => holdings.some((h) => h.status === status)
  if (has("expired")) labels.push("已过期")
  if (has("today")) labels.push("今日到期")
  if (
    product.minimum !== null &&
    Number(product.available) <= Number(product.minimum)
  )
    labels.push("库存不足")
  if (has("soon")) labels.push("临期")
  if (has("verify")) labels.push("本月需核对")
  if (has("unknown") && product.category !== "item") labels.push("日期待补")
  const attention = labels.length > 0
  if (holdings.some((h) => h.opened)) labels.push("已开封")
  if (holdings.some((h) => h.custody === "lent")) labels.push("借出中")
  if (holdings.some((h) => h.custody === "repair")) labels.push("送修中")
  if (!labels.length) labels.push(holdings.length ? "在库" : "暂无库存")
  return { labels, attention }
}

export function StockList({
  rows,
  scope,
  edit,
  filter,
  category,
}: {
  rows: StockRow[]
  scope: Scope
  edit: (editor: Editor, trigger?: HTMLElement | null) => void
  filter: string
  category: Category
}) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const displayRows = rows.flatMap((row) =>
    category === "food" && !row.batch && expanded === row.product.id
      ? [
          row,
          ...(row.visibleHoldings ?? activeHoldings(row.product)).map(
            (batch) => ({ product: row.product, batch })
          ),
        ]
      : [row]
  )
  return (
    <Table
      className="inventory-table table-fixed"
      aria-label={filter === "priority" ? "优先食用批次" : "库存清单"}
    >
      <TableHeader className="bg-muted/70">
        <TableRow>
          <TableHead className="pl-3 sm:pl-5">
            {categories[category]}名称
          </TableHead>
          {category === "medicine" && (
            <TableHead className="hidden w-[12%] lg:table-cell">规格</TableHead>
          )}
          <TableHead className="hidden w-[18%] md:table-cell">位置</TableHead>
          <TableHead className="w-12 text-right sm:w-24">
            {filter === "priority" ? "批次" : "库存"}
            <span className="hidden sm:inline">数量</span>
          </TableHead>
          {category !== "item" && (
            <TableHead className="hidden w-[13%] lg:table-cell">
              {category === "food" ? "最近到期日" : "有效期"}
            </TableHead>
          )}
          <TableHead className="w-24 pl-2 sm:w-28 sm:pl-6">状态</TableHead>
          <TableHead className="w-[4.5rem] text-center sm:w-36 2xl:w-48">
            操作
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {displayRows.map(({ product, batch, visibleHoldings }: StockRow) => {
          const holdings = batch
            ? [batch]
            : (visibleHoldings ?? activeHoldings(product))
          const quantity = Number(
            holdings.reduce((sum, h) => sum + Number(h.remaining), 0).toFixed(3)
          )
          const locations =
            [...new Set(holdings.map((h) => h.location))].join("、") ||
            "暂无余量"
          const metadata = [
            product.details.form,
            product.details.specification,
            batch?.lot,
            batch && describeExpiry(batch.expiry),
          ]
            .filter(Boolean)
            .join(" · ")
          const isChild = Boolean(batch) && filter !== "priority"
          const name = isChild
            ? "批次 · " + (batch?.lot || "未录批号")
            : product.name
          const expiry =
            earliestExpiry(holdings) ??
            (holdings.some((h) => h.expiry === "fresh") ? "无包装日期" : "—")
          const { labels, attention } = stockStatus(product, holdings)
          const badge = (
            <Badge
              variant="secondary"
              className={
                labels[0] === "已过期"
                  ? "stock-status stock-expired"
                  : attention
                    ? "stock-status stock-status-alert"
                    : "stock-status"
              }
            >
              {labels[0]}
            </Badge>
          )
          return (
            <TableRow
              key={batch ? "batch-" + batch.id : product.id}
              data-batch={isChild || undefined}
              className="h-16 focus-within:bg-accent/50 md:h-12"
            >
              <TableCell className="py-0 pl-3 sm:pl-5">
                <div className="flex min-w-0 items-center gap-1">
                  {category === "food" && !batch && holdings.length > 0 && (
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      className="size-5 shrink-0"
                      aria-expanded={expanded === product.id}
                      aria-label={product.name + "的批次"}
                      onClick={() =>
                        setExpanded(expanded === product.id ? null : product.id)
                      }
                    >
                      <ChevronRight
                        className={expanded === product.id ? "rotate-90" : ""}
                      />
                    </Button>
                  )}
                  <div
                    className="line-clamp-2 leading-tight font-semibold wrap-anywhere whitespace-normal md:block md:truncate"
                    title={name}
                  >
                    {name}
                  </div>
                </div>
                <div
                  className="truncate text-xs text-muted-foreground md:hidden"
                  title={locations}
                >
                  {locations}
                </div>
                {metadata && (
                  <div
                    className={
                      category === "medicine"
                        ? "hidden truncate text-xs text-muted-foreground md:block lg:hidden"
                        : "hidden truncate text-xs text-muted-foreground md:block"
                    }
                    title={metadata}
                  >
                    {metadata}
                  </div>
                )}
              </TableCell>
              {category === "medicine" && (
                <TableCell
                  className="hidden truncate py-0 lg:table-cell"
                  title={metadata}
                >
                  {metadata || "—"}
                </TableCell>
              )}
              <TableCell
                className="hidden truncate py-0 text-muted-foreground md:table-cell"
                title={locations}
              >
                {locations}
              </TableCell>
              <TableCell
                className="truncate px-0.5 py-0 text-right tabular-nums sm:px-2"
                title={quantity + " " + product.unit}
              >
                <span className="font-semibold">{quantity}</span>
                <span className="ml-0.5 text-xs text-muted-foreground">
                  {product.unit}
                </span>
              </TableCell>
              {category !== "item" && (
                <TableCell
                  className="hidden truncate py-0 tabular-nums lg:table-cell"
                  title={expiry}
                >
                  {expiry}
                </TableCell>
              )}
              <TableCell className="py-0 pl-2 sm:pl-6">
                {labels.length === 1 ? (
                  badge
                ) : (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-0.5 px-0"
                        aria-label={product.name + "的全部状态"}
                      >
                        {badge}
                        <span className="text-xs">+{labels.length - 1}</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent aria-label="库存状态" className="w-fit">
                      <ul className="grid gap-1">
                        {labels.map((label) => (
                          <li key={label}>{label}</li>
                        ))}
                      </ul>
                    </PopoverContent>
                  </Popover>
                )}
              </TableCell>
              <TableCell className="px-0 py-0">
                <div className="flex items-center justify-center gap-0.5 sm:gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="size-8 p-0 text-primary sm:h-8 sm:w-auto sm:px-2"
                        aria-label={product.name + "详情"}
                        title="详情"
                      >
                        <Eye aria-hidden="true" className="sm:hidden" />
                        <span className="hidden sm:inline">详情</span>
                      </Button>
                    </DialogTrigger>
                    <StockDetail
                      p={product}
                      scope={scope}
                      edit={edit}
                      filter={filter}
                    />
                  </Dialog>
                  {!batch && (
                    <Button
                      size="sm"
                      variant="link"
                      className="hidden px-1 2xl:inline-flex"
                      aria-label={product.name + "入库"}
                      onClick={(e) =>
                        edit({ mode: "receive", product }, e.currentTarget)
                      }
                    >
                      入库
                    </Button>
                  )}
                  <StockActions
                    product={product}
                    holdings={holdings}
                    actorId={scope.user.member.id}
                    edit={edit}
                    includeProduct
                  />
                </div>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
