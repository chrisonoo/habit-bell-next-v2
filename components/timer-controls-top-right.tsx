"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { TimerReset } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppDropdownMenu } from "@/components/app-dropdown-menu";
import { TimerSettingsDialog } from "@/components/timer-settings-dialog";
import { StatisticsDialog } from "@/components/statistics-dialog";
import { useTimer } from "@/contexts/timer-context";
import { useActivityContext } from "@/contexts/activity-context";

export function TimerControlsTopRight() {
    const t = useTranslations("timer");
    const {
        resetTimer,
        handleSettingsOpen,
        isSettingsOpen,
        setIsSettingsOpen,
        sessionDurationTime,
        intervalDurationTime,
        saveSettings,
    } = useTimer();
    const { todaySessionCount, todayIntervalCount, todayPauseCount } =
        useActivityContext();
    const [isStatisticsOpen, setIsStatisticsOpen] = useState(false);

    return (
        <>
            <div className="absolute top-4 right-3 z-10 flex items-center">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 lg:h-14 lg:w-14"
                    onClick={resetTimer}
                >
                    <TimerReset className="!h-6 !w-6 lg:!h-8 lg:!w-8" />
                    <span className="sr-only">{t("reset")}</span>
                </Button>

                <AppDropdownMenu
                    onOpenStatistics={() => setIsStatisticsOpen(true)}
                    onOpenSettings={handleSettingsOpen}
                />

                <TimerSettingsDialog
                    sessionDuration={sessionDurationTime}
                    intervalDuration={intervalDurationTime}
                    onSave={saveSettings}
                    isOpen={isSettingsOpen}
                    onOpenChange={setIsSettingsOpen}
                />

                <StatisticsDialog
                    isOpen={isStatisticsOpen}
                    onOpenChange={setIsStatisticsOpen}
                    key={`${todaySessionCount}-${todayIntervalCount}-${todayPauseCount}`} // Force refresh when counts change
                />
            </div>
        </>
    );
}
