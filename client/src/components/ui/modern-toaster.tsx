import * as React from "react"
import { ModernToast, ToastContainer } from "./modern-toast"
import { useToast } from "@/hooks/use-toast"

export function ModernToaster() {
  const { toasts, dismiss } = useToast()

  if (toasts.length === 0) {
    return null
  }

  return (
    <ToastContainer position="top-right">
      {toasts.map((toast) => (
        <ModernToast
          key={toast.id}
          title={toast.title}
          description={toast.description}
          variant={toast.variant}
          action={toast.action}
          onClose={() => dismiss(toast.id)}
        />
      ))}
    </ToastContainer>
  )
}