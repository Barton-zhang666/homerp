import { request, send } from "./client"
export { ApiError } from "./client"
import type { components } from "@homerp/api-types"

type Schema = components["schemas"]
export type Member = Schema["MemberView"]
export type Self = Schema["SelfView"]
export type Profile = Schema["ProfileInput"]

export const accounts = {
  me: () => request<Self>("/auth/me"),
  register: (body: Schema["Registration"]) =>
    request<Self>("/auth/register", "POST", body),
  login: (body: Schema["Credentials"]) =>
    request<Self>("/auth/login", "POST", body),
  logout: () => send("/auth/logout", "POST"),
  members: () => request<Member[]>("/members"),
  edit: (body: Profile) => request<Member>("/members/me", "PUT", body),
  password: (body: Schema["PasswordChange"]) =>
    send("/auth/password", "POST", body),
}
