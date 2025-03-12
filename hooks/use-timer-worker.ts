"use client";

import { useRef, useEffect, useCallback, useState } from "react";

/**
 * Interface for timer state managed by worker
 */
export interface TimerState {
    sessionTimeLeft: number;
    intervalTimeLeft: number;
    isRunning: boolean;
}

/**
 * Interface for timer settings
 */
export interface TimerSettings {
    sessionDuration: number;
    intervalDuration: number;
}

/**
 * Hook for managing timer worker communication
 *
 * This hook handles all communication with the Web Worker that manages the timer logic.
 * It provides methods to control the timer and access its current state and settings.
 */
export function useTimerWorker() {
    // Use state instead of refs for values that should trigger re-renders
    const [timerState, setTimerState] = useState<TimerState | null>(null);
    const [settings, setSettings] = useState<TimerSettings | null>(null);

    // Web Worker reference
    const workerRef = useRef<Worker | null>(null);

    // Flag to track if worker is initialized
    const workerInitializedRef = useRef(false);

    /**
     * Initialize Web Worker
     */
    useEffect(() => {
        // Create worker only on client side and only once
        if (typeof window !== "undefined" && !workerInitializedRef.current) {
            console.log("[WORKER_HOOK][01] Initializing Web Worker");

            // Cleanup any existing worker
            if (workerRef.current) {
                console.log("[WORKER_HOOK][02] Terminating existing worker");
                workerRef.current.terminate();
            }

            // Create new worker
            workerRef.current = new Worker("/workers/timer-worker.js");
            workerInitializedRef.current = true;

            // Set up message handler
            workerRef.current.onmessage = (e) => {
                const { type, payload } = e.data;

                // Handle log messages from the worker
                if (type === "LOG") {
                    console.log(payload);
                    return;
                }

                console.log(
                    `[WORKER_HOOK][03] Received message from worker: ${type}`,
                    payload
                );

                // Handle timer state updates
                if (type === "UPDATE") {
                    // Update timer state using setState to trigger re-renders
                    setTimerState(payload);
                }
                // Handle settings updates
                else if (type === "SETTINGS_UPDATE") {
                    // Update timer settings using setState to trigger re-renders
                    setSettings(payload);
                    console.log("[WORKER_HOOK][04] Settings updated:", payload);
                }
            };

            // After worker initialization, get initial settings
            if (workerRef.current) {
                workerRef.current.postMessage({ type: "GET_INITIAL_SETTINGS" });
            }
        }

        // Cleanup function
        return () => {
            if (workerRef.current) {
                workerRef.current.terminate();
                workerRef.current = null;
                workerInitializedRef.current = false;
            }
        };
    }, []);

    /**
     * Start the timer
     */
    const startTimer = useCallback(() => {
        if (workerRef.current) {
            console.log("[WORKER_HOOK][05] Sending START to worker");
            workerRef.current.postMessage({ type: "START" });
        }
    }, []);

    /**
     * Pause the timer
     */
    const pauseTimer = useCallback(() => {
        if (workerRef.current) {
            console.log("[WORKER_HOOK][06] Sending PAUSE to worker");
            workerRef.current.postMessage({ type: "PAUSE" });
        }
    }, []);

    /**
     * Reset timer to initial state
     */
    const resetTimer = useCallback(() => {
        if (workerRef.current) {
            console.log("[WORKER_HOOK][07] Sending RESET to worker");
            workerRef.current.postMessage({ type: "RESET" });
        }
    }, []);

    /**
     * Save timer settings
     * @param sessionDurationInSeconds Session duration in seconds
     * @param intervalDurationInSeconds Interval duration in seconds
     */
    const saveSettings = useCallback(
        (
            sessionDurationInSeconds: number,
            intervalDurationInSeconds: number
        ) => {
            console.log(
                `[WORKER_HOOK][08] Saving new settings: session=${sessionDurationInSeconds}, interval=${intervalDurationInSeconds}`
            );

            if (workerRef.current) {
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
     * Get current settings from worker
     */
    const refreshSettings = useCallback(() => {
        if (workerRef.current) {
            console.log("[WORKER_HOOK][09] Requesting current settings");
            workerRef.current.postMessage({ type: "GET_INITIAL_SETTINGS" });
        }
    }, []);

    return {
        timerState,
        settings,
        startTimer,
        pauseTimer,
        resetTimer,
        saveSettings,
        refreshSettings,
        isInitialized:
            workerInitializedRef.current &&
            timerState !== null &&
            settings !== null,
    };
}
