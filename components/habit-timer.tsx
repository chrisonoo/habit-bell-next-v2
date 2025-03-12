"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { TimerDisplay } from "@/components/timer-display";
import { BellLogo } from "@/components/bell-logo";
import { TimerControls } from "@/components/timer-controls";
import { TimerSettingsDialog } from "@/components/timer-settings-dialog";
import { TimerReset, Maximize } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppDropdownMenu } from "@/components/app-dropdown-menu";
import { StatisticsDialog } from "@/components/statistics-dialog";
import { Statistics } from "@/components/statistics";
import { useActivityContext } from "@/contexts/activity-context";
import { useTimer } from "@/contexts/timer-context";

/**
 * HabitTimer Component
 *
 * This is the main component of the application. It:
 * 1. Renders the timer UI
 * 2. Handles user interactions
 * 3. Uses the timer context for all timer-related functionality
 *
 * @returns {JSX.Element} The rendered component
 */
export function HabitTimer() {
    // Get translations
    const t = useTranslations("timer");

    // Get activity context for statistics
    const { todaySessionCount, todayIntervalCount, todayPauseCount } =
        useActivityContext();

    // Use timer context
    const {
        timerState,
        isPlayingSound,
        isPlayingWaitingSequence,
        toggleTimer,
        resetTimer,
        toggleFullscreen,
        isInitialized,
        sessionTime,
        intervalTime,
        sessionDurationTime,
        intervalDurationTime,
        isSettingsOpen,
        setIsSettingsOpen,
        handleSettingsOpen,
        saveSettings,
    } = useTimer();

    // State for statistics dialog
    const [isStatisticsOpen, setIsStatisticsOpen] = useState(false);

    // Show loading screen until data is fetched from worker
    if (!isInitialized) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-2xl">{t("initializing")}</div>
            </div>
        );
    }

    // Determine if the timer is paused (either manually or automatically)
    const isTimerPaused = timerState ? !timerState.isRunning : false;

    return (
        <div className="relative flex flex-col items-center justify-between min-h-screen overflow-hidden">
            {/* Statistics Component */}
            <Statistics />

            {/* Statistics Dialog */}
            <StatisticsDialog
                isOpen={isStatisticsOpen}
                onOpenChange={setIsStatisticsOpen}
                key={`${todaySessionCount}-${todayIntervalCount}-${todayPauseCount}`} // Force refresh when counts change
            />

            {/* Logo */}
            <BellLogo />

            {/* Top Right Controls */}
            <div className="absolute top-4 right-3 z-10 flex items-center">
                {/* Reset Button */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 lg:h-14 lg:w-14"
                    onClick={resetTimer}
                >
                    <TimerReset className="!h-6 !w-6 lg:!h-8 lg:!w-8" />
                    <span className="sr-only">{t("reset")}</span>
                </Button>

                {/* App Dropdown Menu */}
                <AppDropdownMenu
                    onOpenStatistics={() => setIsStatisticsOpen(true)}
                    onOpenSettings={handleSettingsOpen}
                />

                {/* Settings Dialog - hidden, opened from menu */}
                <TimerSettingsDialog
                    sessionDuration={sessionDurationTime}
                    intervalDuration={intervalDurationTime}
                    onSave={saveSettings}
                    isOpen={isSettingsOpen}
                    onOpenChange={setIsSettingsOpen}
                />
            </div>

            {/* Fullscreen Button (Bottom Right) */}
            <Button
                variant="ghost"
                size="icon"
                className="absolute bottom-4 right-4 z-10 h-10 w-10 lg:h-14 lg:w-14"
                onClick={toggleFullscreen}
            >
                <Maximize className="!h-6 !w-6 lg:!h-8 lg:!w-8" />
                <span className="sr-only">{t("fullscreen")}</span>
            </Button>

            {/* Main Content - Timer Displays */}
            <div className="flex-1 flex flex-col items-center justify-center w-full mt-16 mb-8">
                <div className="flex flex-col items-center justify-center">
                    {/* Main Timer Display (Interval) - We add pulsing animation when the timer is stained */}
                    <TimerDisplay
                        minutes={intervalTime.minutes}
                        seconds={intervalTime.seconds}
                        size="large"
                        isPulsing={isTimerPaused} // Przekazujemy informację o pauzie
                    />

                    {/* Secondary Timer Display (Session) - Bez animacji */}
                    <TimerDisplay
                        minutes={sessionTime.minutes}
                        seconds={sessionTime.seconds}
                        size="small"
                        color="text-primary"
                        className="lg:mt-4"
                    />
                </div>

                {/* Timer Controls (Center Bottom) */}
                <div className="mt-6 lg:mt-16">
                    <TimerControls
                        isRunning={timerState?.isRunning || false}
                        isSessionEnded={timerState?.sessionTimeLeft === 0}
                        isPlayingSound={
                            isPlayingSound && !isPlayingWaitingSequence
                        }
                        onToggle={toggleTimer}
                        onReset={resetTimer}
                    />
                </div>
            </div>
        </div>
    );
}
