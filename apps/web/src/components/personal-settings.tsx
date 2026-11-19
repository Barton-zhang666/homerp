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
          backup_phone: value("backup_phone") || null,
          contact_email: value("contact_email") || null,
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
          name="backup_phone"
          label="备用电话"
          type="tel"
          maxLength={64}
          defaultValue={member.backup_phone ?? ""}
        />
        <AccountField
          name="contact_email"
          label="联系邮箱（家人可见）"
          type="email"
          maxLength={254}
          defaultValue={member.contact_email ?? ""}
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

export function PasswordForm({
  done,
  cancel,
}: {
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
      await accounts.password({
        password,
        new_password: String(data.get("new_password")),
      })
      done("密码已更新，请重新登录。")
    } catch (error) {
      setMessage(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }
  return (
    <form onSubmit={submit}>
      <FieldGroup>
        <p>修改密码后，所有设备都需要重新登录。</p>
        <AccountField
          name="password"
          label="当前密码"
          type="password"
          autoComplete="current-password"
          required
          maxLength={128}
        />
        <AccountField
          name="new_password"
          label="新密码（至少 10 个字符）"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          maxLength={128}
        />
        <Feedback message={message} />
        <div className="flex gap-2">
          <Button disabled={busy}>确认修改密码</Button>
          <Button type="button" variant="outline" onClick={cancel}>
            取消
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
