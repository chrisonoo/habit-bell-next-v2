import { Bell } from "lucide-react";

export function BellLogo() {
    return (
        <div className="absolute top-6 lg:top-9 z-10">
            <div className="flex items-center justify-center gap-4">
                <Bell className="w-7 h-7 text-foreground" />
                <h1 className="text-lg font-bold">Habit Bell</h1>
            </div>
        </div>
    );
}
