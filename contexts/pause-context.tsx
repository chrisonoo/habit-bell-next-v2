"use client";

import {
    createContext,
    useContext,
    useState,
    useEffect,
    type ReactNode,
} from "react";

// Interfejs dla pojedynczej pauzy
export interface PauseRecord {
    id?: number;
    timestamp: number; // Unix timestamp
    date: string; // Format YYYY-MM-DD dla łatwiejszego grupowania
}

// Interfejs dla kontekstu pauz
interface PauseContextType {
    pauseCount: number;
    todayPauseCount: number;
    registerPause: () => void;
}

// Domyślne wartości dla kontekstu
const defaultContext: PauseContextType = {
    pauseCount: 0,
    todayPauseCount: 0,
    registerPause: () => {},
};

// Utworzenie kontekstu
const PauseContext = createContext<PauseContextType>(defaultContext);

// Hook do używania kontekstu pauz
export const usePauseContext = () => useContext(PauseContext);

// Props dla providera kontekstu
interface PauseProviderProps {
    children: ReactNode;
}

// Provider kontekstu pauz
export function PauseProvider({ children }: PauseProviderProps) {
    // Stan dla liczby wszystkich pauz i pauz z dzisiejszego dnia
    const [pauseCount, setPauseCount] = useState(0);
    const [todayPauseCount, setTodayPauseCount] = useState(0);

    // Funkcja pomocnicza do formatowania daty w formacie YYYY-MM-DD
    const formatDate = (date: Date): string => {
        return date.toISOString().split("T")[0];
    };

    // Funkcja do rejestrowania nowej pauzy
    const registerPause = async () => {
        try {
            const now = new Date();
            const pauseRecord: PauseRecord = {
                timestamp: now.getTime(),
                date: formatDate(now),
            };

            // Zapisz pauzę w IndexedDB za pomocą Web Worker
            if (typeof window !== "undefined") {
                const worker = new Worker("/workers/pause-worker.js");

                worker.onmessage = (e) => {
                    const { type, payload } = e.data;

                    if (type === "PAUSE_SAVED") {
                        console.log("[PAUSE] Pause saved successfully");
                        // Aktualizuj liczniki pauz
                        setPauseCount((prev) => prev + 1);
                        setTodayPauseCount((prev) => prev + 1);
                    } else if (type === "ERROR") {
                        console.error("[PAUSE] Error saving pause:", payload);
                    }

                    // Zakończ działanie workera po wykonaniu operacji
                    worker.terminate();
                };

                worker.postMessage({
                    type: "SAVE_PAUSE",
                    payload: pauseRecord,
                });
            }
        } catch (error) {
            console.error("[PAUSE] Error registering pause:", error);
        }
    };

    // Efekt do ładowania liczby pauz przy inicjalizacji
    useEffect(() => {
        const loadPauseCounts = async () => {
            try {
                if (typeof window !== "undefined") {
                    const worker = new Worker("/workers/pause-worker.js");

                    worker.onmessage = (e) => {
                        const { type, payload } = e.data;

                        if (type === "PAUSE_COUNTS") {
                            console.log(
                                "[PAUSE] Pause counts loaded:",
                                payload
                            );
                            setPauseCount(payload.totalCount);
                            setTodayPauseCount(payload.todayCount);
                        } else if (type === "ERROR") {
                            console.error(
                                "[PAUSE] Error loading pause counts:",
                                payload
                            );
                        }

                        // Zakończ działanie workera po wykonaniu operacji
                        worker.terminate();
                    };

                    worker.postMessage({ type: "GET_PAUSE_COUNTS" });
                }
            } catch (error) {
                console.error("[PAUSE] Error loading pause counts:", error);
            }
        };

        loadPauseCounts();
    }, []);

    // Wartość kontekstu
    const value = {
        pauseCount,
        todayPauseCount,
        registerPause,
    };

    return (
        <PauseContext.Provider value={value}>{children}</PauseContext.Provider>
    );
}
