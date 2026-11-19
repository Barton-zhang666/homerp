import { useState, type ReactNode } from "react"
import {
  Cake,
  ChevronRight,
  LifeBuoy,
  NotebookTabs,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@workspace/ui/components/empty"
import { Input } from "@workspace/ui/components/input"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import { cn } from "@workspace/ui/lib/utils"
import type { Member, Self } from "@/lib/api/accounts"

function MemberAvatar({
  name,
  large = false,
}: {
  name: string
  large?: boolean
}) {
  return (
    <Avatar aria-hidden="true" className={large ? "size-16" : "size-11"}>
      <AvatarFallback
        className={cn(
          "bg-accent font-semibold text-accent-foreground",
          large && "text-2xl"
        )}
      >
        {Array.from(name.trim())[0]}
      </AvatarFallback>
    </Avatar>
  )
}

function DetailSection({
  title,
  icon,
  rows,
}: {
  title: string
  icon: ReactNode
  rows: [string, string | null | undefined][]
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-lg border">
      <h3 className="flex items-center gap-2 border-b bg-muted/45 px-4 py-3 font-semibold">
        {icon}
        {title}
      </h3>
      <dl className="divide-y px-4">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="grid grid-cols-[5em_minmax(0,1fr)] gap-3 py-3"
          >
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="wrap-anywhere">{value || "未填写"}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function birthdayLabel(date: string | null | undefined) {
  if (!date) return null
  const [year, month, day] = date.split("-").map(Number)
  const today = new Date()
  let age = today.getFullYear() - year
  if (
    today.getMonth() + 1 < month ||
    (today.getMonth() + 1 === month && today.getDate() < day)
  )
    age--
  return age >= 0 ? date + "（" + age + " 岁）" : date
}

function MemberPanel({ member, own }: { member: Member; own: boolean }) {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-4 py-1">
          <MemberAvatar name={member.name} large />
          <div className="grid min-w-0 flex-1 gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="min-w-0 text-2xl font-semibold wrap-anywhere">
                {member.name}
              </h2>
              {own && <Badge variant="secondary">本人</Badge>}
            </div>
            <p className="wrap-anywhere text-muted-foreground">
              {member.relationship || "家庭成员"}
            </p>
          </div>
          {own && (
            <Button asChild variant="outline">
              <a href="#profile">
                <UserRound data-icon="inline-start" />
                个人中心
              </a>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="details">
          <TabsList
            variant="line"
            aria-label="成员详情"
            className="mb-3 border-b"
          >
            <TabsTrigger value="details">
              <NotebookTabs data-icon="inline-start" />
              成员资料
            </TabsTrigger>
            <TabsTrigger value="access">
              <ShieldCheck data-icon="inline-start" />
              账号与权限
            </TabsTrigger>
          </TabsList>
          <TabsContent value="details" className="@container">
            <div className="grid items-start gap-4 @2xl:grid-cols-2">
              <div className="grid gap-4">
                <DetailSection
                  title="基本资料"
                  icon={<Cake />}
                  rows={[
                    ["家庭称呼", member.name],
                    ["家庭关系", member.relationship],
                    ["出生日期", birthdayLabel(member.birthday)],
                  ]}
                />
                <DetailSection
                  title="紧急联络"
                  icon={<LifeBuoy />}
                  rows={[["紧急联系人", member.emergency_contact]]}
                />
              </div>
              <DetailSection
                title="联系方式"
                icon={<Phone />}
                rows={[
                  ["主要联系", member.contact],
                  ["备用电话", member.backup_phone],
                  ["联系邮箱", member.contact_email],
                ]}
              />
            </div>
          </TabsContent>
          <TabsContent value="access">
            <DetailSection
              title="成员账号与访问范围"
              icon={<ShieldCheck />}
              rows={[
                ["账号身份", "家庭成员 · 自行注册"],
                ["共享读取", "已登录家人可查看家庭成员资料和共享记录。"],
                ["修改范围", "每位成员可以修改自己的资料和记录。"],
                ["登录凭据", "登录邮箱仅在本人的个人中心显示。"],
              ]}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

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
  const query = search.trim().toLocaleLowerCase()
  const filtered = members.filter((m) =>
    [m.name, m.relationship].some((value) =>
      value.toLocaleLowerCase().includes(query)
    )
  )
  const current = filtered.find((m) => m.id === selected) ?? filtered[0]
  return (
    <div className="member-directory grid gap-6">
      <div className="flex items-center gap-3">
        <UsersRound className="size-7 text-primary" />
        <h2 className="text-2xl font-semibold">家庭成员档案</h2>
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(13rem,0.85fr)_minmax(0,2.15fr)]">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>家庭成员（{members.length}）</CardTitle>
            <CardAction>
              <Button
                aria-label="刷新名册"
                title="刷新名册"
                variant="ghost"
                size="icon"
                onClick={refresh}
              >
                <RefreshCw />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                aria-label="查找成员"
                type="search"
                placeholder="搜索称呼或家庭关系"
                className="ps-9"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <nav
              aria-label="成员名册"
              className="grid max-h-60 gap-2 overflow-y-auto p-1 lg:max-h-[65svh]"
            >
              {filtered.map((member) => (
                <Button
                  key={member.id}
                  variant="outline"
                  className="h-auto w-full justify-start gap-3 px-3 py-3 text-start aria-current:border-primary aria-current:bg-accent"
                  aria-current={member.id === current?.id ? "true" : undefined}
                  onClick={() => setSelected(member.id)}
                >
                  <MemberAvatar name={member.name} />
                  <span className="grid min-w-0 flex-1 gap-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-semibold">
                        {member.name}
                      </span>
                      {member.id === user.member.id && (
                        <Badge variant="secondary">本人</Badge>
                      )}
                    </span>
                    <span className="truncate text-sm text-muted-foreground">
                      {member.relationship || "家庭成员"}
                    </span>
                  </span>
                  <ChevronRight data-icon="inline-end" />
                </Button>
              ))}
            </nav>
          </CardContent>
        </Card>
        {current ? (
          <MemberPanel
            key={current.id}
            member={current}
            own={current.id === user.member.id}
          />
        ) : (
          <Empty className="border">
            <EmptyHeader>
              <EmptyTitle>{query ? "没有匹配的成员" : "名册为空"}</EmptyTitle>
              {query && (
                <EmptyDescription>换一个称呼或家庭关系再试。</EmptyDescription>
              )}
            </EmptyHeader>
          </Empty>
        )}
      </div>
    </div>
  )
}
