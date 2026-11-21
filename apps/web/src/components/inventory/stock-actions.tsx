import { useRef } from "react"
import { ChevronDown, Ellipsis } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"

import type {
  Category,
  Holding,
  Product,
  StockAction,
} from "@/lib/api/inventory"
import type { Editor } from "./stock-form"
import { actions, describeExpiry } from "./labels"

function operations(
  category: Category,
  h: Holding,
  actorId: string
): StockAction[] {
  if (Number(h.remaining) === 0) return ["count"]
  if (h.custody === "lent") return ["return"]
  if (h.custody === "repair") return ["retrieve"]
  const ops: StockAction[] = ["move", "count", "discard"]
  if (category === "item") return [...ops, "lend", "repair", "use"]
  if (
    category === "food" ||
    !["expired", "unknown", "verify"].includes(h.status)
  )
    ops.push("use")
  if (!h.opened && h.received_by === actorId) ops.push("verify_date")
  if (
    !h.opened &&
    !["expired", "unknown", "verify"].includes(h.status) &&
    h.expiry.length !== 7
  )
    ops.push("open")
  return ops
}

export function StockActions({
  product,
  holdings,
  actorId,
  edit,
  includeProduct = false,
}: {
  product: Product
  holdings: Holding[]
  actorId: string
  edit: (editor: Editor, trigger?: HTMLElement | null) => void
  includeProduct?: boolean
}) {
  const openingForm = useRef(false)
  const trigger = useRef<HTMLButtonElement>(null)
  function choose(editor: Editor) {
    openingForm.current = true
    edit(editor, trigger.current)
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          ref={trigger}
          title="操作"
          className={
            includeProduct ? "size-8 p-0 sm:w-auto sm:px-2" : undefined
          }
          size="sm"
          variant="outline"
          aria-label={product.name + "操作"}
        >
          {includeProduct && (
            <Ellipsis aria-hidden="true" className="sm:hidden" />
          )}
          <span className={includeProduct ? "hidden sm:inline" : undefined}>
            操作
          </span>
          <ChevronDown
            data-icon="inline-end"
            className={includeProduct ? "hidden sm:block" : undefined}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="max-h-[min(65dvh,var(--radix-dropdown-menu-content-available-height))] overflow-y-auto"
        onCloseAutoFocus={(event) => {
          if (openingForm.current) event.preventDefault()
          openingForm.current = false
        }}
      >
        {includeProduct && (
          <DropdownMenuGroup>
            <DropdownMenuItem
              onSelect={() => choose({ mode: "receive", product })}
            >
              追加入库
            </DropdownMenuItem>
            {product.owner_id === actorId && (
              <DropdownMenuItem
                onSelect={() => choose({ mode: "edit", product })}
              >
                编辑品目
              </DropdownMenuItem>
            )}
          </DropdownMenuGroup>
        )}
        {holdings.map((holding) => (
          <DropdownMenuGroup key={holding.id}>
            <DropdownMenuLabel className="max-w-72 wrap-anywhere whitespace-normal">
              {[
                holding.location,
                holding.lot,
                product.category !== "item" && describeExpiry(holding.expiry),
                Number(holding.remaining) + " " + product.unit,
              ]
                .filter(Boolean)
                .join(" · ")}
            </DropdownMenuLabel>
            {operations(product.category, holding, actorId).map((mode) => (
              <DropdownMenuItem
                key={mode}
                onSelect={() => choose({ mode, product, holding })}
              >
                {actions[mode]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
