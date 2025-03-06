"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { TimerDisplay } from "@/components/timer-display";
import { BellLogo } from "@/components/bell-logo";
import { TimerControls } from "@/components/timer-controls";
import { TimerSettingsDialog } from "@/components/timer-settings-dialog";
import { formatTime } from "@/lib/utils";
import { RotateCcw, Maximize } from "lucide-react";
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

    // Stan do wymuszania przerenderowania komponentu
    const [timerVersion, setTimerVersion] = useState(0);

    // Usunięto stan do śledzenia inicjalizacji workera, będziemy używać referencji
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Stan do śledzenia, czy dialog ustawień jest otwarty
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Web Worker reference
    const workerRef = useRef<Worker | null>(null);

    // Flag to track if worker is initialized
    const workerInitializedRef = useRef(false);

    // Initialize Web Worker
    useEffect(() => {
        // Create worker only on client side and only once
        if (typeof window !== "undefined" && !workerInitializedRef.current) {
            console.log("[MAIN] Initializing Web Worker");

            // Cleanup any existing worker
            if (workerRef.current) {
                console.log("[MAIN] Terminating existing worker");
                workerRef.current.terminate();
            }

            // Create new worker
            workerRef.current = new Worker("/timer-worker.js");
            workerInitializedRef.current = true;

            // Set up message handler
            workerRef.current.onmessage = (e) => {
                const { type, payload } = e.data;

                if (type === "LOG") {
                    console.log(payload);
                    return;
                }

                console.log(
                    `[MAIN] Received message from worker: ${type}:`,
                    payload
                );

                if (type === "UPDATE") {
                    // Aktualizuj referencję stanu timera
                    timerStateRef.current = payload;

                    // Wymuś przerenderowanie komponentu
                    setTimerVersion((prev) => prev + 1);
                } else if (type === "SETTINGS_UPDATE") {
                    // Aktualizuj referencję ustawień timera
                    settingsRef.current = payload;

                    // Wymuś przerenderowanie komponentu
                    setTimerVersion((prev) => prev + 1);
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
        //console.log("[MAIN] resetTimer called, stack:", new Error().stack);

        if (workerRef.current) {
            console.log("[MAIN] Sending RESET to worker");
            workerRef.current.postMessage({ type: "RESET" });
        }
    }, []);

    // Save settings
    const saveSettings = useCallback(
        (newSessionDuration: number, newIntervalDuration: number) => {
            console.log(
                `[MAIN] Saving new settings: session=${newSessionDuration}, interval=${newIntervalDuration}`
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
                "[MAIN] Requesting current settings before opening dialog"
            );
            workerRef.current.postMessage({ type: "GET_INITIAL_SETTINGS" });
        }
        setIsSettingsOpen(true);
    }, []);

    // Toggle timer running state
    const toggleTimer = useCallback(() => {
        if (!workerRef.current || !timerStateRef.current) return;

        const command = timerStateRef.current.isRunning ? "PAUSE" : "START";
        console.log(`[MAIN] Sending ${command} to worker`);
        workerRef.current.postMessage({ type: command });
    }, []);

    // Toggle fullscreen
    const toggleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            console.log("[MAIN] Entering fullscreen mode");
            document.documentElement.requestFullscreen().catch((err) => {
                console.error(
                    `[MAIN] Error attempting to enable fullscreen: ${err.message}`
                );
            });
        } else {
            console.log("[MAIN] Exiting fullscreen mode");
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }, []);

    // Update fullscreen state
    useEffect(() => {
        const handleFullscreenChange = () => {
            const newIsFullscreen = !!document.fullscreenElement;
            console.log(`[MAIN] Fullscreen state changed: ${newIsFullscreen}`);
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

    // Debug logging for state changes
    useEffect(() => {
        console.log("[MAIN] Timer state updated in UI");
    }, [timerVersion]); // Reaguj na zmiany timerVersion

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
        <div className="relative flex flex-col items-center justify-between min-h-screen p-4 overflow-hidden">
            {/* Menu/Settings Button (Top Left) */}
            <TimerSettingsDialog
                sessionDuration={sessionDurationMinutes}
                intervalDuration={intervalDurationMinutes}
                onSave={saveSettings}
                isOpen={isSettingsOpen}
                onOpenChange={setIsSettingsOpen}
                onOpen={handleSettingsOpen}
            />

            {/* Reset Button (Top Right) */}
            <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 z-10"
                onClick={resetTimer}
            >
                <RotateCcw className="h-6 w-6" />
                <span className="sr-only">Reset timer</span>
            </Button>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center w-full">
                <BellLogo />

                <div className="flex-1 flex items-center justify-center">
                    <TimerDisplay
                        minutes={intervalTime.minutes}
                        seconds={intervalTime.seconds}
                        size="large"
                    />
                </div>

                <div className="mb-32">
                    <TimerDisplay
                        minutes={sessionTime.minutes}
                        seconds={sessionTime.seconds}
                        size="small"
                        color="text-primary"
                    />
                </div>
            </div>

            {/* Fullscreen Button (Bottom Right) */}
            <Button
                variant="ghost"
                size="icon"
                className="absolute bottom-4 right-4 z-10"
                onClick={toggleFullscreen}
            >
                <Maximize className="h-6 w-6" />
                <span className="sr-only">Toggle fullscreen</span>
            </Button>

            {/* Timer Controls (Center Bottom) */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
                <TimerControls
                    isRunning={timerStateRef.current?.isRunning || false}
                    onToggle={toggleTimer}
                />
            </div>
        </div>
    );
}
