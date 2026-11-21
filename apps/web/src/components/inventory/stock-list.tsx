import { Eye } from "lucide-react"
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
import type { Product, Holding } from "@/lib/api/inventory"
import type { Editor } from "./stock-form"
import { StockDetail } from "./stock-detail"
import { StockActions } from "./stock-actions"
import { describeExpiry, type Scope } from "./labels"

export type StockRow = { product: Product; batch?: Holding }

function stockStatus(product: Product, holdings: Holding[]) {
  const labels = []
  const has = (status: string) => holdings.some((h) => h.status === status)
  if (has("expired")) labels.push("待清理")
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
}: {
  rows: StockRow[]
  scope: Scope
  edit: (editor: Editor, trigger?: HTMLElement | null) => void
  filter: string
}) {
  return (
    <Table
      className="inventory-table table-fixed"
      aria-label={filter === "priority" ? "优先食用批次" : "库存清单"}
    >
      <TableHeader className="bg-muted/70">
        <TableRow>
          <TableHead className="pl-3 sm:pl-5">名称</TableHead>
          <TableHead className="hidden w-[18%] md:table-cell">位置</TableHead>
          <TableHead className="w-12 text-right sm:w-24">
            {filter === "priority" ? "批次" : "可用"}
            <span className="hidden sm:inline">数量</span>
          </TableHead>
          <TableHead className="w-24 pl-2 sm:w-36 sm:pl-6">状态</TableHead>
          <TableHead className="w-[4.5rem] text-center sm:w-40">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(({ product, batch }) => {
          const holdings = batch
            ? [batch]
            : product.holdings.filter((h) => Number(h.remaining) > 0)
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
          const { labels, attention } = stockStatus(product, holdings)
          const badge = (
            <Badge
              variant="secondary"
              className={
                attention ? "stock-status stock-status-alert" : "stock-status"
              }
            >
              {labels[0]}
            </Badge>
          )
          return (
            <TableRow
              key={batch?.id ?? product.id}
              className="h-16 focus-within:bg-accent/50"
            >
              <TableCell className="py-0 pl-3 sm:pl-5">
                <div
                  className="line-clamp-2 leading-tight font-semibold wrap-anywhere whitespace-normal md:block md:truncate"
                  title={product.name}
                >
                  {product.name}
                </div>
                <div
                  className="truncate text-xs text-muted-foreground md:hidden"
                  title={locations}
                >
                  {locations}
                </div>
                {metadata && (
                  <div
                    className="hidden truncate text-xs text-muted-foreground md:block"
                    title={metadata}
                  >
                    {metadata}
                  </div>
                )}
              </TableCell>
              <TableCell
                className="hidden truncate py-0 text-muted-foreground md:table-cell"
                title={locations}
              >
                {locations}
              </TableCell>
              <TableCell
                className="truncate py-0 text-right tabular-nums"
                title={
                  Number(batch?.remaining ?? product.available) +
                  " " +
                  product.unit
                }
              >
                <span className="font-semibold">
                  {Number(batch?.remaining ?? product.available)}
                </span>
                <span className="ml-0.5 text-xs text-muted-foreground">
                  {product.unit}
                </span>
              </TableCell>
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
