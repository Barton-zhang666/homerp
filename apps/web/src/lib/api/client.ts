import type { components } from "@homerp/api-types"

export async function getHealth(): Promise<
  components["schemas"]["HealthResponse"]
> {
  const response = await fetch("/api/health")
  if (!response.ok) {
    throw new Error(`健康检查失败：HTTP ${response.status}`)
  }
  return response.json()
}

export class ApiError extends Error {
  constructor(publicStatus: number, message: string) {
    super(message)
    this.status = publicStatus
  }
  readonly status: number
}

export async function send(
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
    if (response.status === 401 && path !== "/auth/me")
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

export async function request<T>(
  path: string,
  method = "GET",
  body?: unknown
): Promise<T> {
  const response = await send(path, method, body)
  return response.json()
}
