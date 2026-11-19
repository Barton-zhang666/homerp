import { useState, type FormEvent } from "react"
import { FieldGroup } from "@workspace/ui/components/field"
import { Button } from "@workspace/ui/components/button"
import { accounts, type Member } from "@/lib/api/accounts"
import { AccountField, Feedback, errorMessage } from "./account-fields"

export function ProfileEditor({
  member,
  saved,
  cancel,
}: {
  member: Member
  saved: (member: Member) => void
  cancel: () => void
}) {
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const value = (key: string) => String(form.get(key) ?? "").trim()
    setBusy(true)
    try {
      saved(
        await accounts.edit({
          name: value("name"),
          relationship: value("relationship"),
          birthday: value("birthday") || null,
          contact: value("contact"),
          emergency_contact: value("emergency_contact"),
        })
      )
    } catch (error) {
      setMessage(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }
  return (
    <form onSubmit={submit}>
      <FieldGroup>
        <p className="text-sm text-muted-foreground">
          这里填写的资料对已登录的家人可见。
        </p>
        <AccountField
          name="name"
          label="家庭称呼"
          defaultValue={member.name}
          required
          maxLength={64}
        />
        <AccountField
          name="relationship"
          label="家庭关系"
          defaultValue={member.relationship}
          maxLength={64}
        />
        <AccountField
          name="birthday"
          label="生日"
          type="date"
          defaultValue={member.birthday ?? ""}
        />
        <AccountField
          name="contact"
          label="联系方式"
          defaultValue={member.contact}
          maxLength={160}
        />
        <AccountField
          name="emergency_contact"
          label="紧急联系人"
          defaultValue={member.emergency_contact}
          maxLength={160}
        />
        <Feedback message={message} />
        <div className="flex gap-2">
          <Button disabled={busy}>保存资料</Button>
          <Button type="button" variant="outline" onClick={cancel}>
            取消
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}

export function SecurityForm({
  action,
  done,
  cancel,
}: {
  action: "password" | "deactivate"
  done: (notice: string) => void
  cancel: () => void
}) {
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const password = String(data.get("password"))
    setBusy(true)
    try {
      if (action === "password") {
        await accounts.password({
          password,
          new_password: String(data.get("new_password")),
        })
        done("密码已更新，请重新登录。")
      } else {
        await accounts.deactivate({ password })
        done("账号已停用，可凭原密码恢复。")
      }
    } catch (error) {
      setMessage(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }
  return (
    <form onSubmit={submit}>
      <FieldGroup>
        <p>
          {action === "password"
            ? "修改密码后，所有设备都需要重新登录。"
            : "停用后将退出所有设备。家庭名册保留你的资料。"}
        </p>
        <AccountField
          name="password"
          label="当前密码"
          type="password"
          autoComplete="current-password"
          required
          maxLength={128}
        />
        {action === "password" && (
          <AccountField
            name="new_password"
            label="新密码（至少 10 个字符）"
            type="password"
            autoComplete="new-password"
            required
            minLength={10}
            maxLength={128}
          />
        )}
        <Feedback message={message} />
        <div className="flex gap-2">
          <Button
            disabled={busy}
            variant={action === "password" ? "default" : "destructive"}
          >
            {action === "password" ? "确认修改密码" : "确认停用本人账号"}
          </Button>
          <Button type="button" variant="outline" onClick={cancel}>
            取消
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
