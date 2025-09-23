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
 * The main component of the application, responsible for orchestrating the entire timer interface.
 * It brings together the timer displays, controls, and other UI elements like statistics and settings.
 * The core logic is handled by the `useTimer` hook, which provides the state and control functions.
 *
 * @returns {JSX.Element} The rendered HabitTimer component.
 */
export function HabitTimer() {
    // Hook for getting translated strings.
    const t = useTranslations("timer");

    // Destructure all necessary state and functions from the TimerContext.
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

    // While the timer and settings are being loaded from the worker, show an initializing message.
    if (!isInitialized) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-2xl">{t("initializing")}</div>
            </div>
        );
    }

    // Determine if the timer is in its pristine, initial state (e.g., after a reset or on first load).
    const isInitialState =
        timerState &&
        settings &&
        timerState.sessionTimeLeft === settings.sessionDuration &&
        timerState.intervalTimeLeft === settings.intervalDuration;

    // Determine if the main timer display should have a pulsing animation.
    // This happens when the timer is paused but not in its initial state.
    const shouldPulse = timerState
        ? !timerState.isRunning && !isInitialState
        : false;

    return (
        // Main container for the timer view.
        <div className="relative flex flex-col items-center justify-between min-h-screen overflow-hidden">
            {/* Top-left component displaying today's statistics. */}
            <Statistics />

            {/* Centered top logo. */}
            <BellLogo />

            {/* Top-right controls including reset and the main dropdown menu. */}
            <TimerControlsTopRight />

            {/* Bottom-right button to toggle fullscreen mode. */}
            <Button
                variant="ghost"
                size="icon"
                className="absolute bottom-4 right-4 z-10 h-10 w-10 lg:h-14 lg:w-14"
                onClick={toggleFullscreen}
            >
                <Maximize className="!h-6 !w-6 lg:!h-8 lg:!w-8" />
                <span className="sr-only">{t("fullscreen")}</span>
            </Button>

            {/* Central content area holding the timer displays and main controls. */}
            <div className="flex-1 flex flex-col items-center justify-center w-full mt-16 mb-8">
                <div className="flex flex-col items-center justify-center">
                    {/* The primary, large timer display showing the current interval time. */}
                    <TimerDisplay
                        minutes={intervalTime.minutes}
                        seconds={intervalTime.seconds}
                        size="large"
                        isPulsing={shouldPulse}
                    />

                    {/* The secondary, smaller timer display showing the total session time remaining. */}
                    <TimerDisplay
                        minutes={sessionTime.minutes}
                        seconds={sessionTime.seconds}
                        size="small"
                        color="text-primary"
                        className="lg:mt-4"
                    />
                </div>

                {/* The main play/pause/reset controls at the bottom center. */}
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
