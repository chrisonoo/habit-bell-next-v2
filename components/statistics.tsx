"use client";

import { Button } from "@/components/ui/button";
import { CircleDollarSign, CirclePause, Flag } from "lucide-react";
import { useActivityContext } from "@/contexts/activity-context";
import { useEffect, useState } from "react";
import { StatisticsDialog } from "@/components/statistics-dialog";

/**
 * Statistics Component
 *
 * Displays statistics for the application, including the number of pauses, intervals, and sessions.
 * Clicking on any statistic button opens a fullscreen dialog with detailed statistics.
 *
 * @returns {JSX.Element} The rendered component
 */
export function Statistics() {
    // Get activity counts from context
    const { todayPauseCount, todayIntervalCount, todaySessionCount } =
        useActivityContext();

    // State for controlling the visibility of the statistics dialog
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Log changes to activity counts for debugging
    useEffect(() => {
        console.log(
            "[STATISTICS][DEBUG] Today's pause count updated:",
            todayPauseCount
        );
    }, [todayPauseCount]);

    useEffect(() => {
        console.log(
            "[STATISTICS][DEBUG] Today's interval count updated:",
            todayIntervalCount
        );
    }, [todayIntervalCount]);

    useEffect(() => {
        console.log(
            "[STATISTICS][DEBUG] Today's session count updated:",
            todaySessionCount
        );
    }, [todaySessionCount]);

    // Open the statistics dialog
    const openStatisticsDialog = () => {
        setIsDialogOpen(true);
    };

    return (
        <>
            <div className="absolute top-4 left-4 z-10 flex gap-3 items-center">
                {/* Session Counter Button */}
                <div className="flex gap-1 items-center">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 lg:h-14 lg:w-14"
                        onClick={openStatisticsDialog}
                    >
                        <CircleDollarSign className="!h-6 !w-6 lg:!h-8 lg:!w-8" />
                        <span className="sr-only">Session counter</span>
                    </Button>
                    <div className="text-xl lg:text-2xl">
                        {todaySessionCount}
                    </div>
                </div>

                {/* Interval Counter Button */}
                <div className="flex gap-1 items-center">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 lg:h-14 lg:w-14"
                        onClick={openStatisticsDialog}
                    >
                        <Flag className="!h-6 !w-6 lg:!h-8 lg:!w-8" />
                        <span className="sr-only">Interval counter</span>
                    </Button>
                    <div className="text-xl lg:text-2xl">
                        {todayIntervalCount}
                    </div>
                </div>

                {/* Pause Counter Button */}
                <div className="flex gap-1 items-center">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 lg:h-14 lg:w-14"
                        onClick={openStatisticsDialog}
                    >
                        <CirclePause className="!h-6 !w-6 lg:!h-8 lg:!w-8" />
                        <span className="sr-only">Pause counter</span>
                    </Button>
                    <div className="text-xl lg:text-2xl">{todayPauseCount}</div>
                </div>
            </div>

            {/* Statistics Dialog */}
            <StatisticsDialog
                isOpen={isDialogOpen}
                onOpenChange={setIsDialogOpen}
            />
        </>
    );
}
