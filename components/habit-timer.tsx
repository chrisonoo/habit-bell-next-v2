"use client";

import { useState, useEffect, useCallback, useRef, useReducer } from "react";
import { useTranslations } from "next-intl";
import { TimerDisplay } from "@/components/timer-display";
import { BellLogo } from "@/components/bell-logo";
import { TimerControls } from "@/components/timer-controls";
import { TimerSettingsDialog } from "@/components/timer-settings-dialog";
import { formatTime } from "@/services/time-service";
import { TimerReset, Maximize } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useActivityContext } from "@/contexts/activity-context";
import { AppDropdownMenu } from "@/components/app-dropdown-menu";
import { StatisticsDialog } from "@/components/statistics-dialog";
import { Statistics } from "@/components/statistics";
import {
    useSoundContext,
    defaultIntervalEndSequence,
} from "@/contexts/sound-context";

/**
 * Interface for timer state managed by worker
 * This represents the current state of the timer that's maintained by the Web Worker
 */
interface TimerState {
    sessionTimeLeft: number; // Remaining time for the current session in seconds
    intervalTimeLeft: number; // Remaining time for the current interval in seconds
    isRunning: boolean; // Whether the timer is currently running
}

/**
 * Interface for timer settings
 * This represents the configuration values for timer settings
 */
interface TimerSettings {
    sessionDuration: number; // Total session duration in seconds
    intervalDuration: number; // Total interval duration in seconds
}

/**
 * Interface for time values (minutes and seconds)
 * This is used for the UI representation of time
 */
interface TimeValue {
    minutes: number; // Minutes component of the time
    seconds: number; // Seconds component of the time
}

/**
 * HabitTimer Component
 *
 * This is the main component of the application. It:
 * 1. Initializes and communicates with the Web Worker
 * 2. Manages the timer state and settings
 * 3. Renders the timer UI
 * 4. Handles user interactions
 *
 * The component uses refs to store state from the worker and forces
 * re-renders when that state changes.
 *
 * @returns {JSX.Element} The rendered component
 */
export function HabitTimer() {
    // Get translations
    const t = useTranslations("timer");
    const tAccess = useTranslations("accessibility");

    // Get activity registration functions from context
    const {
        registerPause,
        registerInterval,
        registerSession,
        todaySessionCount,
        todayIntervalCount,
        todayPauseCount,
    } = useActivityContext();
    console.log(
        "[MAIN][DEBUG] Activity functions available:",
        !!registerPause,
        !!registerInterval,
        !!registerSession
    );

    // Reference to store timer state from worker - without default values
    // Using a ref instead of state prevents unnecessary re-renders and race conditions
    const timerStateRef = useRef<TimerState | null>(null);

    // Reference to store timer settings from worker - without default values
    // These settings are persisted in IndexedDB by the worker
    const settingsRef = useRef<TimerSettings | null>(null);

    // Web Worker reference
    // This holds the reference to the worker that manages the timer logic
    const workerRef = useRef<Worker | null>(null);

    // Flag to track if worker is initialized
    // This prevents creating multiple workers
    const workerInitializedRef = useRef(false);

    // State to track if settings dialog is open
    // This controls the visibility of the settings dialog
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Add state for statistics dialog
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Add forceUpdate function
    // This is used to trigger re-renders when ref values change
    const forceUpdate = useReducer((x) => x + 1, 0)[1];

    // Ref to track previous timer state (whether it was running)
    const wasRunningRef = useRef(false);

    // Ref to track previous intervalTimeLeft value
    const prevIntervalTimeLeftRef = useRef<number | null>(null);

    // Ref to track previous sessionTimeLeft value
    const prevSessionTimeLeftRef = useRef<number | null>(null);

    // Ref to track whether session has already been registered
    const sessionRegisteredRef = useRef(false);

    // Ref to track whether timer is being manually reset
    const isManualResetRef = useRef(false);

    // Dodaj użycie kontekstu dźwiękowego
    const { playSequence, isPlaying: isSoundPlaying } = useSoundContext();

    // Dodaj stan do śledzenia, czy dźwięk jest odtwarzany
    const [isPlayingSound, setIsPlayingSound] = useState(false);

    /**
     * Initialize Web Worker
     * This effect runs once when the component mounts and sets up the worker
     */
    useEffect(() => {
        // Create worker only on client side and only once
        if (typeof window !== "undefined" && !workerInitializedRef.current) {
            console.log("[MAIN][01] Initializing Web Worker");

            // Cleanup any existing worker
            if (workerRef.current) {
                console.log("[MAIN][02] Terminating existing worker");
                workerRef.current.terminate();
            }

            // Create new worker
            // The worker file contains the timer logic and IndexedDB interactions
            workerRef.current = new Worker("/workers/timer-worker.js");
            workerInitializedRef.current = true;

            // Set up message handler
            // This processes messages from the worker
            workerRef.current.onmessage = (e) => {
                const { type, payload } = e.data;

                // Handle log messages from the worker
                if (type === "LOG") {
                    console.log(payload);
                    return;
                }

                console.log(
                    `[MAIN][03] Received message from worker: ${type}`,
                    payload
                );

                // Handle timer state updates
                if (type === "UPDATE") {
                    // Add more debug logs
                    console.log(
                        `[MAIN][DEBUG] Timer state change: wasRunning=${wasRunningRef.current}, isNowRunning=${payload.isRunning}`
                    );

                    // Check if interval has ended (reset to full value or session end)
                    const isIntervalReset =
                        prevIntervalTimeLeftRef.current !== null &&
                        prevIntervalTimeLeftRef.current <= 1 &&
                        payload.intervalTimeLeft ===
                            settingsRef.current?.intervalDuration;

                    const isSessionEnd =
                        prevSessionTimeLeftRef.current !== null &&
                        prevSessionTimeLeftRef.current > 0 &&
                        payload.sessionTimeLeft === 0;

                    // Check if session has ended
                    if (
                        isSessionEnd &&
                        !sessionRegisteredRef.current &&
                        wasRunningRef.current
                    ) {
                        console.log(
                            "[MAIN][DEBUG] Session completed, registering session"
                        );
                        registerSession();
                        sessionRegisteredRef.current = true;
                    }

                    // If session was reset (new session), reset session registration flag
                    if (
                        payload.sessionTimeLeft ===
                            settingsRef.current?.sessionDuration &&
                        prevSessionTimeLeftRef.current !==
                            settingsRef.current?.sessionDuration
                    ) {
                        sessionRegisteredRef.current = false;
                    }

                    // Check if interval has ended - adding condition !isManualResetRef.current
                    if (
                        (isIntervalReset ||
                            (isSessionEnd && payload.intervalTimeLeft === 0)) &&
                        wasRunningRef.current &&
                        !isManualResetRef.current
                    ) {
                        console.log(
                            "[MAIN][DEBUG] Interval completed, registering interval. Reset:",
                            isIntervalReset,
                            "Session end:",
                            isSessionEnd
                        );
                        registerInterval();

                        // Dodaj automatyczną pauzę timera
                        if (workerRef.current && payload.isRunning) {
                            console.log(
                                "[MAIN][DEBUG] Auto-pausing timer for sound playback"
                            );
                            workerRef.current.postMessage({ type: "PAUSE" });
                        }

                        // Odtwórz sekwencję dźwięków
                        setIsPlayingSound(true);
                        playSequence(defaultIntervalEndSequence, () => {
                            console.log(
                                "[MAIN][DEBUG] Sound sequence completed"
                            );
                            setIsPlayingSound(false);
                        }).catch((error) => {
                            console.error(
                                "[MAIN][DEBUG] Error playing sound sequence:",
                                error
                            );
                            setIsPlayingSound(false);
                        });
                    }

                    // Reset manual reset flag after processing update
                    isManualResetRef.current = false;

                    // Save current values for comparison at next update
                    prevIntervalTimeLeftRef.current = payload.intervalTimeLeft;
                    prevSessionTimeLeftRef.current = payload.sessionTimeLeft;

                    // Update ref tracking timer state
                    wasRunningRef.current = payload.isRunning;

                    // Update timer state reference
                    timerStateRef.current = payload;

                    // Force component re-render to reflect the new state
                    forceUpdate();
                }
                // Handle settings updates
                else if (type === "SETTINGS_UPDATE") {
                    // Update timer settings reference
                    settingsRef.current = payload;
                    console.log("[MAIN][DEBUG] Settings updated:", payload);

                    // Force component re-render to reflect the new settings
                    forceUpdate();
                }
            };

            // After worker initialization, get initial settings
            // This loads saved settings from IndexedDB
            if (workerRef.current) {
                workerRef.current.postMessage({ type: "GET_INITIAL_SETTINGS" });
            }
        }
    }, [registerInterval, registerSession, registerPause, playSequence]);

    /**
     * Reset timer to initial state
     * This sends a RESET command to the worker
     */
    const resetTimer = useCallback(() => {
        if (workerRef.current) {
            console.log("[MAIN][04] Sending RESET to worker");
            // Set manual reset flag
            isManualResetRef.current = true;
            // Reset session registration flag
            sessionRegisteredRef.current = false;
            workerRef.current.postMessage({ type: "RESET" });
        }
    }, []);

    /**
     * Save settings
     * This converts the UI time values to seconds and sends them to the worker
     * @param {TimeValue} newSessionDuration - New session duration in minutes and seconds
     * @param {TimeValue} newIntervalDuration - New interval duration in minutes and seconds
     */
    const saveSettings = useCallback(
        (newSessionDuration: TimeValue, newIntervalDuration: TimeValue) => {
            console.log(
                `[MAIN][05] Saving new settings: session=${newSessionDuration.minutes}:${newSessionDuration.seconds}, interval=${newIntervalDuration.minutes}:${newIntervalDuration.seconds}`
            );

            // Convert minutes and seconds to seconds
            // This is necessary because the worker stores time in seconds
            const sessionDurationInSeconds =
                newSessionDuration.minutes * 60 + newSessionDuration.seconds;
            const intervalDurationInSeconds =
                newIntervalDuration.minutes * 60 + newIntervalDuration.seconds;

            // Send to worker
            // The worker will update the settings in IndexedDB
            if (workerRef.current) {
                // Set manual reset flag
                isManualResetRef.current = true;
                // Reset session registration flag
                sessionRegisteredRef.current = false;
                workerRef.current.postMessage({
                    type: "UPDATE_SETTINGS",
                    payload: {
                        sessionDuration: sessionDurationInSeconds,
                        intervalDuration: intervalDurationInSeconds,
                    },
                });
            }
        },
        []
    );

    /**
     * Get current settings from worker before opening settings dialog
     * This ensures the dialog shows the most up-to-date settings
     */
    const handleSettingsOpen = useCallback(() => {
        if (workerRef.current) {
            console.log(
                "[MAIN][06] Requesting current settings before opening dialog"
            );
            workerRef.current.postMessage({ type: "GET_INITIAL_SETTINGS" });
        }
        setIsSettingsOpen(true);
    }, []);

    /**
     * Toggle timer running state
     * This sends START or PAUSE commands to the worker based on current state
     */
    const toggleTimer = useCallback(() => {
        if (!workerRef.current || !timerStateRef.current) return;

        const command = timerStateRef.current.isRunning ? "PAUSE" : "START";
        console.log(`[MAIN][07] Sending ${command} to worker`);

        // If pausing timer, register pause
        if (command === "PAUSE") {
            console.log(
                "[MAIN][DEBUG] Pause button clicked, registering pause"
            );
            registerPause();
        }

        workerRef.current.postMessage({ type: command });
    }, [registerPause]);

    /**
     * Toggle fullscreen
     * This toggles the browser's fullscreen mode for a more immersive experience
     */
    const toggleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            console.log("[MAIN][08] Entering fullscreen mode");
            document.documentElement.requestFullscreen().catch((err) => {
                console.error(
                    `[MAIN][09] Error attempting to enable fullscreen: ${err.message}`
                );
            });
        } else {
            console.log("[MAIN][10] Exiting fullscreen mode");
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }, []);

    // Add simple logging on each render
    // This helps with debugging and understanding the component lifecycle
    console.log("[MAIN][12] HabitTimer rendering");

    // Show loading screen until data is fetched from worker
    // This prevents rendering the UI with null or undefined values
    if (!timerStateRef.current || !settingsRef.current) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-2xl">{t("initializing")}</div>
            </div>
        );
    }

    // Format time from current values in reference
    // This converts the seconds values to minutes and seconds for display
    const sessionTime = formatTime(timerStateRef.current.sessionTimeLeft);
    const intervalTime = formatTime(timerStateRef.current.intervalTimeLeft);

    // Format settings time
    // This converts the settings values to minutes and seconds for the settings dialog
    const sessionDurationTime = formatTime(settingsRef.current.sessionDuration);
    const intervalDurationTime = formatTime(
        settingsRef.current.intervalDuration
    );

    return (
        <div className="relative flex flex-col items-center justify-between min-h-screen overflow-hidden">
            {/* Statistics Component */}
            <Statistics />
            {/* Statistics Dialog */}
            <StatisticsDialog
                isOpen={isDialogOpen}
                onOpenChange={setIsDialogOpen}
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
                    onOpenStatistics={() => setIsDialogOpen(true)}
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
                    {/* Main Timer Display (Interval) */}
                    <TimerDisplay
                        minutes={intervalTime.minutes}
                        seconds={intervalTime.seconds}
                        size="large"
                    />

                    {/* Secondary Timer Display (Session) */}
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
                        isRunning={timerStateRef.current?.isRunning || false}
                        isSessionEnded={
                            timerStateRef.current?.sessionTimeLeft === 0
                        }
                        isPlayingSound={isPlayingSound}
                        onToggle={toggleTimer}
                        onReset={resetTimer}
                    />
                </div>
            </div>
        </div>
    );
}
