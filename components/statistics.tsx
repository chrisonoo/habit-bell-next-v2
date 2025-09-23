"use client";

import { Button } from "@/components/ui/button";
import { CircleDollarSign, CirclePause, Flag } from "lucide-react";
import { useActivityContext } from "@/contexts/activity-context";
import { useEffect, useState } from "react";
import { StatisticsDialog } from "@/components/statistics-dialog";
import { useTranslations } from "next-intl";

/**
 * A component that displays a summary of today's activity statistics
 * (sessions, intervals, pauses) in the top-left corner of the screen.
 * Clicking on any statistic opens the detailed `StatisticsDialog`.
 */
export function Statistics() {
    // Hook for internationalization.
    const t = useTranslations("statistics");

    // Get today's activity counts from the context.
    const { todayPauseCount, todayIntervalCount, todaySessionCount } =
        useActivityContext();

    // State to control the visibility of the statistics dialog.
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    /**
     * @private Opens the statistics dialog.
     */
    const openStatisticsDialog = () => {
        setIsDialogOpen(true);
    };

    return (
        <>
            {/* Container for the statistics counters, positioned absolutely. */}
            <div className="absolute top-4 left-4 z-10 flex gap-3 items-center">
                {/* Session Counter */}
                <div className="flex gap-1 items-center">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 lg:h-14 lg:w-14"
                        onClick={openStatisticsDialog}
                    >
                        <CircleDollarSign className="!h-6 !w-6 lg:!h-8 lg:!w-8" />
                        <span className="sr-only">{t("sessionCounter")}</span>
                    </Button>
                    <div className="text-xl lg:text-2xl">
                        {todaySessionCount}
                    </div>
                </div>

                {/* Interval Counter */}
                <div className="flex gap-1 items-center">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 lg:h-14 lg:w-14"
                        onClick={openStatisticsDialog}
                    >
                        <Flag className="!h-6 !w-6 lg:!h-8 lg:!w-8" />
                        <span className="sr-only">{t("intervalCounter")}</span>
                    </Button>
                    <div className="text-xl lg:text-2xl">
                        {todayIntervalCount}
                    </div>
                </div>

                {/* Pause Counter */}
                <div className="flex gap-1 items-center">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 lg:h-14 lg:w-14"
                        onClick={openStatisticsDialog}
                    >
                        <CirclePause className="!h-6 !w-6 lg:!h-8 lg:!w-8" />
                        <span className="sr-only">{t("pauseCounter")}</span>
                    </Button>
                    <div className="text-xl lg:text-2xl">{todayPauseCount}</div>
                </div>
            </div>

            {/* The detailed statistics dialog, which is controlled by this component. */}
            <StatisticsDialog
                isOpen={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                // A key is passed to force the dialog to re-mount and re-fetch its data
                // whenever the activity counts change, ensuring the stats are up-to-date.
                key={`${todaySessionCount}-${todayIntervalCount}-${todayPauseCount}`}
            />
        </>
    );
}
