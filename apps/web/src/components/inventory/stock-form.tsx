import { useState, type FormEvent } from "react"
import { Button } from "@workspace/ui/components/button"
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import {
  NativeSelect,
  NativeSelectOption,
} from "@workspace/ui/components/native-select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import {
  inventory,
  type Product,
  type StockInput,
  type Category,
  type Holding,
  type StockAction,
} from "@/lib/api/inventory"
import { AccountField, Feedback, errorMessage } from "../account-fields"
import { actions, categories, detailKeys, detailLabels } from "./labels"

type Mode = "register" | "edit" | StockAction
export type Editor = {
  mode: Mode
  product?: Product
  holding?: Holding
  movementId?: string
}
function ExpiryField({ category }: { category: Category }) {
  const [precision, setPrecision] = useState("day")
  return (
    <>
      <Field>
        <FieldLabel htmlFor="precision">包装日期</FieldLabel>
        <NativeSelect
          id="precision"
          name="precision"
          value={precision}
          onChange={(e) => setPrecision(e.target.value)}
        >
          <NativeSelectOption value="day">
            按日填写（可留空）
          </NativeSelectOption>
          {category === "medicine" ? (
            <NativeSelectOption value="month">包装只印年月</NativeSelectOption>
          ) : (
            <NativeSelectOption value="fresh">
              无包装日期（新鲜食材）
            </NativeSelectOption>
          )}
        </NativeSelect>
      </Field>
      {precision !== "fresh" && (
        <AccountField
          key={precision}
          name="expiry"
          label="包装标示到期日"
          type={precision === "month" ? "month" : "date"}
        />
      )}
    </>
  )
}

export function StockForm({
  editor,
  category,
  previousLocation,
  close,
  saved,
}: {
  editor: Editor
  category: Category
  previousLocation: string
  close: () => void
  saved: (id: string, location?: string) => void
}) {
  const { mode, product, holding } = editor
  const [requestId] = useState(() => crypto.randomUUID())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [packSize, setPackSize] = useState("")
  const [quantity, setQuantity] = useState(
    mode === "count" || mode === "verify_date"
      ? String(Number(holding?.remaining ?? 0))
      : "1"
  )
  const [showDetails, setShowDetails] = useState(mode === "edit")
  const isProduct = mode === "register" || mode === "edit"
  const receiving = mode === "register" || mode === "receive"
  const destination =
    receiving || ["move", "return", "retrieve", "lend", "repair"].includes(mode)
  const title =
    mode === "register"
      ? "登记" + categories[category]
      : mode === "edit"
        ? "编辑品目"
        : actions[mode]
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (busy) return
    const data = new FormData(e.currentTarget)
    const read = (key: string) => String(data.get(key) ?? "").trim()
    setBusy(true)
    setError("")
    try {
      const details: Product["details"] = {
        alias: "",
        brand: "",
        specification: "",
        form: "",
        tags: "",
        ingredients: "",
        allergens: "",
        instructions: "",
      }
      for (const key of detailKeys[category]) details[key] = read(key)
      const profile = {
        name: read("name"),
        details,
        minimum: read("minimum") || null,
        warning_days: Number(read("warning_days") || 7),
      }
      const receipt: StockInput = {
        request_id: requestId,
        action: isProduct ? "receive" : mode,
        quantity: quantity || "0",
        units_per_pack: packSize || null,
        source_id: editor.movementId ?? holding?.id ?? null,
        expected: mode === "count" ? holding?.remaining : null,
        location: read("location"),
        expiry: read("precision") === "fresh" ? "fresh" : read("expiry"),
        lot: read("lot"),
        note: read("note"),
      }
      let id = product?.id
      if (mode === "register")
        id = await inventory.register({
          ...profile,
          category,
          unit: read("unit"),
          receipt,
        })
      else if (product && mode === "edit")
        await inventory.edit(product.id, profile)
      else if (product) await inventory.move(product.id, receipt)
      saved(id!, receiving ? receipt.location : undefined)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Sheet
      open
      onOpenChange={(v) => {
        if (!v && !busy) close()
      }}
    >
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>
            {product
              ? [
                  product.name,
                  product.details.form,
                  product.details.specification,
                ]
                  .filter(Boolean)
                  .join(" · ")
              : "建立品目并登记第一批库存。"}
          </SheetDescription>
        </SheetHeader>
        <form className="px-5 pb-6" onSubmit={submit}>
          <FieldGroup>
            {isProduct && (
              <>
                <AccountField
                  name="name"
                  label="名称"
                  required
                  maxLength={128}
                  defaultValue={product?.name}
                />
                {mode === "register" && (
                  <AccountField
                    name="unit"
                    label="库存单位"
                    defaultValue={
                      category === "medicine"
                        ? "片"
                        : category === "food"
                          ? "份"
                          : "件"
                    }
                    required
                    maxLength={16}
                  />
                )}
                {category === "medicine" &&
                  (["form", "specification"] as const).map((key) => (
                    <AccountField
                      key={key}
                      name={key}
                      label={detailLabels[key]}
                      required
                      maxLength={128}
                      defaultValue={product?.details[key]}
                    />
                  ))}
              </>
            )}
            {mode !== "edit" && mode !== "undo" && (
              <AccountField
                name="quantity"
                label={
                  mode === "count" ? "盘点实数" : packSize ? "包装数" : "数量"
                }
                required
                type="number"
                step=".001"
                min={mode === "count" ? "0" : ".001"}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            )}
            {mode === "count" && (
              <p>
                账面 {Number(holding?.remaining)}，差额{" "}
                {Number(
                  (Number(quantity) - Number(holding?.remaining)).toFixed(3)
                )}{" "}
                {product?.unit}
              </p>
            )}
            {receiving && (
              <>
                <AccountField
                  name="packSize"
                  label="每包折合库存单位数（按包装入库时填写）"
                  type="number"
                  min=".001"
                  step=".001"
                  value={packSize}
                  onChange={(e) => setPackSize(e.target.value)}
                />
                {packSize && (
                  <p>
                    折合入库{" "}
                    {Number((Number(packSize) * Number(quantity)).toFixed(3))}{" "}
                    {product?.unit || "个库存单位"}
                  </p>
                )}
              </>
            )}
            {destination && (
              <AccountField
                name="location"
                label={
                  mode === "lend"
                    ? "借用人"
                    : mode === "repair"
                      ? "维修点"
                      : receiving
                        ? "存放位置"
                        : "目标位置"
                }
                defaultValue={receiving ? previousLocation : ""}
                maxLength={128}
                required={!receiving}
              />
            )}
            {receiving && (
              <AccountField
                name="lot"
                label={
                  category === "item" ? "单件标记或序列号" : "批号或包装标记"
                }
                maxLength={128}
              />
            )}
            {(receiving || mode === "verify_date") && category !== "item" && (
              <ExpiryField category={category} />
            )}
            {mode === "open" && (
              <AccountField
                name="expiry"
                label="已核对的开封后截止日"
                required
                type="date"
              />
            )}
            {mode === "undo" && (
              <p>确认撤回这笔流水？系统会核对后续用量并追加一条反向记录。</p>
            )}
            {mode !== "edit" && (
              <AccountField
                name="note"
                label={receiving ? "来源或备注" : "备注"}
                maxLength={512}
              />
            )}
            {isProduct && (
              <>
                <Button
                  variant="outline"
                  type="button"
                  aria-expanded={showDetails}
                  aria-controls="stock-details"
                  onClick={() => setShowDetails(!showDetails)}
                >
                  {showDetails ? "收起补充资料" : "补充资料与提醒"}
                </Button>
                <div id="stock-details" hidden={!showDetails}>
                  <FieldGroup>
                    {detailKeys[category]
                      .filter(
                        (key) =>
                          category !== "medicine" ||
                          !["form", "specification"].includes(key)
                      )
                      .map((key) => (
                        <AccountField
                          key={key}
                          name={key}
                          label={detailLabels[key]}
                          defaultValue={product?.details[key]}
                          required={
                            category === "medicine" &&
                            ["form", "specification"].includes(key)
                          }
                          maxLength={
                            [
                              "instructions",
                              "allergens",
                              "ingredients",
                            ].includes(key)
                              ? 512
                              : 128
                          }
                        />
                      ))}
                    <AccountField
                      name="minimum"
                      label="补货线"
                      type="number"
                      min="0"
                      step=".001"
                      defaultValue={product?.minimum ?? ""}
                    />
                    {category !== "item" && (
                      <AccountField
                        name="warning_days"
                        label="提前提醒天数"
                        type="number"
                        min="0"
                        max="365"
                        required
                        defaultValue={product?.warning_days ?? 7}
                      />
                    )}
                  </FieldGroup>
                </div>
              </>
            )}
            <Feedback message={error} />
            <Button disabled={busy}>
              {busy ? "正在保存…" : mode === "undo" ? "确认撤回" : "保存"}
            </Button>
          </FieldGroup>
        </form>
      </SheetContent>
    </Sheet>
  )
}
