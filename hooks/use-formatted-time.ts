"use client";

import { useMemo } from "react";
import { formatTime } from "@/services/time-service";
import { useTimerControls } from "./use-timer-controls";

/**
 * Interface for time values (minutes and seconds)
 */
export interface TimeValue {
    minutes: number;
    seconds: number;
}

/**
 * Hook for getting formatted time values from timer state
 *
 * This hook provides formatted time values for session and interval
 * based on the current timer state.
 */
export function useFormattedTime() {
    const { timerState, settings } = useTimerControls();

    // Format time from current values
    const sessionTime = useMemo(() => {
        if (!timerState) return { minutes: 0, seconds: 0 };
        return formatTime(timerState.sessionTimeLeft);
    }, [timerState]);

    const intervalTime = useMemo(() => {
        if (!timerState) return { minutes: 0, seconds: 0 };
        return formatTime(timerState.intervalTimeLeft);
    }, [timerState]);

    // Format settings time
    const sessionDurationTime = useMemo(() => {
        if (!settings) return { minutes: 0, seconds: 0 };
        return formatTime(settings.sessionDuration);
    }, [settings]);

    const intervalDurationTime = useMemo(() => {
        if (!settings) return { minutes: 0, seconds: 0 };
        return formatTime(settings.intervalDuration);
    }, [settings]);

    return {
        sessionTime,
        intervalTime,
        sessionDurationTime,
        intervalDurationTime,
    };
}
