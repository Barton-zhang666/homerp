import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import type { Member, Self } from "@/lib/api/accounts"
import { Feedback } from "./account-fields"
import { PasswordForm, ProfileEditor } from "./personal-settings"

export function MemberDetails({
  member,
  email,
}: {
  member: Member
  email?: string
}) {
  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      {[
        ["家庭关系", member.relationship],
        ["生日", member.birthday],
        ["联系方式", member.contact],
        ["备用电话", member.backup_phone],
        ["联系邮箱", member.contact_email],
        ["紧急联系人", member.emergency_contact],
        ...(email ? [["登录邮箱（仅本人可见）", email]] : []),
      ].map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-sm text-muted-foreground">{label}</dt>
          <dd className="mt-1 wrap-anywhere">{value || "未填写"}</dd>
        </div>
      ))}
    </dl>
  )
}

export function PersonalCenter({
  user,
  saved,
  signedOut,
}: {
  user: Self
  saved: (member: Member) => void
  signedOut: (notice: string) => void
}) {
  const [panel, setPanel] = useState<"view" | "edit" | "password">("view")
  const [message, setMessage] = useState("")
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>
          {panel === "view"
            ? user.member.name
            : panel === "edit"
              ? "编辑我的资料"
              : "修改密码"}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6">
        {panel === "view" && (
          <>
            <Feedback message={message} />
            <MemberDetails member={user.member} email={user.email} />
            <div className="flex flex-wrap gap-2 border-t pt-4">
              <Button onClick={() => setPanel("edit")}>编辑我的资料</Button>
              <Button variant="outline" onClick={() => setPanel("password")}>
                修改密码
              </Button>
            </div>
          </>
        )}
        {panel === "edit" && (
          <ProfileEditor
            member={user.member}
            cancel={() => setPanel("view")}
            saved={(member) => {
              saved(member)
              setMessage("个人资料已保存。")
              setPanel("view")
            }}
          />
        )}
        {panel === "password" && (
          <PasswordForm done={signedOut} cancel={() => setPanel("view")} />
        )}
      </CardContent>
    </Card>
  )
}
