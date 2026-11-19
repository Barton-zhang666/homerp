import { useEffect, useState, useSyncExternalStore } from "react"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@workspace/ui/components/sidebar"
import { TooltipProvider } from "@workspace/ui/components/tooltip"
import { Button } from "@workspace/ui/components/button"
import { accounts, type Member, type Self } from "@/lib/api/accounts"
import { errorMessage, Feedback } from "./account-fields"
import { Dashboard } from "./dashboard"
import { MemberDirectory } from "./member-directory"
import { PersonalCenter } from "./member-profile"
import {
  pageTitles,
  WorkspaceNavigation,
  type Page,
} from "./workspace-navigation"

function subscribeToPage(notify: () => void) {
  window.addEventListener("hashchange", notify)
  return () => window.removeEventListener("hashchange", notify)
}

function currentPage(): Page {
  const hash = window.location.hash.slice(1)
  return hash === "members" || hash === "profile" ? hash : "dashboard"
}

export function Workspace({
  user,
  saved,
  signedOut,
}: {
  user: Self
  saved: (member: Member) => void
  signedOut: (notice: string) => void
}) {
  const page = useSyncExternalStore(subscribeToPage, currentPage)
  const [members, setMembers] = useState<Member[] | null>(null)
  const [loadError, setLoadError] = useState("")
  const [logoutError, setLogoutError] = useState("")
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let active = true
    accounts
      .members()
      .then((rows) => {
        if (active) setMembers(rows)
      })
      .catch((error) => {
        if (active) setLoadError(errorMessage(error))
      })
    return () => {
      active = false
    }
  }, [revision])
  function refresh() {
    setLoadError("")
    setRevision((n) => n + 1)
  }
  async function logout() {
    try {
      await accounts.logout()
      signedOut("已退出登录。")
    } catch (error) {
      setLogoutError(errorMessage(error))
    }
  }
  return (
    <TooltipProvider>
      <SidebarProvider
        defaultOpen={
          !document.cookie.split("; ").includes("sidebar_state=false")
        }
      >
        <WorkspaceNavigation user={user} page={page} logout={logout} />
        <SidebarInset className="min-w-0">
          <header className="flex h-16 shrink-0 items-center gap-4 border-b px-4 md:px-6">
            <SidebarTrigger aria-label="切换侧边栏" />
            <h1 className="text-xl font-semibold">{pageTitles[page]}</h1>
          </header>
          <div className="w-full max-w-screen-2xl p-4 md:p-6 xl:p-8">
            <Feedback message={logoutError} />
            {page === "profile" ? (
              <PersonalCenter
                user={user}
                signedOut={signedOut}
                saved={(member) => {
                  saved(member)
                  setMembers(
                    (rows) =>
                      rows?.map((row) =>
                        row.id === member.id ? member : row
                      ) ?? null
                  )
                }}
              />
            ) : (
              <>
                {loadError && (
                  <div className="mb-4 grid justify-items-start gap-2">
                    <Feedback message={loadError} />
                    <Button onClick={refresh} variant="outline">
                      重试
                    </Button>
                  </div>
                )}
                {!members && !loadError && (
                  <p role="status">正在读取成员名册…</p>
                )}
                {members &&
                  (page === "dashboard" ? (
                    <Dashboard members={members} />
                  ) : (
                    <MemberDirectory
                      user={user}
                      members={members}
                      refresh={refresh}
                    />
                  ))}
              </>
            )}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
