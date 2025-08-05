'use client'

import { Toaster as HotToaster } from 'react-hot-toast'
import type { ToasterProps } from 'react-hot-toast'

// Temporary type suppression because of known type mismatch in react-hot-toast
export function ToastClient(props: ToasterProps = {}) {
  // @ts-expect-error Temporary fix for ReactNode typing issue in react-hot-toast with TS 5.9+
  return (
    <HotToaster
      position="top-right"
      toastOptions={{
        duration: 4000,
      }}
      {...props}
    />
  )
}
