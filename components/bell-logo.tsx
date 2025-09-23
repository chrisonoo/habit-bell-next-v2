import { Bell } from "lucide-react";

/**
 * Renders the application's logo, which consists of a bell icon and the name "Habit Bell".
 * This component is positioned absolutely at the top of the viewport on larger screens.
 */
export function BellLogo() {
    return (
        <div className="absolute top-6 lg:top-9 z-10 hidden lg:block">
            <div className="flex items-center justify-center gap-4">
                <Bell className="w-7 h-7 text-foreground" />
                <h1 className="text-lg font-bold">Habit Bell</h1>
            </div>
        </div>
    );
}
