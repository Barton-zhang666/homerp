import type { Member, Self } from "@/lib/api/accounts"
import type { Holding } from "@/lib/api/inventory"
import type { Category, Product, StockAction } from "@/lib/api/inventory"
export const categories: Record<Category, string> = {
  item: "物品",
  food: "食品",
  medicine: "药品",
}
export const categoryTitles = {
  item: "物品管理",
  food: "食品管理",
  medicine: "药品管理",
} satisfies Record<Category, string>
export const categoryKeys = Object.keys(categoryTitles) as Category[]

export const actions: Record<StockAction, string> = {
  receive: "入库",
  move: "移动",
  lend: "借出",
  return: "归还",
  repair: "送修",
  retrieve: "取回",
  use: "领用",
  discard: "处置",
  count: "盘点",
  open: "开封",
  verify_date: "核对包装日期",
  undo: "撤回",
}
export const statuses: Record<string, string> = {
  available: "可用",
  fresh: "无包装日期",
  unknown: "日期待补",
  today: "今日到期",
  soon: "临期",
  expired: "待清理",
  verify: "本月到期，核对包装",
}
export const detailLabels: Record<keyof Product["details"], string> = {
  alias: "别名",
  brand: "品牌或厂家",
  specification: "规格",
  form: "剂型",
  tags: "标签",
  ingredients: "配料表原文",
  allergens: "过敏原声明原文",
  instructions: "说明书原文",
}
export const detailKeys: Record<Category, (keyof Product["details"])[]> = {
  item: ["alias", "brand", "specification", "tags"],
  food: ["brand", "specification", "ingredients", "allergens", "tags"],
  medicine: ["form", "specification", "alias", "brand", "instructions", "tags"],
}
export function describeExpiry(expiry: string) {
  return expiry === "fresh" ? "无包装日期" : expiry || "日期待补"
}

export type Scope = { user: Self; members: Member[] }
export function matches(h: Holding, filter: string) {
  if (filter === "priority")
    return (
      h.custody === "home" &&
      !["unknown", "expired", "verify"].includes(h.status) &&
      (h.opened || ["soon", "today"].includes(h.status))
    )
  return h.status === filter || h.custody === filter
}

export function isLowStock(p: Product) {
  return p.minimum !== null && Number(p.available) <= Number(p.minimum)
}
export function activeHoldings(p: Product) {
  return p.holdings.filter((h) => Number(h.remaining) > 0)
}
export function earliestExpiry(holdings: Holding[]) {
  return holdings
    .map((h) => h.expiry)
    .filter((value) => /^\d{4}-/.test(value))
    .sort()[0]
}
