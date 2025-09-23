"use client";

import {
    createContext,
    useContext,
    useRef,
    useEffect,
    useCallback,
    useState,
    useReducer,
    type ReactNode,
} from "react";
import { useActivityContext } from "@/contexts/activity-context";
import {
    useSoundContext,
    defaultIntervalEndSequence,
    defaultIntervalWaitingSequence,
} from "@/contexts/sound-context";
import { formatTime } from "@/services/time-service";

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
 * Interface for time values (minutes and seconds)
 */
export interface TimeValue {
    minutes: number;
    seconds: number;
}

/**
 * Interface for the timer context
 */
interface TimerContextType {
    // Timer state
    timerState: TimerState | null;
    settings: TimerSettings | null;
    isInitialized: boolean;

    // Formatted time values
    sessionTime: TimeValue;
    intervalTime: TimeValue;
    sessionDurationTime: TimeValue;
    intervalDurationTime: TimeValue;

    // Sound playback state
    isPlayingSound: boolean;
    isPlayingWaitingSequence: boolean;

    // Timer controls
    startTimer: () => void;
    pauseTimer: () => void;
    resetTimer: () => void;
    toggleTimer: () => void;
    toggleFullscreen: () => void;

    // Settings controls
    isSettingsOpen: boolean;
    setIsSettingsOpen: (open: boolean) => void;
    handleSettingsOpen: () => void;
    saveSettings: (
        sessionDuration: TimeValue,
        intervalDuration: TimeValue
    ) => void;
}

// Create context with default values
const TimerContext = createContext<TimerContextType | null>(null);

/**
 * Hook to use the timer context
 */
export function useTimer() {
    const context = useContext(TimerContext);
    if (!context) {
        throw new Error("useTimer must be used within a TimerProvider");
    }
    return context;
}

/**
 * Timer Provider props
 */
interface TimerProviderProps {
    children: ReactNode;
}

/**
 * Timer Provider component
 */
// Reducer state
interface TimerProviderState {
    timerState: TimerState | null;
    settings: TimerSettings | null;
    isSettingsOpen: boolean;
    isPlayingSound: boolean;
    isPlayingWaitingSequence: boolean;
}

// Reducer actions
type Action =
    | { type: "SET_TIMER_STATE"; payload: TimerState }
    | { type: "SET_SETTINGS"; payload: TimerSettings }
    | { type: "SET_IS_SETTINGS_OPEN"; payload: boolean }
    | { type: "SET_IS_PLAYING_SOUND"; payload: boolean }
    | { type: "SET_IS_PLAYING_WAITING_SEQUENCE"; payload: boolean };

// Initial state for the reducer
const initialState: TimerProviderState = {
    timerState: null,
    settings: null,
    isSettingsOpen: false,
    isPlayingSound: false,
    isPlayingWaitingSequence: false,
};

// Reducer function
function timerReducer(
    state: TimerProviderState,
    action: Action
): TimerProviderState {
    switch (action.type) {
        case "SET_TIMER_STATE":
            return { ...state, timerState: action.payload };
        case "SET_SETTINGS":
            return { ...state, settings: action.payload };
        case "SET_IS_SETTINGS_OPEN":
            return { ...state, isSettingsOpen: action.payload };
        case "SET_IS_PLAYING_SOUND":
            return { ...state, isPlayingSound: action.payload };
        case "SET_IS_PLAYING_WAITING_SEQUENCE":
            return { ...state, isPlayingWaitingSequence: action.payload };
        default:
            return state;
    }
}

export function TimerProvider({ children }: TimerProviderProps) {
    // Worker references
    const workerRef = useRef<Worker | null>(null);
    const workerInitializedRef = useRef(false);

    // Use reducer for state management
    const [state, dispatch] = useReducer(timerReducer, initialState);
    const {
        timerState,
        settings,
        isSettingsOpen,
        isPlayingSound,
        isPlayingWaitingSequence,
    } = state;

    // Get activity registration functions from context
    const { registerPause, registerInterval, registerSession } =
        useActivityContext();

    // Add sound context usage
    const { playSequence, playSequenceLoop, stopPlayback } = useSoundContext();

    // Refs for tracking state changes
    const wasRunningRef = useRef(false);
    const prevIntervalTimeLeftRef = useRef<number | null>(null);
    const prevSessionTimeLeftRef = useRef<number | null>(null);
    const sessionRegisteredRef = useRef(false);
    const isManualResetRef = useRef(false);


    /**
     * Initialize Web Worker
     */
    useEffect(() => {
        // Create worker only on client side and only once
        if (typeof window !== "undefined" && !workerInitializedRef.current) {
            console.log("[TIMER_CONTEXT][01] Initializing Web Worker");

            // Cleanup any existing worker
            if (workerRef.current) {
                console.log("[TIMER_CONTEXT][02] Terminating existing worker");
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
                    `[TIMER_CONTEXT][03] Received message from worker: ${type}`,
                    payload
                );

                // Handle timer state updates
                if (type === "UPDATE") {
                    // Update timer state using the reducer
                    dispatch({ type: "SET_TIMER_STATE", payload });
                }
                // Handle settings updates
                else if (type === "SETTINGS_UPDATE") {
                    // Update timer settings using the reducer
                    dispatch({ type: "SET_SETTINGS", payload });
                    console.log(
                        "[TIMER_CONTEXT][04] Settings updated:",
                        payload
                    );
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
     * Effect to track timer state changes and handle events
     */
    useEffect(() => {
        if (!timerState || !settings) return;

        // Add more debug logs
        console.log(
            `[TIMER_CONTEXT][05] Timer state change: wasRunning=${wasRunningRef.current}, isNowRunning=${timerState.isRunning}, sessionTimeLeft=${timerState.sessionTimeLeft}, intervalTimeLeft=${timerState.intervalTimeLeft}`
        );

        // Check if interval has ended (reset to full value or session end)
        const isIntervalReset =
            prevIntervalTimeLeftRef.current !== null &&
            prevIntervalTimeLeftRef.current <= 1 &&
            timerState.intervalTimeLeft === settings.intervalDuration;

        const isSessionEnd =
            prevSessionTimeLeftRef.current !== null &&
            prevSessionTimeLeftRef.current > 0 &&
            timerState.sessionTimeLeft === 0;

        // Check if session has ended
        if (
            isSessionEnd &&
            !sessionRegisteredRef.current &&
            wasRunningRef.current
        ) {
            console.log(
                "[TIMER_CONTEXT][06] Session completed, registering session"
            );
            registerSession();
            sessionRegisteredRef.current = true;
        }

        // If session was reset (new session), reset session registration flag
        if (
            timerState.sessionTimeLeft === settings.sessionDuration &&
            prevSessionTimeLeftRef.current !== settings.sessionDuration
        ) {
            sessionRegisteredRef.current = false;
        }

        // Check if interval has ended - adding condition !isManualResetRef.current
        if (
            (isIntervalReset ||
                (isSessionEnd && timerState.intervalTimeLeft === 0)) &&
            wasRunningRef.current &&
            !isManualResetRef.current
        ) {
            console.log(
                "[TIMER_CONTEXT][07] Interval completed, registering interval. Reset:",
                isIntervalReset,
                "Session end:",
                isSessionEnd
            );
            registerInterval();

            // Auto-pause timer
            if (timerState.isRunning) {
                console.log(
                    "[TIMER_CONTEXT][08] Auto-pausing timer for sound playback"
                );
                pauseTimer();
            }

            // Play the end sequence first
            dispatch({ type: "SET_IS_PLAYING_SOUND", payload: true });
            playSequence(defaultIntervalEndSequence, () => {
                console.log("[TIMER_CONTEXT][09] End sound sequence completed");

                // After the end sequence completes, play the waiting sequence in a loop
                dispatch({ type: "SET_IS_PLAYING_SOUND", payload: false });
                dispatch({
                    type: "SET_IS_PLAYING_WAITING_SEQUENCE",
                    payload: true,
                });

                playSequenceLoop(defaultIntervalWaitingSequence, 10, () => {
                    console.log(
                        "[TIMER_CONTEXT][10] Waiting sound sequence loop completed"
                    );
                    dispatch({
                        type: "SET_IS_PLAYING_WAITING_SEQUENCE",
                        payload: false,
                    });
                }).catch((error) => {
                    console.error(
                        "[TIMER_CONTEXT][11] Error playing waiting sound sequence:",
                        error
                    );
                    dispatch({
                        type: "SET_IS_PLAYING_WAITING_SEQUENCE",
                        payload: false,
                    });
                });
            }).catch((error) => {
                console.error(
                    "[TIMER_CONTEXT][12] Error playing end sound sequence:",
                    error
                );
                dispatch({ type: "SET_IS_PLAYING_SOUND", payload: false });
            });
        }

        // Reset manual reset flag after processing update
        isManualResetRef.current = false;

        // Save current values for comparison at next update
        prevIntervalTimeLeftRef.current = timerState.intervalTimeLeft;
        prevSessionTimeLeftRef.current = timerState.sessionTimeLeft;

        // Update ref tracking timer state
        wasRunningRef.current = timerState.isRunning;
    }, [
        timerState,
        settings,
        registerInterval,
        registerSession,
        playSequence,
        playSequenceLoop,
    ]);

    /**
     * Start the timer
     */
    const startTimer = useCallback(() => {
        if (workerRef.current) {
            console.log("[TIMER_CONTEXT][13] Sending START to worker");
            workerRef.current.postMessage({ type: "START" });
        }
    }, []);

    /**
     * Pause the timer
     */
    const pauseTimer = useCallback(() => {
        if (workerRef.current) {
            console.log("[TIMER_CONTEXT][14] Sending PAUSE to worker");
            workerRef.current.postMessage({ type: "PAUSE" });
        }
    }, []);

    /**
     * Reset timer to initial state
     */
    const resetTimer = useCallback(() => {
        console.log("[TIMER_CONTEXT][15] Resetting timer");

        // Set manual reset flag
        isManualResetRef.current = true;

        // Reset session registration flag
        sessionRegisteredRef.current = false;

        // Stop any playing sound sequence (both first and second sequence)
        if (isPlayingSound || isPlayingWaitingSequence) {
            console.log(
                "[TIMER_CONTEXT][16] Resetting timer, stopping all sound sequences"
            );
            stopPlayback();
            dispatch({ type: "SET_IS_PLAYING_SOUND", payload: false });
            dispatch({
                type: "SET_IS_PLAYING_WAITING_SEQUENCE",
                payload: false,
            });
        }

        if (workerRef.current) {
            workerRef.current.postMessage({ type: "RESET" });
        }
    }, [isPlayingSound, isPlayingWaitingSequence, stopPlayback]);

    /**
     * Toggle timer running state
     */
    const toggleTimer = useCallback(() => {
        if (!timerState) return;

        if (timerState.isRunning) {
            console.log(
                "[TIMER_CONTEXT][17] Pause button clicked, registering pause"
            );
            registerPause();
            pauseTimer();
        } else {
            console.log("[TIMER_CONTEXT][18] Start button clicked");

            // If starting timer and waiting sequence is playing, stop it
            if (isPlayingWaitingSequence) {
                console.log(
                    "[TIMER_CONTEXT][19] Starting timer, stopping waiting sequence"
                );
                stopPlayback();
                dispatch({
                    type: "SET_IS_PLAYING_WAITING_SEQUENCE",
                    payload: false,
                });
            }

            startTimer();
        }
    }, [
        timerState,
        registerPause,
        pauseTimer,
        startTimer,
        isPlayingWaitingSequence,
        stopPlayback,
    ]);

    /**
     * Toggle fullscreen
     */
    const toggleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            console.log("[TIMER_CONTEXT][20] Entering fullscreen mode");
            document.documentElement.requestFullscreen().catch((err) => {
                console.error(
                    `[TIMER_CONTEXT][21] Error attempting to enable fullscreen: ${err.message}`
                );
            });
        } else {
            console.log("[TIMER_CONTEXT][22] Exiting fullscreen mode");
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }, []);

    /**
     * Get current settings from worker before opening settings dialog
     */
    const handleSettingsOpen = useCallback(() => {
        console.log(
            "[TIMER_CONTEXT][23] Requesting current settings before opening dialog"
        );
        if (workerRef.current) {
            workerRef.current.postMessage({ type: "GET_INITIAL_SETTINGS" });
        }
        dispatch({ type: "SET_IS_SETTINGS_OPEN", payload: true });
    }, []);

    /**
     * Save settings
     * @param newSessionDuration New session duration in minutes and seconds
     * @param newIntervalDuration New interval duration in minutes and seconds
     */
    const saveSettings = useCallback(
        (newSessionDuration: TimeValue, newIntervalDuration: TimeValue) => {
            console.log(
                `[TIMER_CONTEXT][24] Saving new settings: session=${newSessionDuration.minutes}:${newSessionDuration.seconds}, interval=${newIntervalDuration.minutes}:${newIntervalDuration.seconds}`
            );

            // Convert minutes and seconds to seconds
            const sessionDurationInSeconds =
                newSessionDuration.minutes * 60 + newSessionDuration.seconds;
            const intervalDurationInSeconds =
                newIntervalDuration.minutes * 60 + newIntervalDuration.seconds;

            // Set manual reset flag
            isManualResetRef.current = true;

            // Reset session registration flag
            sessionRegisteredRef.current = false;

            // Send to worker
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

    // Format time values
    const sessionTime = timerState
        ? formatTime(timerState.sessionTimeLeft)
        : { minutes: 0, seconds: 0 };
    const intervalTime = timerState
        ? formatTime(timerState.intervalTimeLeft)
        : { minutes: 0, seconds: 0 };
    const sessionDurationTime = settings
        ? formatTime(settings.sessionDuration)
        : { minutes: 0, seconds: 0 };
    const intervalDurationTime = settings
        ? formatTime(settings.intervalDuration)
        : { minutes: 0, seconds: 0 };

    const setIsSettingsOpen = (isOpen: boolean) => {
        dispatch({ type: "SET_IS_SETTINGS_OPEN", payload: isOpen });
    };

    // Create context value
    const value: TimerContextType = {
        timerState,
        settings,
        isInitialized:
            workerInitializedRef.current &&
            timerState !== null &&
            settings !== null,

        sessionTime,
        intervalTime,
        sessionDurationTime,
        intervalDurationTime,

        isPlayingSound,
        isPlayingWaitingSequence,

        startTimer,
        pauseTimer,
        resetTimer,
        toggleTimer,
        toggleFullscreen,

        isSettingsOpen,
        setIsSettingsOpen,
        handleSettingsOpen,
        saveSettings,
    };

    return (
        <TimerContext.Provider value={value}>{children}</TimerContext.Provider>
    );
}
