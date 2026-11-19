import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import type { Member, Self } from "@/lib/api/accounts"
import { AccountField } from "./account-fields"
import { MemberDetails } from "./member-profile"

export function MemberDirectory({
  user,
  members,
  refresh,
}: {
  user: Self
  members: Member[]
  refresh: () => void
}) {
  const [selected, setSelected] = useState(user.member.id)
  const [search, setSearch] = useState("")
  const current = members.find((m) => m.id === selected) ?? user.member
  const own = current.id === user.member.id
  const filtered = members.filter((m) =>
    [m.name, m.relationship].some((value) => value?.includes(search.trim()))
  )
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(14rem,18rem)_minmax(0,1fr)]">
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
                onClick={() => setSelected(m.id)}
              >
                <span className="truncate">{m.name}</span>
                <span className="truncate text-xs">
                  {m.relationship ||
                    (m.id === user.member.id ? "本人" : "成员")}
                </span>
              </Button>
            ))}
            {!filtered.length && <p>没有匹配的成员。</p>}
          </nav>
          <Button variant="outline" onClick={refresh}>
            刷新名册
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-3 text-2xl">
            {current.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6">
          <MemberDetails member={current} />
          {own && (
            <Button variant="outline" asChild>
              <a href="#profile">前往个人中心</a>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
