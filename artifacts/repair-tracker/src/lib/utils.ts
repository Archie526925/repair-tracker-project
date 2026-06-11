import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const TZ = "Asia/Taipei"

export function formatDate(input: string | number) {
  const ms = typeof input === "number" ? input * 1000 : input
  return new Date(ms).toLocaleDateString("zh-TW", { timeZone: TZ })
}

export function formatDateTime(input: string | number) {
  const ms = typeof input === "number" ? input * 1000 : input
  const d = new Date(ms)
  return (
    d.toLocaleDateString("zh-TW", { timeZone: TZ }) +
    " " +
    d.toLocaleTimeString("zh-TW", { timeZone: TZ, hour: "2-digit", minute: "2-digit" })
  )
}
