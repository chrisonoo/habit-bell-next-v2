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
 * Defines the shape of the timer's state, which is managed by the Web Worker.
 */
export interface TimerState {
    /** @property {number} sessionTimeLeft - The remaining time for the current session, in seconds. */
    sessionTimeLeft: number;
    /** @property {number} intervalTimeLeft - The remaining time for the current interval, in seconds. */
    intervalTimeLeft: number;
    /** @property {boolean} isRunning - A flag indicating if the timer is currently running. */
    isRunning: boolean;
}

/**
 * Defines the shape of the timer's settings.
 */
export interface TimerSettings {
    /** @property {number} sessionDuration - The total duration of a session, in seconds. */
    sessionDuration: number;
    /** @property {number} intervalDuration - The total duration of an interval, in seconds. */
    intervalDuration: number;
}

/**
 * Defines a structured time value, separated into minutes and seconds.
 */
export interface TimeValue {
    /** @property {number} minutes - The minutes component of the time. */
    minutes: number;
    /** @property {number} seconds - The seconds component of the time. */
    seconds: number;
}

/**
 * Defines the shape of the Timer Context.
 * It provides access to the timer's state, settings, formatted time values,
 * and functions to control the timer.
 */
interface TimerContextType {
    /** The current state of the timer (time left, running status). Null if not initialized. */
    timerState: TimerState | null;
    /** The current settings of the timer (durations). Null if not initialized. */
    settings: TimerSettings | null;
    /** A flag indicating if the timer and its worker have been initialized. */
    isInitialized: boolean;

    /** The remaining session time, formatted as minutes and seconds. */
    sessionTime: TimeValue;
    /** The remaining interval time, formatted as minutes and seconds. */
    intervalTime: TimeValue;
    /** The total session duration, formatted as minutes and seconds. */
    sessionDurationTime: TimeValue;
    /** The total interval duration, formatted as minutes and seconds. */
    intervalDurationTime: TimeValue;

    /** A flag indicating if the interval-end sound sequence is currently playing. */
    isPlayingSound: boolean;
    /** A flag indicating if the interval-waiting sound sequence is currently playing. */
    isPlayingWaitingSequence: boolean;

    /** A function to start the timer. */
    startTimer: () => void;
    /** A function to pause the timer. */
    pauseTimer: () => void;
    /** A function to reset the timer to its initial state. */
    resetTimer: () => void;
    /** A function to toggle the timer between running and paused states. */
    toggleTimer: () => void;
    /** A function to toggle the browser's fullscreen mode. */
    toggleFullscreen: () => void;

    /** A flag indicating if the settings dialog is open. */
    isSettingsOpen: boolean;
    /** A function to set the visibility of the settings dialog. */
    setIsSettingsOpen: (open: boolean) => void;
    /** A function to handle opening the settings dialog, ensuring settings are fresh. */
    handleSettingsOpen: () => void;
    /** A function to save new timer settings. */
    saveSettings: (
        sessionDuration: TimeValue,
        intervalDuration: TimeValue
    ) => void;
}

/**
 * The React Context object for the timer.
 */
const TimerContext = createContext<TimerContextType | null>(null);

/**
 * A custom hook to easily access the TimerContext.
 * @returns {TimerContextType} The timer context.
 * @throws {Error} If used outside of a `TimerProvider`.
 */
export function useTimer() {
    const context = useContext(TimerContext);
    if (!context) {
        throw new Error("useTimer must be used within a TimerProvider");
    }
    return context;
}

/**
 * Defines the props for the TimerProvider component.
 */
interface TimerProviderProps {
    /** @property {ReactNode} children - The child components that will have access to this context. */
    children: ReactNode;
}

// --- Reducer for state management --- //

/**
 * @private Defines the shape of the state managed by the timerReducer.
 */
interface TimerProviderState {
    timerState: TimerState | null;
    settings: TimerSettings | null;
    isSettingsOpen: boolean;
    isPlayingSound: boolean;
    isPlayingWaitingSequence: boolean;
}

/**
 * @private Defines the actions that can be dispatched to the timerReducer.
 */
type Action =
    | { type: "SET_TIMER_STATE"; payload: TimerState }
    | { type: "SET_SETTINGS"; payload: TimerSettings }
    | { type: "SET_IS_SETTINGS_OPEN"; payload: boolean }
    | { type: "SET_IS_PLAYING_SOUND"; payload: boolean }
    | { type: "SET_IS_PLAYING_WAITING_SEQUENCE"; payload: boolean };

/**
 * @private The initial state for the timerReducer.
 */
const initialState: TimerProviderState = {
    timerState: null,
    settings: null,
    isSettingsOpen: false,
    isPlayingSound: false,
    isPlayingWaitingSequence: false,
};

/**
 * @private The reducer function to manage the state of the TimerProvider.
 * It handles updates to the timer state, settings, and other UI flags.
 */
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

/**
 * The provider component for the TimerContext.
 * This component orchestrates the entire timer functionality. It communicates with a Web Worker
 * for accurate background timing, interacts with the ActivityContext to log user progress,
 * and uses the SoundContext to play audio cues.
 */
export function TimerProvider({ children }: TimerProviderProps) {
    // A ref to hold the Web Worker instance.
    const workerRef = useRef<Worker | null>(null);
    // A ref to track if the worker has been initialized to prevent re-initialization.
    const workerInitializedRef = useRef(false);

    // Use a reducer for centralized state management within the provider.
    const [state, dispatch] = useReducer(timerReducer, initialState);
    const {
        timerState,
        settings,
        isSettingsOpen,
        isPlayingSound,
        isPlayingWaitingSequence,
    } = state;

    // Get contexts for activity and sound to interact with them.
    const { registerPause, registerInterval, registerSession } =
        useActivityContext();
    const { playSequence, playSequenceLoop, stopPlayback } = useSoundContext();

    // --- Refs for tracking state changes and side effects --- //
    // Ref to track the previous running state to detect start/pause transitions.
    const wasRunningRef = useRef(false);
    // Ref to track the previous interval time to detect when an interval completes.
    const prevIntervalTimeLeftRef = useRef<number | null>(null);
    // Ref to track the previous session time to detect when a session completes.
    const prevSessionTimeLeftRef = useRef<number | null>(null);
    // Ref to prevent multiple session registrations for the same session completion.
    const sessionRegisteredRef = useRef(false);
    // Ref to distinguish between an automatic reset (e.g., after settings change) and a user-triggered reset.
    const isManualResetRef = useRef(false);

    /**
     * An effect hook to initialize and terminate the Web Worker.
     * This runs only once on component mount.
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
     * An effect hook that runs whenever the timer's state changes.
     * This is the core logic for triggering events like registering activities
     * and playing sounds when intervals or sessions complete.
     */
    useEffect(() => {
        // Guard against running before initialization
        if (!timerState || !settings) return;

        // --- Event Detection Logic ---

        // Detects if an interval has just finished and reset.
        const isIntervalReset =
            prevIntervalTimeLeftRef.current !== null &&
            prevIntervalTimeLeftRef.current <= 1 &&
            timerState.intervalTimeLeft === settings.intervalDuration;

        // Detects if the entire session has just finished.
        const isSessionEnd =
            prevSessionTimeLeftRef.current !== null &&
            prevSessionTimeLeftRef.current > 0 &&
            timerState.sessionTimeLeft === 0;

        // --- Event Handling Logic ---

        // Handle session completion: register the activity.
        if (
            isSessionEnd &&
            !sessionRegisteredRef.current &&
            wasRunningRef.current
        ) {
            console.log(
                "[TIMER_CONTEXT][06] Session completed, registering session"
            );
            registerSession();
            sessionRegisteredRef.current = true; // Prevents re-registration
        }

        // Reset the session registration flag if the timer is reset to a new session.
        if (
            timerState.sessionTimeLeft === settings.sessionDuration &&
            prevSessionTimeLeftRef.current !== settings.sessionDuration
        ) {
            sessionRegisteredRef.current = false;
        }

        // Handle interval completion: register activity and play sounds.
        if (
            (isIntervalReset ||
                (isSessionEnd && timerState.intervalTimeLeft === 0)) &&
            wasRunningRef.current &&
            !isManualResetRef.current // Ignore if reset was user-initiated
        ) {
            console.log(
                "[TIMER_CONTEXT][07] Interval completed, registering interval."
            );
            registerInterval();

            // Auto-pause the timer to allow sounds to play without the timer ticking.
            if (timerState.isRunning) {
                pauseTimer();
            }

            // Play the two-part sound sequence for interval completion.
            dispatch({ type: "SET_IS_PLAYING_SOUND", payload: true });
            playSequence(defaultIntervalEndSequence, () => {
                // This callback runs after the first sequence (end sound) completes.
                dispatch({ type: "SET_IS_PLAYING_SOUND", payload: false });
                dispatch({
                    type: "SET_IS_PLAYING_WAITING_SEQUENCE",
                    payload: true,
                });

                // Start the second sequence (waiting sound) in a loop.
                playSequenceLoop(defaultIntervalWaitingSequence, 10, () => {
                    // This callback runs after the waiting loop finishes.
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

        // --- State Maintenance ---

        // Reset the manual reset flag after this render cycle.
        isManualResetRef.current = false;

        // Store current values in refs to compare in the next render.
        prevIntervalTimeLeftRef.current = timerState.intervalTimeLeft;
        prevSessionTimeLeftRef.current = timerState.sessionTimeLeft;
        wasRunningRef.current = timerState.isRunning;
    }, [
        timerState,
        settings,
        registerInterval,
        registerSession,
        playSequence,
        playSequenceLoop,
        pauseTimer, // Added pauseTimer to dependency array
    ]);

    /**
     * Sends a 'START' message to the Web Worker.
     */
    const startTimer = useCallback(() => {
        if (workerRef.current) {
            console.log("[TIMER_CONTEXT][13] Sending START to worker");
            workerRef.current.postMessage({ type: "START" });
        }
    }, []);

    /**
     * Sends a 'PAUSE' message to the Web Worker.
     */
    const pauseTimer = useCallback(() => {
        if (workerRef.current) {
            console.log("[TIMER_CONTEXT][14] Sending PAUSE to worker");
            workerRef.current.postMessage({ type: "PAUSE" });
        }
    }, []);

    /**
     * Resets the timer to its initial state.
     * This also stops any currently playing sound sequences.
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
     * Toggles the timer between 'running' and 'paused' states.
     * It also handles registering pause activities and stopping sound cues.
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
     * Toggles the browser's fullscreen mode for the application.
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
     * Handles the action of opening the settings dialog.
     * It requests the latest settings from the worker before opening.
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
     * Saves new timer settings.
     * It converts the TimeValue objects to seconds and sends them to the Web Worker.
     * @param {TimeValue} newSessionDuration - The new session duration.
     * @param {TimeValue} newIntervalDuration - The new interval duration.
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

    // --- Derived State and Context Value ---

    // Memoize the formatted time values to prevent re-computation on every render.
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

    /**
     * A function to update the `isSettingsOpen` state.
     * @param {boolean} isOpen - Whether the settings dialog should be open.
     */
    const setIsSettingsOpen = (isOpen: boolean) => {
        dispatch({ type: "SET_IS_SETTINGS_OPEN", payload: isOpen });
    };

    // The value object provided to the context consumers.
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
