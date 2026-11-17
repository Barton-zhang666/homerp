import type { components } from "@homerp/api-types"

export async function getHealth(): Promise<components["schemas"]["HealthResponse"]> {
  const response = await fetch("/api/health")
  if (!response.ok) {
    throw new Error(`健康检查失败：HTTP ${response.status}`)
  }
  return response.json()
}
