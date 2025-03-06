import { Bell } from "lucide-react"

export function BellLogo() {
  return (
    <div className="flex items-center justify-center gap-4 my-4">
      <Bell className="w-12 h-12 text-foreground" />
      <h1 className="text-4xl font-bold">Habit Bell</h1>
    </div>
  )
}

