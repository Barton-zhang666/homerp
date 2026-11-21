import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
import { Card } from "@workspace/ui/components/card"
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableCell,
  TableRow,
} from "@workspace/ui/components/table"
import type { Product } from "@/lib/api/inventory"
import { actions, activeHoldings, describeExpiry, statuses } from "./labels"

export function FoodRecords({
  products,
  reminders,
  view,
}: {
  products: Product[]
  reminders: boolean
  view: (p: Product) => void
}) {
  const [page, setPage] = useState(1)
  const lines = reminders
    ? products
        .flatMap((p) =>
          activeHoldings(p)
            .filter((h) =>
              ["soon", "today", "expired", "unknown"].includes(h.status)
            )
            .map((h) => ({
              p,
              id: h.id,
              sort: h.expiry || "9999",
              date: describeExpiry(h.expiry),
              status: statuses[h.status],
              location: h.location,
              quantity: Number(h.remaining),
            }))
        )
        .sort((a, b) => a.sort.localeCompare(b.sort))
    : products
        .flatMap((p) =>
          p.history.map((m) => ({
            p,
            id: m.id,
            sort: m.occurred_at,
            date: new Date(m.occurred_at).toLocaleDateString("zh-CN"),
            status: actions[m.action],
            location: m.location,
            quantity: Number(m.destination_quantity) || Number(m.source_delta),
          }))
        )
        .sort((a, b) => b.sort.localeCompare(a.sort))
  const pages = Math.max(1, Math.ceil(lines.length / 10)),
    current = Math.min(page, pages)
  return (
    <Card className="gap-0 py-0">
      <Table aria-label={reminders ? "食品保质期提醒" : "食品出入库记录"}>
        <TableHeader>
          <TableRow>
            {[
              "食品名称",
              reminders ? "到期日" : "操作日期",
              reminders ? "状态" : "动作",
              "数量",
              "位置",
              "",
            ].map((label, i) => (
              <TableHead key={i}>{label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.slice((current - 1) * 10, current * 10).map((x) => (
            <TableRow key={x.id}>
              <TableCell>{x.p.name}</TableCell>
              <TableCell>{x.date}</TableCell>
              <TableCell>{x.status}</TableCell>
              <TableCell>
                {x.quantity} {x.p.unit}
              </TableCell>
              <TableCell>{x.location || "—"}</TableCell>
              <TableCell>
                <Button size="sm" variant="link" onClick={() => view(x.p)}>
                  查看库存
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {!lines.length && (
        <p className="p-5 text-muted-foreground">
          {reminders ? "当前没有保质期提醒" : "暂无库存流水"}
        </p>
      )}
      <nav
        aria-label="食品记录分页"
        className="flex items-center justify-end gap-2 border-t p-3"
      >
        <span className="mr-auto text-sm">共 {lines.length} 条</span>
        <Button
          variant="outline"
          size="sm"
          disabled={current === 1}
          onClick={() => setPage(current - 1)}
        >
          上一页
        </Button>
        <span>
          {current}/{pages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={current === pages}
          onClick={() => setPage(current + 1)}
        >
          下一页
        </Button>
      </nav>
    </Card>
  )
}
