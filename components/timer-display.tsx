import { cn } from "@/lib/utils";

interface TimerDisplayProps {
    minutes: number;
    seconds: number;
    className?: string;
    size?: "large" | "small";
    color?: string;
}

export function TimerDisplay({
    minutes,
    seconds,
    className,
    size = "large",
    color = "text-foreground",
}: TimerDisplayProps) {
    const formattedMinutes = String(minutes).padStart(2, "0");
    const formattedSeconds = String(seconds).padStart(2, "0");

    return (
        <div
            className={cn(
                "font-mono tabular-nums",
                size === "large"
                    ? "text-[6rem] lg:text-[12rem] leading-none"
                    : "text-[2.5rem] lg:text-[3.5rem] leading-tight",
                color,
                className
            )}
            aria-live={size === "large" ? "polite" : "off"}
            role="timer"
        >
            {formattedMinutes}:{formattedSeconds}
        </div>
    );
}
