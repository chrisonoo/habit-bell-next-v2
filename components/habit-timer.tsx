"use client";

import { useTranslations } from "next-intl";
import { TimerDisplay } from "@/components/timer-display";
import { BellLogo } from "@/components/bell-logo";
import { TimerControls } from "@/components/timer-controls";
import { Maximize } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Statistics } from "@/components/statistics";
import { useTimer } from "@/contexts/timer-context";
import { TimerControlsTopRight } from "@/components/timer-controls-top-right";

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

    // Use timer context
    const {
        timerState,
        settings,
        isPlayingSound,
        isPlayingWaitingSequence,
        toggleTimer,
        resetTimer,
        toggleFullscreen,
        isInitialized,
        sessionTime,
        intervalTime,
    } = useTimer();

    // Show loading screen until data is fetched from worker
    if (!isInitialized) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-2xl">{t("initializing")}</div>
            </div>
        );
    }

    // We check if the timer is in the initial state (after the reset)
    const isInitialState =
        timerState &&
        settings &&
        timerState.sessionTimeLeft === settings.sessionDuration &&
        timerState.intervalTimeLeft === settings.intervalDuration;

    // Timer should pulsate only when it is stained, but is not in the initial state
    const shouldPulse = timerState
        ? !timerState.isRunning && !isInitialState
        : false;

    return (
        <div className="relative flex flex-col items-center justify-between min-h-screen overflow-hidden">
            {/* Statistics Component */}
            <Statistics />

            {/* Logo */}
            <BellLogo />

            {/* Top Right Controls */}
            <TimerControlsTopRight />

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
                    {/* Main Timer Display (INTERVAL) - only pulsates when the timer is stained during action */}
                    <TimerDisplay
                        minutes={intervalTime.minutes}
                        seconds={intervalTime.seconds}
                        size="large"
                        isPulsing={shouldPulse}
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
