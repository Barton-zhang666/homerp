import type { components } from "@homerp/api-types"

type Schema = components["schemas"]
export type Member = Schema["MemberView"]
export type Self = Schema["SelfView"]
export type Profile = Schema["ProfileInput"]

export class ApiError extends Error {
  constructor(publicStatus: number, message: string) {
    super(message)
    this.status = publicStatus
  }
  readonly status: number
}

async function send(
  path: string,
  method = "GET",
  body?: unknown
): Promise<Response> {
  const response = await fetch("/api" + path, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    headers: { "Content-Type": "application/json", "X-Homerp-Request": "1" },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    if (response.status === 401)
      window.dispatchEvent(new Event("homerp:unauthenticated"))
    throw new ApiError(
      response.status,
      typeof data.detail === "string"
        ? data.detail
        : "请求失败，请检查填写内容后重试"
    )
  }
  return response
}

async function request<T>(
  path: string,
  method = "GET",
  body?: unknown
): Promise<T> {
  const response = await send(path, method, body)
  return response.json()
}

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
