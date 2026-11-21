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
import { describeExpiry, statuses, type Scope } from "./labels"

export type StockRow = { product: Product; batch?: Holding }

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
      className="table-fixed"
      aria-label={filter === "priority" ? "优先食用批次" : "库存清单"}
    >
      <TableHeader className="bg-muted/50">
        <TableRow>
          <TableHead className="pl-3">名称</TableHead>
          <TableHead className="hidden w-1/4 sm:table-cell">位置</TableHead>
          <TableHead className="w-20 sm:w-28">
            {filter === "priority" ? "批次数量" : "可用数量"}
          </TableHead>
          <TableHead className="w-20 text-center sm:w-44">操作</TableHead>
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
          const low =
            product.minimum !== null &&
            Number(product.available) <= Number(product.minimum)
          return (
            <TableRow key={batch?.id ?? product.id}>
              <TableCell className="py-3 pl-3 wrap-anywhere whitespace-normal">
                <div className="font-medium">{product.name}</div>
                <div className="text-sm text-muted-foreground">
                  {[
                    product.details.form,
                    product.details.specification,
                    batch?.lot,
                    batch && describeExpiry(batch.expiry),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
                <div className="text-sm text-muted-foreground sm:hidden">
                  {locations}
                </div>
                {batch && (
                  <Badge variant="secondary">
                    {batch.opened ? "已开封" : statuses[batch.status]}
                  </Badge>
                )}
                {low && <Badge variant="outline">库存不足</Badge>}
              </TableCell>
              <TableCell className="hidden wrap-anywhere whitespace-normal sm:table-cell">
                {locations}
              </TableCell>
              <TableCell className="wrap-anywhere whitespace-normal tabular-nums">
                {Number(batch?.remaining ?? product.available)} {product.unit}
              </TableCell>
              <TableCell>
                <div className="flex flex-col items-center justify-center gap-1 sm:flex-row sm:gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={product.name + "详情"}
                      >
                        详情
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
