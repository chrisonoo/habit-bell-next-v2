"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useActivityContext } from "@/contexts/activity-context";
import {
    useSoundContext,
    defaultIntervalEndSequence,
    defaultIntervalWaitingSequence,
} from "@/contexts/sound-context";
import { useTimerWorker } from "./use-timer-worker";

/**
 * Interface for time values (minutes and seconds)
 */
export interface TimeValue {
    minutes: number;
    seconds: number;
}

/**
 * Hook for timer controls and state tracking
 *
 * This hook manages the timer state, controls, and associated behaviors
 * like sound playback and activity tracking.
 */
export function useTimerControls() {
    const {
        timerState,
        settings,
        startTimer,
        pauseTimer,
        resetTimer: workerResetTimer,
        isInitialized,
    } = useTimerWorker();

    // Get activity registration functions from context
    const { registerPause, registerInterval, registerSession } =
        useActivityContext();

    // Add sound context usage
    const { playSequence, playSequenceLoop, stopPlayback } = useSoundContext();

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

    // State to track sound playback
    const [isPlayingSound, setIsPlayingSound] = useState(false);
    const [isPlayingWaitingSequence, setIsPlayingWaitingSequence] =
        useState(false);

    /**
     * Effect to track timer state changes and handle events
     */
    useEffect(() => {
        if (!timerState) return;

        // Add more debug logs
        console.log(
            `[TIMER_CONTROLS][01] Timer state change: wasRunning=${wasRunningRef.current}, isNowRunning=${timerState.isRunning}`
        );

        // Check if interval has ended (reset to full value or session end)
        const isIntervalReset =
            prevIntervalTimeLeftRef.current !== null &&
            prevIntervalTimeLeftRef.current <= 1 &&
            timerState.intervalTimeLeft === settings?.intervalDuration;

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
                "[TIMER_CONTROLS][02] Session completed, registering session"
            );
            registerSession();
            sessionRegisteredRef.current = true;
        }

        // If session was reset (new session), reset session registration flag
        if (
            timerState.sessionTimeLeft === settings?.sessionDuration &&
            prevSessionTimeLeftRef.current !== settings?.sessionDuration
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
                "[TIMER_CONTROLS][03] Interval completed, registering interval. Reset:",
                isIntervalReset,
                "Session end:",
                isSessionEnd
            );
            registerInterval();

            // Auto-pause timer
            if (timerState.isRunning) {
                console.log(
                    "[TIMER_CONTROLS][04] Auto-pausing timer for sound playback"
                );
                pauseTimer();
            }

            // Play the end sequence first
            setIsPlayingSound(true);
            playSequence(defaultIntervalEndSequence, () => {
                console.log(
                    "[TIMER_CONTROLS][05] End sound sequence completed"
                );

                // After the end sequence completes, play the waiting sequence in a loop
                setIsPlayingSound(false);
                setIsPlayingWaitingSequence(true);

                playSequenceLoop(defaultIntervalWaitingSequence, 10, () => {
                    console.log(
                        "[TIMER_CONTROLS][06] Waiting sound sequence loop completed"
                    );
                    setIsPlayingWaitingSequence(false);
                }).catch((error) => {
                    console.error(
                        "[TIMER_CONTROLS][07] Error playing waiting sound sequence:",
                        error
                    );
                    setIsPlayingWaitingSequence(false);
                });
            }).catch((error) => {
                console.error(
                    "[TIMER_CONTROLS][08] Error playing end sound sequence:",
                    error
                );
                setIsPlayingSound(false);
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
        pauseTimer,
        playSequence,
        playSequenceLoop,
    ]);

    /**
     * Toggle timer running state
     */
    const toggleTimer = useCallback(() => {
        if (!timerState) return;

        if (timerState.isRunning) {
            console.log(
                "[TIMER_CONTROLS][09] Pause button clicked, registering pause"
            );
            registerPause();
            pauseTimer();
        } else {
            console.log("[TIMER_CONTROLS][10] Start button clicked");

            // If starting timer and waiting sequence is playing, stop it
            if (isPlayingWaitingSequence) {
                console.log(
                    "[TIMER_CONTROLS][11] Starting timer, stopping waiting sequence"
                );
                stopPlayback();
                setIsPlayingWaitingSequence(false);
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
     * Reset timer to initial state
     */
    const resetTimer = useCallback(() => {
        console.log("[TIMER_CONTROLS][12] Resetting timer");

        // Set manual reset flag
        isManualResetRef.current = true;

        // Reset session registration flag
        sessionRegisteredRef.current = false;

        // Stop any playing sound sequence (both first and second sequence)
        if (isPlayingSound || isPlayingWaitingSequence) {
            console.log(
                "[TIMER_CONTROLS][13] Resetting timer, stopping all sound sequences"
            );
            stopPlayback();
            setIsPlayingSound(false);
            setIsPlayingWaitingSequence(false);
        }

        workerResetTimer();
    }, [
        isPlayingSound,
        isPlayingWaitingSequence,
        stopPlayback,
        workerResetTimer,
    ]);

    /**
     * Toggle fullscreen
     */
    const toggleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            console.log("[TIMER_CONTROLS][14] Entering fullscreen mode");
            document.documentElement.requestFullscreen().catch((err) => {
                console.error(
                    `[TIMER_CONTROLS][15] Error attempting to enable fullscreen: ${err.message}`
                );
            });
        } else {
            console.log("[TIMER_CONTROLS][16] Exiting fullscreen mode");
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }, []);

    return {
        timerState,
        settings,
        isPlayingSound,
        isPlayingWaitingSequence,
        toggleTimer,
        resetTimer,
        toggleFullscreen,
        isInitialized,
    };
}
