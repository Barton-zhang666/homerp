import type { ComponentProps } from "react"
import { Field, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Alert, AlertDescription } from "@workspace/ui/components/alert"

export function AccountField({
  label,
  name,
  ...props
}: ComponentProps<typeof Input> & { label: string; name: string }) {
  return (
    <Field>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Input id={name} name={name} {...props} />
    </Field>
  )
}

export function Feedback({ message }: { message: string }) {
  return message ? (
    <Alert>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  ) : null
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "操作失败，请重试"
}
