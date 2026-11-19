import { useState, type FormEvent } from "react"
import { House } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { FieldGroup } from "@workspace/ui/components/field"
import { accounts, type Self } from "@/lib/api/accounts"
import { AccountField, Feedback, errorMessage } from "./account-fields"

type Mode = "login" | "register"
const titles = { login: "登录", register: "注册账号" }

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
    const confirmation = String(form.get("password_confirmation") ?? "")
    if (mode === "register" && confirmation !== credentials.password) {
      setMessage("两次输入的密码不一致")
      return
    }
    setBusy(true)
    setMessage("")
    try {
      onLogin(
        mode === "register"
          ? await accounts.register({
              ...credentials,
              password_confirmation: confirmation,
              name: String(form.get("name")),
            })
          : await accounts.login(credentials)
      )
    } catch (error) {
      setMessage(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }
  return (
    <main className="grid min-h-svh grid-rows-[auto_1fr] bg-background md:grid-cols-[1fr_2fr] md:grid-rows-1">
      <aside
        aria-label="homerp 家庭管理"
        className="flex items-center justify-center gap-3 bg-primary px-6 py-5 text-primary-foreground md:flex-col md:gap-4 md:text-center"
      >
        <House
          aria-hidden="true"
          strokeWidth={1.5}
          className="size-7 md:size-11"
        />
        <div>
          <p className="text-2xl leading-none font-medium tracking-tight md:text-5xl md:font-normal">
            homerp
          </p>
          <p className="mt-2 text-sm text-primary-foreground/75 md:mt-3 md:text-base">
            家庭管理空间
          </p>
        </div>
      </aside>
      <section
        aria-labelledby="auth-title"
        className="grid min-w-0 place-items-center px-6 py-10 sm:px-10"
      >
        <div className="w-full max-w-[25rem]">
          <header className="mb-8 text-center">
            <h1
              id="auth-title"
              className="text-2xl font-semibold tracking-tight"
            >
              {titles[mode]}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {mode === "register"
                ? "注册后，你的称呼将出现在家庭名册中。"
                : "登录后查看家庭成员和个人资料。"}
            </p>
          </header>
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
                placeholder="you@example.com"
                type="email"
                autoComplete="username"
                required
                maxLength={254}
              />
              <AccountField
                label={mode === "register" ? "密码（至少 10 个字符）" : "密码"}
                name="password"
                type="password"
                required
                minLength={mode === "register" ? 10 : 1}
                maxLength={128}
                autoComplete={
                  mode === "register" ? "new-password" : "current-password"
                }
              />
              {mode === "register" && (
                <AccountField
                  label="确认密码"
                  name="password_confirmation"
                  type="password"
                  required
                  maxLength={128}
                  autoComplete="new-password"
                />
              )}
              <Feedback message={message} />
              <Button className="w-full" size="lg" disabled={busy}>
                {titles[mode]}
              </Button>
            </FieldGroup>
          </form>
          <div className="mt-5 flex items-center justify-center gap-1 text-sm">
            <span className="text-muted-foreground">
              {mode === "login" ? "还没有账号？" : "已有账号？"}
            </span>
            <Button
              className="px-1"
              disabled={busy}
              variant="link"
              onClick={() => {
                setMode(mode === "login" ? "register" : "login")
                setMessage("")
              }}
            >
              {mode === "login" ? titles.register : titles.login}
            </Button>
          </div>
        </div>
      </section>
    </main>
  )
}
