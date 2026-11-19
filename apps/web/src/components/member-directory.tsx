import { useEffect, useState } from "react"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { accounts, type Member, type Self } from "@/lib/api/accounts"
import { AccountField, Feedback, errorMessage } from "./account-fields"
import { ProfileEditor, SecurityForm } from "./personal-settings"

type Panel = "view" | "edit" | "password" | "deactivate"

export function MemberDirectory({
  user,
  signedOut,
}: {
  user: Self
  signedOut: (notice: string) => void
}) {
  const [members, setMembers] = useState<Member[]>([user.member])
  const [selected, setSelected] = useState(user.member.id)
  const [search, setSearch] = useState("")
  const [panel, setPanel] = useState<Panel>("view")
  const [message, setMessage] = useState("")
  const [refresh, setRefresh] = useState(0)
  useEffect(() => {
    let active = true
    accounts
      .members()
      .then((rows) => {
        if (active) setMembers(rows)
      })
      .catch((error) => {
        if (active) setMessage(errorMessage(error))
      })
    return () => {
      active = false
    }
  }, [refresh])
  const current = members.find((m) => m.id === selected) ?? user.member
  const self = members.find((m) => m.id === user.member.id) ?? user.member
  const own = current.id === self.id
  const filtered = members.filter((m) =>
    [m.name, m.relationship].some((s) => s?.includes(search.trim()))
  )
  function choose(id: string) {
    setSelected(id)
    setPanel("view")
    setMessage("")
  }
  async function logout() {
    try {
      await accounts.logout()
      signedOut("已退出登录。")
    } catch (error) {
      setMessage(errorMessage(error))
    }
  }
  return (
    <div className="min-h-svh bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <span className="text-xl font-semibold tracking-tight">homerp</span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => choose(self.id)}>
              {self.name} · 我的资料
            </Button>
            <Button variant="outline" onClick={logout}>
              退出登录
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-6 md:p-10">
        <h1 className="mb-6 text-3xl font-semibold tracking-tight">家庭成员</h1>
        <Feedback message={message} />
        <div className="grid items-start gap-5 md:grid-cols-[18rem_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>成员名册</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <AccountField
                label="查找成员"
                name="search"
                type="search"
                placeholder="称呼或家庭关系"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <nav aria-label="成员名册" className="grid gap-2">
                {filtered.map((m) => (
                  <Button
                    key={m.id}
                    className="justify-between"
                    variant={m.id === selected ? "secondary" : "ghost"}
                    aria-current={m.id === selected ? "true" : undefined}
                    onClick={() => choose(m.id)}
                  >
                    <span className="truncate">{m.name}</span>
                    <span className="truncate text-xs">
                      {m.relationship || (m.id === self.id ? "本人" : "成员")}
                    </span>
                  </Button>
                ))}
                {!filtered.length && <p>没有匹配的成员。</p>}
              </nav>
              <Button
                variant="outline"
                onClick={() => {
                  setMessage("")
                  setRefresh((n) => n + 1)
                }}
              >
                刷新名册
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-3 text-2xl">
                {current.name}
                <Badge variant="secondary">
                  {current.active ? "已启用" : "已停用"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6">
              {panel === "view" && (
                <>
                  <dl className="grid gap-4 sm:grid-cols-2">
                    {[
                      ["家庭关系", current.relationship],
                      ["生日", current.birthday],
                      ["联系方式", current.contact],
                      ["紧急联系人", current.emergency_contact],
                      ...(own ? [["登录邮箱（仅本人可见）", user.email]] : []),
                    ].map(([key, value]) => (
                      <div key={key}>
                        <dt className="text-sm text-muted-foreground">{key}</dt>
                        <dd className="mt-1 break-words">
                          {value || "未填写"}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  {own && (
                    <div className="flex flex-wrap gap-2 border-t pt-4">
                      <Button onClick={() => setPanel("edit")}>
                        编辑我的资料
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setPanel("password")}
                      >
                        修改密码
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => setPanel("deactivate")}
                      >
                        停用我的账号
                      </Button>
                    </div>
                  )}
                </>
              )}
              {own && panel === "edit" && (
                <ProfileEditor
                  member={current}
                  cancel={() => setPanel("view")}
                  saved={(m) => {
                    setMembers((rows) =>
                      rows.map((row) => (row.id === m.id ? m : row))
                    )
                    setPanel("view")
                    setMessage("个人资料已保存。")
                  }}
                />
              )}
              {own && (panel === "password" || panel === "deactivate") && (
                <SecurityForm
                  key={panel}
                  action={panel}
                  done={signedOut}
                  cancel={() => setPanel("view")}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
