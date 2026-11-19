import { useEffect, useState } from "react"
import { Button } from "@workspace/ui/components/button"
import { accounts, ApiError, type Self } from "@/lib/api/accounts"
import { AuthForm } from "@/components/auth-form"
import { MemberDirectory } from "@/components/member-directory"
import { errorMessage } from "@/components/account-fields"

export function App() {
  const [user, setUser] = useState<Self | null>(null)
  const [loading, setLoading] = useState(true)
  const [failure, setFailure] = useState("")
  const [notice, setNotice] = useState("")
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    const expired = () => {
      setUser(null)
      setNotice("请登录后继续。")
    }
    window.addEventListener("homerp:unauthenticated", expired)
    accounts
      .me()
      .then((me) => {
        if (active) setUser(me)
      })
      .catch((error) => {
        if (active && !(error instanceof ApiError && error.status === 401))
          setFailure(errorMessage(error))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
      window.removeEventListener("homerp:unauthenticated", expired)
    }
  }, [retry])
  if (loading || failure)
    return (
      <main className="grid min-h-svh place-content-center gap-4">
        <p role="status">{failure || "正在读取账号…"}</p>
        {failure && (
          <Button
            onClick={() => {
              setLoading(true)
              setFailure("")
              setRetry((n) => n + 1)
            }}
          >
            重试
          </Button>
        )}
      </main>
    )
  if (!user) return <AuthForm onLogin={setUser} notice={notice} />
  return (
    <MemberDirectory
      key={user.member.id}
      user={user}
      signedOut={(message) => {
        setNotice(message)
        setUser(null)
      }}
    />
  )
}
