"use client";

import { useState, useEffect, useCallback, useRef, useReducer } from "react";
import { TimerDisplay } from "@/components/timer-display";
import { BellLogo } from "@/components/bell-logo";
import { TimerControls } from "@/components/timer-controls";
import { TimerSettingsDialog } from "@/components/timer-settings-dialog";
import { formatTime } from "@/lib/utils";
import {
    CircleDollarSign,
    CirclePause,
    TimerReset,
    Maximize,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Interfejs dla stanu timera zarządzanego przez workera
interface TimerState {
    sessionTimeLeft: number;
    intervalTimeLeft: number;
    isRunning: boolean;
}

// Interfejs dla ustawień timera
interface TimerSettings {
    sessionDuration: number;
    intervalDuration: number;
}

export function HabitTimer() {
    // Referencja do przechowywania stanu timera z workera - bez wartości domyślnych
    const timerStateRef = useRef<TimerState | null>(null);

    // Referencja do przechowywania ustawień timera z workera - bez wartości domyślnych
    const settingsRef = useRef<TimerSettings | null>(null);

    // Usunięcie timerVersion
    // const [timerVersion, setTimerVersion] = useState(0);

    // Usunięto stan do śledzenia inicjalizacji workera, będziemy używać referencji
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Stan do śledzenia, czy dialog ustawień jest otwarty
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Dodanie funkcji forceUpdate
    const forceUpdate = useReducer((x) => x + 1, 0)[1];

    // Web Worker reference
    const workerRef = useRef<Worker | null>(null);

    // Flag to track if worker is initialized
    const workerInitializedRef = useRef(false);

    // Initialize Web Worker
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
            workerRef.current = new Worker("/workers/timer-worker.js");
            workerInitializedRef.current = true;

            // Set up message handler
            workerRef.current.onmessage = (e) => {
                const { type, payload } = e.data;

                if (type === "LOG") {
                    console.log(payload);
                    return;
                }

                console.log(
                    `[MAIN][03] Received message from worker: ${type}`,
                    payload
                );

                if (type === "UPDATE") {
                    // Aktualizuj referencję stanu timera
                    timerStateRef.current = payload;

                    // Wymuś przerenderowanie komponentu
                    forceUpdate();
                } else if (type === "SETTINGS_UPDATE") {
                    // Aktualizuj referencję ustawień timera
                    settingsRef.current = payload;

                    // Wymuś przerenderowanie komponentu
                    forceUpdate();
                }
            };

            // Po inicjalizacji workera, pobierz początkowe ustawienia
            if (workerRef.current) {
                workerRef.current.postMessage({ type: "GET_INITIAL_SETTINGS" });
            }
        }
    }, []);

    // Reset timer to initial state
    const resetTimer = useCallback(() => {
        if (workerRef.current) {
            console.log("[MAIN][04] Sending RESET to worker");
            workerRef.current.postMessage({ type: "RESET" });
        }
    }, []);

    // Save settings
    const saveSettings = useCallback(
        (newSessionDuration: number, newIntervalDuration: number) => {
            console.log(
                `[MAIN][05] Saving new settings: session=${newSessionDuration}, interval=${newIntervalDuration}`
            );

            // Send to worker (convert minutes to seconds)
            if (workerRef.current) {
                workerRef.current.postMessage({
                    type: "UPDATE_SETTINGS",
                    payload: {
                        sessionDuration: newSessionDuration * 60,
                        intervalDuration: newIntervalDuration * 60,
                    },
                });
            }
        },
        []
    );

    // Pobierz aktualne ustawienia z workera przed otwarciem dialogu ustawień
    const handleSettingsOpen = useCallback(() => {
        if (workerRef.current) {
            console.log(
                "[MAIN][06] Requesting current settings before opening dialog"
            );
            workerRef.current.postMessage({ type: "GET_INITIAL_SETTINGS" });
        }
        setIsSettingsOpen(true);
    }, []);

    // Toggle timer running state
    const toggleTimer = useCallback(() => {
        if (!workerRef.current || !timerStateRef.current) return;

        const command = timerStateRef.current.isRunning ? "PAUSE" : "START";
        console.log(`[MAIN][07] Sending ${command} to worker`);
        workerRef.current.postMessage({ type: command });
    }, []);

    // Toggle fullscreen
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

    // Update fullscreen state
    useEffect(() => {
        const handleFullscreenChange = () => {
            const newIsFullscreen = !!document.fullscreenElement;
            console.log(
                `[MAIN][11] Fullscreen state changed: ${newIsFullscreen}`
            );
            setIsFullscreen(newIsFullscreen);
        };

        document.addEventListener("fullscreenchange", handleFullscreenChange);
        return () => {
            document.removeEventListener(
                "fullscreenchange",
                handleFullscreenChange
            );
        };
    }, []);

    // Dodanie prostego logowania przy każdym renderowaniu
    console.log("[MAIN][12] HabitTimer rendering");

    // Pokaż ekran ładowania, dopóki dane nie zostaną pobrane z workera
    if (!timerStateRef.current || !settingsRef.current) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-2xl">Initializing timer...</div>
            </div>
        );
    }

    // Formatuj czas z aktualnych wartości w referencji
    const sessionTime = formatTime(timerStateRef.current.sessionTimeLeft);
    const intervalTime = formatTime(timerStateRef.current.intervalTimeLeft);

    // Konwertuj sekundy na minuty dla ustawień
    const sessionDurationMinutes = Math.floor(
        settingsRef.current.sessionDuration / 60
    );
    const intervalDurationMinutes = Math.floor(
        settingsRef.current.intervalDuration / 60
    );

    return (
        <div className="relative flex flex-col items-center justify-between min-h-screen overflow-hidden">
            <div className="absolute top-4 left-4 z-10 flex gap-3 items-center">
                {/* Reset Button (Top Right) */}
                <div className="flex gap-1 items-center">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 lg:h-14 lg:w-14"
                        onClick={resetTimer}
                    >
                        <CircleDollarSign className="!h-6 !w-6 lg:!h-8 lg:!w-8" />
                        <span className="sr-only">Reset timer</span>
                    </Button>
                    <div className="text-xl lg:text-2xl">2</div>
                </div>

                {/* Reset Button (Top Right) */}
                <div className="flex gap-1 items-center">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 lg:h-14 lg:w-14"
                        onClick={resetTimer}
                    >
                        <CirclePause className="!h-6 !w-6 lg:!h-8 lg:!w-8" />
                        <span className="sr-only">Reset timer</span>
                    </Button>
                    <div className="text-xl lg:text-2xl">2</div>
                </div>
            </div>

            {/* Logo */}
            <BellLogo />

            <div className="absolute top-4 right-4 z-10 flex gap-2 items-center">
                {/* Reset Button (Top Right) */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 lg:h-14 lg:w-14"
                    onClick={resetTimer}
                >
                    <TimerReset className="!h-6 !w-6 lg:!h-8 lg:!w-8" />
                    <span className="sr-only">Reset timer</span>
                </Button>

                {/* Menu/Settings Button (Top Left) */}
                <TimerSettingsDialog
                    sessionDuration={sessionDurationMinutes}
                    intervalDuration={intervalDurationMinutes}
                    onSave={saveSettings}
                    isOpen={isSettingsOpen}
                    onOpenChange={setIsSettingsOpen}
                    onOpen={handleSettingsOpen}
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
                <span className="sr-only">Toggle fullscreen</span>
            </Button>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center w-full mt-16 mb-8">
                <div className="flex flex-col items-center justify-center">
                    <TimerDisplay
                        minutes={intervalTime.minutes}
                        seconds={intervalTime.seconds}
                        size="large"
                    />
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
                        onToggle={toggleTimer}
                    />
                </div>
            </div>
        </div>
    );
}
