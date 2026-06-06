import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const TZ = "Asia/Taipei"

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("zh-TW", { timeZone: TZ })
}

export function formatDateTime(iso: string) {
  const d = new Date(iso)
  return (
    d.toLocaleDateString("zh-TW", { timeZone: TZ }) +
    " " +
    d.toLocaleTimeString("zh-TW", { timeZone: TZ, hour: "2-digit", minute: "2-digit" })
  )
}
