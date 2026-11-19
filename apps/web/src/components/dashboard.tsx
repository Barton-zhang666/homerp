import { ArrowRight, Cake, UsersRound } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import type { Member } from "@/lib/api/accounts"

export function Dashboard({ members }: { members: Member[] }) {
  const month = new Date().getMonth() + 1
  const birthdays = members
    .flatMap(({ id, name, birthday }) =>
      birthday && Number(birthday.slice(5, 7)) === month
        ? [{ id, name, day: Number(birthday.slice(8)) }]
        : []
    )
    .sort((a, b) => a.day - b.day)
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>家庭成员</CardTitle>
          <CardAction>
            <UsersRound className="size-5 text-muted-foreground" />
          </CardAction>
        </CardHeader>
        <CardContent className="flex-1">
          <span className="text-4xl font-semibold tabular-nums">
            {members.length}
          </span>
          <span className="ml-2 text-muted-foreground">人</span>
        </CardContent>
        <CardFooter>
          <Button variant="link" className="px-0" asChild>
            <a href="#members">
              查看成员名册
              <ArrowRight data-icon="inline-end" />
            </a>
          </Button>
        </CardFooter>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>本月生日</CardTitle>
          <CardAction>
            <Cake className="size-5 text-muted-foreground" />
          </CardAction>
        </CardHeader>
        <CardContent>
          {birthdays.length ? (
            <ul className="grid gap-2">
              {birthdays.map(({ id, name, day }) => (
                <li key={id} className="flex justify-between gap-4">
                  <span className="truncate">{name}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {month} 月 {day} 日
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">本月没有已登记的成员生日。</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
