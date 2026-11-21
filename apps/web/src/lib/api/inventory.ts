import type { components } from "@homerp/api-types"
import { request, send } from "./client"
type Schema = components["schemas"]
export type Product = Schema["InventoryView"]
export type Category = Schema["Category"]
export type StockAction = Schema["Action"]
export type StockInput = Schema["StockInput"]
export type ProductEdit = Schema["ProductEdit"]
export type Holding = Schema["HoldingView"]
export const inventory = {
  list: (category: Category) =>
    request<Product[]>("/inventory?category=" + category),
  register: (data: Schema["RegistrationInput"]) =>
    request<string>("/inventory", "POST", data),
  edit: (id: string, data: ProductEdit) =>
    send("/inventory/" + id, "PUT", data),
  move: (id: string, data: StockInput) =>
    send("/inventory/" + id + "/movements", "POST", data),
}
