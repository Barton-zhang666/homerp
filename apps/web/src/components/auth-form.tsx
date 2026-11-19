import { useState, type FormEvent } from "react"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@workspace/ui/components/card"
import { FieldGroup } from "@workspace/ui/components/field"
import { accounts, type Self } from "@/lib/api/accounts"
import { AccountField, Feedback, errorMessage } from "./account-fields"

type Mode = "login" | "register" | "restore"
const titles = { login: "登录", register: "注册账号", restore: "恢复账号" }

export function AuthForm({
  onLogin,
  notice,
}: {
  onLogin: (user: Self) => void
  notice: string
}) {
  const [mode, setMode] = useState<Mode>("login")
  const [message, setMessage] = useState(notice)
  const [busy, setBusy] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const credentials = {
      email: String(form.get("email")),
      password: String(form.get("password")),
    }
    setBusy(true)
    setMessage("")
    try {
      onLogin(
        mode === "register"
          ? await accounts.register({
              ...credentials,
              name: String(form.get("name")),
            })
          : await accounts[mode](credentials)
      )
    } catch (error) {
      setMessage(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }
  return (
    <main className="grid min-h-svh place-items-center bg-muted/40 p-6">
      <section className="w-full max-w-sm space-y-5">
        <p className="text-center text-xl font-semibold tracking-tight">
          homerp
        </p>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{titles[mode]}</CardTitle>
            <CardDescription>
              {mode === "register"
                ? "注册后，你的称呼将出现在家庭名册中。"
                : mode === "restore"
                  ? "使用原登录邮箱和密码重新启用本人账号。"
                  : "登录后查看家庭成员和个人资料。"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form key={mode} onSubmit={submit}>
              <FieldGroup>
                {mode === "register" && (
                  <AccountField
                    label="家庭称呼"
                    name="name"
                    required
                    maxLength={64}
                  />
                )}
                <AccountField
                  label="登录邮箱"
                  name="email"
                  type="email"
                  autoComplete="username"
                  required
                  maxLength={254}
                />
                <AccountField
                  label={
                    mode === "register" ? "密码（至少 10 个字符）" : "密码"
                  }
                  name="password"
                  type="password"
                  required
                  minLength={mode === "register" ? 10 : 1}
                  maxLength={128}
                  autoComplete={
                    mode === "register" ? "new-password" : "current-password"
                  }
                />
                <Feedback message={message} />
                <Button disabled={busy}>{titles[mode]}</Button>
              </FieldGroup>
            </form>
            <div className="mt-4 flex justify-between">
              {(["login", "register", "restore"] as const)
                .filter((m) => m !== mode)
                .map((m) => (
                  <Button
                    disabled={busy}
                    key={m}
                    variant="link"
                    onClick={() => {
                      setMode(m)
                      setMessage("")
                    }}
                  >
                    {titles[m]}
                  </Button>
                ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
