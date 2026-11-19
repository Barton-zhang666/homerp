import { useSyncExternalStore } from "react"

const mobileQuery = "(width < 768px)"

function subscribe(notify: () => void) {
  const query = window.matchMedia(mobileQuery)
  query.addEventListener("change", notify)
  return () => query.removeEventListener("change", notify)
}

export function useIsMobile() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(mobileQuery).matches,
    () => false
  )
}
