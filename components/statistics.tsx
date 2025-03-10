"use client";

import { Button } from "@/components/ui/button";
import { CircleDollarSign, CirclePause, Flag } from "lucide-react";
import { usePauseContext } from "@/contexts/pause-context";

/**
 * Statistics Component
 *
 * Wyświetla statystyki aplikacji, w tym liczbę pauz.
 *
 * @returns {JSX.Element} The rendered component
 */
export function Statistics() {
    // Pobierz liczbę pauz z kontekstu
    const { todayPauseCount } = usePauseContext();

    return (
        <div className="absolute top-4 left-4 z-10 flex gap-3 items-center">
            {/* Coins Counter Button */}
            <div className="flex gap-1 items-center">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 lg:h-14 lg:w-14"
                >
                    <CircleDollarSign className="!h-6 !w-6 lg:!h-8 lg:!w-8" />
                    <span className="sr-only">Reset timer</span>
                </Button>
                <div className="text-xl lg:text-2xl">2</div>
            </div>

            {/* Interval Counter Button */}
            <div className="flex gap-1 items-center">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 lg:h-14 lg:w-14"
                >
                    <Flag className="!h-6 !w-6 lg:!h-8 lg:!w-8" />
                    <span className="sr-only">Reset timer</span>
                </Button>
                <div className="text-xl lg:text-2xl">2</div>
            </div>

            {/* Pause Counter Button */}
            <div className="flex gap-1 items-center">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 lg:h-14 lg:w-14"
                >
                    <CirclePause className="!h-6 !w-6 lg:!h-8 lg:!w-8" />
                    <span className="sr-only">Pause counter</span>
                </Button>
                <div className="text-xl lg:text-2xl">{todayPauseCount}</div>
            </div>
        </div>
    );
}
