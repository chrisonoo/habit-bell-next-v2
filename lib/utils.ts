import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTime(timeInSeconds: number): { minutes: number; seconds: number } {
  const minutes = Math.floor(timeInSeconds / 60)
  const seconds = timeInSeconds % 60
  return { minutes, seconds }
}

