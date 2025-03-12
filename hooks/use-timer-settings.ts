"use client";

import { useState, useCallback } from "react";
import { useTimerWorker } from "./use-timer-worker";

/**
 * Interface for time values (minutes and seconds)
 */
export interface TimeValue {
    minutes: number;
    seconds: number;
}

/**
 * Hook for managing timer settings
 *
 * This hook provides functionality for managing timer settings,
 * including opening/closing the settings dialog and saving settings.
 */
export function useTimerSettings() {
    const { settings, saveSettings, refreshSettings } = useTimerWorker();

    // State to track if settings dialog is open
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    /**
     * Get current settings from worker before opening settings dialog
     */
    const handleSettingsOpen = useCallback(() => {
        console.log(
            "[TIMER_SETTINGS][01] Requesting current settings before opening dialog"
        );
        refreshSettings();
        setIsSettingsOpen(true);
    }, [refreshSettings]);

    /**
     * Save settings
     * @param newSessionDuration New session duration in minutes and seconds
     * @param newIntervalDuration New interval duration in minutes and seconds
     */
    const handleSaveSettings = useCallback(
        (newSessionDuration: TimeValue, newIntervalDuration: TimeValue) => {
            console.log(
                `[TIMER_SETTINGS][02] Saving new settings: session=${newSessionDuration.minutes}:${newSessionDuration.seconds}, interval=${newIntervalDuration.minutes}:${newIntervalDuration.seconds}`
            );

            // Convert minutes and seconds to seconds
            const sessionDurationInSeconds =
                newSessionDuration.minutes * 60 + newSessionDuration.seconds;
            const intervalDurationInSeconds =
                newIntervalDuration.minutes * 60 + newIntervalDuration.seconds;

            // Send to worker
            saveSettings(sessionDurationInSeconds, intervalDurationInSeconds);
        },
        [saveSettings]
    );

    return {
        settings,
        isSettingsOpen,
        setIsSettingsOpen,
        handleSettingsOpen,
        handleSaveSettings,
    };
}
